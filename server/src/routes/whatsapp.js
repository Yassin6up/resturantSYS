const express = require('express');
const { db } = require('../database/init');
const { authenticateToken, authorize, requireActiveBranch } = require('../middleware/auth');
const { logger } = require('../middleware/errorHandler');
const whatsapp = require('../services/whatsapp');

const router = express.Router();

router.use(authenticateToken, authorize('admin', 'manager'));

router.get('/status', async (req, res) => {
  const status = await whatsapp.getStatus(req.user.branch_id);
  res.json(status);
});

router.post('/connect', requireActiveBranch, async (req, res) => {
  try {
    const status = await whatsapp.connectBranch(req.user.branch_id);
    res.json(status);
  } catch (error) {
    logger.error('WhatsApp connect error:', error);
    res.status(500).json({ error: 'Failed to start WhatsApp connection' });
  }
});

router.post('/disconnect', async (req, res) => {
  try {
    await whatsapp.disconnectBranch(req.user.branch_id);
    res.json({ message: 'WhatsApp disconnected' });
  } catch (error) {
    logger.error('WhatsApp disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect WhatsApp' });
  }
});

// Create a campaign. Recipients are always the branch's own loyalty
// customers who explicitly opted into marketing - never the full customer
// list - to keep this to people who agreed to be contacted and reduce the
// spam-report risk that gets numbers banned.
router.post('/campaigns', requireActiveBranch, async (req, res) => {
  try {
    const { message, imageUrl } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const status = await whatsapp.getStatus(req.user.branch_id);
    if (status.status !== 'connected') {
      return res.status(400).json({ error: 'Connect WhatsApp before sending a campaign' });
    }

    const recipients = await db('customers')
      .where({ branch_id: req.user.branch_id, marketing_consent: true })
      .select('id', 'phone');

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No customers have opted into marketing messages yet' });
    }

    const [campaignId] = await db('whatsapp_campaigns').insert({
      branch_id: req.user.branch_id,
      message: message.trim(),
      image_path: imageUrl || null,
      status: 'sending',
      created_by: req.user.id,
      total_recipients: recipients.length
    });

    await db('whatsapp_campaign_recipients').insert(
      recipients.map(c => ({ campaign_id: campaignId, customer_id: c.id, phone: c.phone }))
    );

    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'WHATSAPP_CAMPAIGN_CREATE',
      meta: JSON.stringify({ campaignId, recipientCount: recipients.length })
    });

    logger.info(`WhatsApp campaign ${campaignId} queued for branch ${req.user.branch_id}: ${recipients.length} recipients`);

    const campaign = await db('whatsapp_campaigns').where({ id: campaignId }).first();
    res.status(201).json({ campaign });
  } catch (error) {
    logger.error('WhatsApp campaign creation error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

router.get('/campaigns', async (req, res) => {
  const campaigns = await db('whatsapp_campaigns')
    .where({ branch_id: req.user.branch_id })
    .orderBy('created_at', 'desc')
    .limit(50);
  res.json({ campaigns });
});

router.get('/campaigns/:id', async (req, res) => {
  const campaign = await db('whatsapp_campaigns')
    .where({ id: req.params.id, branch_id: req.user.branch_id })
    .first();
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  const recipients = await db('whatsapp_campaign_recipients')
    .where({ campaign_id: campaign.id })
    .orderBy('id', 'asc');

  res.json({ campaign, recipients });
});

router.post('/campaigns/:id/cancel', async (req, res) => {
  const campaign = await db('whatsapp_campaigns')
    .where({ id: req.params.id, branch_id: req.user.branch_id })
    .first();
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  if (campaign.status !== 'sending') {
    return res.status(400).json({ error: 'Only an in-progress campaign can be cancelled' });
  }

  await db('whatsapp_campaigns').where({ id: campaign.id }).update({ status: 'cancelled', completed_at: db.fn.now() });
  await db('whatsapp_campaign_recipients')
    .where({ campaign_id: campaign.id, status: 'pending' })
    .update({ status: 'failed', error: 'Campaign cancelled' });

  res.json({ message: 'Campaign cancelled' });
});

module.exports = router;
