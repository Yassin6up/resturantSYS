const path = require('path');
const fs = require('fs');
const axios = require('axios');
const QRCode = require('qrcode');
const pino = require('pino');
const { db } = require('../database/init');
const { logger } = require('../middleware/errorHandler');

// One WhatsApp Web session per restaurant, kept in-memory for this process.
// Each restaurant links its OWN phone number by scanning a QR code - this is
// NOT the official WhatsApp Business API, it drives a real WhatsApp Web
// session programmatically. That means: no Meta approval needed, but it is
// against WhatsApp's own terms of service for bulk/automated messaging and
// the connected number can be banned, especially for anything resembling a
// marketing blast. The 60s spacing here reduces (does not eliminate) that risk.
const sessions = new Map(); // branchId -> { sock, status, qr }
const SESSIONS_DIR = path.join(__dirname, '../../data/whatsapp_sessions');
const SEND_INTERVAL_MS = 60 * 1000;

function authDirFor(branchId) {
  return path.join(SESSIONS_DIR, String(branchId));
}

function toJid(phone) {
  const digits = String(phone).replace(/[^0-9]/g, '');
  return `${digits}@s.whatsapp.net`;
}

async function upsertSession(branchId, fields) {
  const existing = await db('whatsapp_sessions').where({ branch_id: branchId }).first();
  if (existing) {
    await db('whatsapp_sessions').where({ branch_id: branchId }).update({ ...fields, updated_at: db.fn.now() });
  } else {
    await db('whatsapp_sessions').insert({ branch_id: branchId, ...fields });
  }
}

async function getStatus(branchId) {
  const inMemory = sessions.get(branchId);
  const row = await db('whatsapp_sessions').where({ branch_id: branchId }).first();
  // Only an actual in-memory session counts as "connected" - a DB row saying
  // connected with no live session (e.g. right after a server restart, before
  // resumeConnectedSessions finishes) must NOT report connected, or campaign
  // creation would succeed against a socket that isn't really there and the
  // campaign would stall forever with nothing sending.
  let status;
  if (inMemory) {
    status = inMemory.status;
  } else if (row?.status === 'connected') {
    status = 'reconnecting';
  } else {
    status = row?.status || 'disconnected';
  }
  return {
    status,
    qr: inMemory?.qr || null,
    connectedNumber: row?.connected_number || null,
    connectedAt: row?.connected_at || null
  };
}

async function connectBranch(branchId) {
  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = await import('@whiskeysockets/baileys');
  const existing = sessions.get(branchId);
  if (existing && (existing.status === 'connected' || existing.status === 'qr_pending')) {
    return getStatus(branchId);
  }

  fs.mkdirSync(authDirFor(branchId), { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(authDirFor(branchId));
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    syncFullHistory: false
  });

  const entry = { sock, status: 'qr_pending', qr: null };
  sessions.set(branchId, entry);
  await upsertSession(branchId, { status: 'qr_pending' });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      entry.qr = await QRCode.toDataURL(qr);
      entry.status = 'qr_pending';
      await upsertSession(branchId, { status: 'qr_pending' });
    }

    if (connection === 'open') {
      const number = sock.user?.id ? sock.user.id.split(':')[0].split('@')[0] : null;
      entry.status = 'connected';
      entry.qr = null;
      await upsertSession(branchId, {
        status: 'connected',
        connected_number: number,
        connected_at: db.fn.now()
      });
      logger.info(`WhatsApp connected for branch ${branchId}: ${number}`);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      sessions.delete(branchId);
      await upsertSession(branchId, { status: 'disconnected' });

      if (loggedOut) {
        fs.rmSync(authDirFor(branchId), { recursive: true, force: true });
        logger.info(`WhatsApp session for branch ${branchId} logged out; auth cleared`);
      } else {
        logger.warn(`WhatsApp connection lost for branch ${branchId}, retrying...`);
        setTimeout(() => connectBranch(branchId).catch(err =>
          logger.error(`WhatsApp reconnect failed for branch ${branchId}:`, err)
        ), 3000);
      }
    }
  });

  return getStatus(branchId);
}

async function disconnectBranch(branchId) {
  const entry = sessions.get(branchId);
  if (entry?.sock) {
    try { await entry.sock.logout(); } catch (e) { /* already gone */ }
  }
  sessions.delete(branchId);
  fs.rmSync(authDirFor(branchId), { recursive: true, force: true });
  await upsertSession(branchId, { status: 'disconnected', connected_number: null, connected_at: null });
}

async function resolveImageBuffer(imageUrl) {
  const resp = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  return Buffer.from(resp.data);
}

async function sendCampaignMessage(branchId, phone, message, imageUrl) {
  const entry = sessions.get(branchId);
  if (!entry || entry.status !== 'connected') {
    throw new Error('WhatsApp is not connected for this restaurant');
  }
  const jid = toJid(phone);
  if (imageUrl) {
    const buffer = await resolveImageBuffer(imageUrl);
    await entry.sock.sendMessage(jid, { image: buffer, caption: message });
  } else {
    await entry.sock.sendMessage(jid, { text: message });
  }
}

// Ticks every 10s; actual pacing between sends is enforced per-branch via
// last_sent_at, so this can tick often without violating the 60s spacing.
async function processQueueTick() {
  const activeSessions = await db('whatsapp_sessions').where({ status: 'connected' });

  for (const session of activeSessions) {
    const branchId = session.branch_id;
    const entry = sessions.get(branchId);
    if (!entry || entry.status !== 'connected') continue;

    const lastSent = session.last_sent_at ? new Date(session.last_sent_at).getTime() : 0;
    if (Date.now() - lastSent < SEND_INTERVAL_MS) continue;

    const campaign = await db('whatsapp_campaigns')
      .where({ branch_id: branchId, status: 'sending' })
      .orderBy('created_at', 'asc')
      .first();
    if (!campaign) continue;

    const recipient = await db('whatsapp_campaign_recipients')
      .where({ campaign_id: campaign.id, status: 'pending' })
      .orderBy('id', 'asc')
      .first();

    if (!recipient) {
      await db('whatsapp_campaigns').where({ id: campaign.id }).update({
        status: 'completed',
        completed_at: db.fn.now()
      });
      continue;
    }

    try {
      await sendCampaignMessage(branchId, recipient.phone, campaign.message, campaign.image_path);
      await db('whatsapp_campaign_recipients').where({ id: recipient.id }).update({
        status: 'sent',
        sent_at: db.fn.now()
      });
      await db('whatsapp_campaigns').where({ id: campaign.id }).increment('sent_count', 1);
    } catch (err) {
      logger.error(`WhatsApp send failed (branch ${branchId}, recipient ${recipient.id}):`, err);
      await db('whatsapp_campaign_recipients').where({ id: recipient.id }).update({
        status: 'failed',
        error: err.message?.slice(0, 250)
      });
      await db('whatsapp_campaigns').where({ id: campaign.id }).increment('failed_count', 1);
    }

    await upsertSession(branchId, { last_sent_at: db.fn.now() });
  }
}

function startQueueWorker() {
  setInterval(() => {
    processQueueTick().catch(err => logger.error('WhatsApp queue tick error:', err));
  }, 10 * 1000);
}

// Resume any restaurant whose session was still marked connected before a
// server restart (Baileys creds are on disk, so this reconnects silently
// without a new QR scan).
async function resumeConnectedSessions() {
  const rows = await db('whatsapp_sessions').where({ status: 'connected' });
  for (const row of rows) {
    connectBranch(row.branch_id).catch(err =>
      logger.error(`Failed to resume WhatsApp session for branch ${row.branch_id}:`, err)
    );
  }
}

module.exports = {
  connectBranch,
  disconnectBranch,
  getStatus,
  startQueueWorker,
  resumeConnectedSessions
};
