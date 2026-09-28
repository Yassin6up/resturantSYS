import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { whatsappAPI, uploadAPI } from '../../services/api'

function ConnectionPanel({ status, onStatusChange }) {
  const [connecting, setConnecting] = useState(false)
  const pollRef = useRef(null)

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = null
  }

  useEffect(() => () => stopPolling(), [])

  const startConnect = async () => {
    setConnecting(true)
    try {
      await whatsappAPI.connect()
      pollRef.current = setInterval(async () => {
        const { data } = await whatsappAPI.getStatus()
        onStatusChange(data)
        if (data.status === 'connected') {
          stopPolling()
          setConnecting(false)
          toast.success('WhatsApp connected!')
        }
      }, 2000)
    } catch (err) {
      setConnecting(false)
      toast.error(err.response?.data?.error || 'Could not start WhatsApp connection')
    }
  }

  const disconnect = async () => {
    if (!window.confirm('Disconnect WhatsApp? You will need to scan a new QR code to reconnect.')) return
    try {
      await whatsappAPI.disconnect()
      onStatusChange({ status: 'disconnected', qr: null })
      toast.success('WhatsApp disconnected')
    } catch {
      toast.error('Failed to disconnect')
    }
  }

  if (status.status === 'connected') {
    return (
      <div className="bg-white rounded-xl shadow p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
          <div>
            <p className="font-semibold text-gray-900">Connected</p>
            <p className="text-sm text-gray-500">{status.connectedNumber}</p>
          </div>
        </div>
        <button onClick={disconnect} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100">
          Disconnect
        </button>
      </div>
    )
  }

  if (status.status === 'reconnecting') {
    return (
      <div className="bg-white rounded-xl shadow p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent mx-auto mb-3" />
        <p className="text-gray-500">Reconnecting to WhatsApp ({status.connectedNumber})...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 text-center">
      {status.qr ? (
        <>
          <p className="font-medium text-gray-900 mb-3">Scan with WhatsApp on your phone</p>
          <img src={status.qr} alt="WhatsApp QR code" className="mx-auto w-56 h-56 rounded-lg border" />
          <p className="text-xs text-gray-400 mt-3">WhatsApp → Settings → Linked Devices → Link a Device</p>
        </>
      ) : (
        <>
          <p className="text-gray-500 mb-4">Connect your business's WhatsApp to send marketing messages to opted-in customers.</p>
          <button
            onClick={startConnect}
            disabled={connecting}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {connecting ? 'Generating QR code...' : 'Connect WhatsApp'}
          </button>
        </>
      )}
    </div>
  )
}

function CampaignComposer({ connected, onCreated }) {
  const [message, setMessage] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const { data } = await uploadAPI.uploadImage(formData)
      setImageUrl(data.imageUrl)
    } catch {
      toast.error('Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!message.trim()) return toast.error('Write a message first')
    setSending(true)
    try {
      const { data } = await whatsappAPI.createCampaign({ message, imageUrl: imageUrl || undefined })
      toast.success(`Campaign queued for ${data.campaign.total_recipients} customers`)
      setMessage('')
      setImageUrl('')
      onCreated()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not create campaign')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="font-semibold text-gray-900 mb-1">New campaign</h3>
      <p className="text-sm text-gray-500 mb-4">
        Sends to customers who opted into marketing only, one message every 60 seconds.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="e.g. This weekend only: 20% off all pizzas! 🍕"
          rows={4}
          disabled={!connected}
          className="w-full px-3 py-2 border rounded-lg resize-none disabled:bg-gray-50"
        />
        <div className="flex items-center gap-3">
          <label className={`px-3 py-2 border rounded-lg text-sm cursor-pointer ${!connected ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-50'}`}>
            {uploading ? 'Uploading...' : imageUrl ? 'Change image' : '+ Add image (optional)'}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={!connected} />
          </label>
          {imageUrl && <img src={imageUrl} alt="preview" className="w-12 h-12 rounded object-cover" />}
        </div>
        <button
          type="submit"
          disabled={!connected || sending || uploading}
          className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {!connected ? 'Connect WhatsApp first' : sending ? 'Queuing...' : 'Send campaign'}
        </button>
      </form>
    </div>
  )
}

function CampaignHistory({ campaigns, onCancel }) {
  const statusColor = {
    sending: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-gray-100 text-gray-600',
    failed: 'bg-red-100 text-red-700'
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Campaign history</h3>
      <div className="space-y-3">
        {campaigns.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No campaigns sent yet</p>}
        {campaigns.map(c => {
          const progress = c.total_recipients ? Math.round(((c.sent_count + c.failed_count) / c.total_recipients) * 100) : 0
          return (
            <div key={c.id} className="border rounded-lg p-3">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm text-gray-800 line-clamp-2 flex-1">{c.message}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-2 whitespace-nowrap ${statusColor[c.status] || 'bg-gray-100 text-gray-600'}`}>
                  {c.status}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{c.sent_count} sent · {c.failed_count} failed · {c.total_recipients} total</span>
                {c.status === 'sending' && (
                  <button onClick={() => onCancel(c.id)} className="text-red-500 hover:text-red-700 font-medium">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function WhatsAppMarketingPage() {
  const [status, setStatus] = useState({ status: 'disconnected', qr: null })
  const [campaigns, setCampaigns] = useState([])

  const loadStatus = () => whatsappAPI.getStatus().then(r => setStatus(r.data)).catch(() => {})
  const loadCampaigns = () => whatsappAPI.getCampaigns().then(r => setCampaigns(r.data.campaigns)).catch(() => {})

  useEffect(() => {
    loadStatus()
    loadCampaigns()
    const interval = setInterval(loadCampaigns, 15000)
    return () => clearInterval(interval)
  }, [])

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this campaign? Remaining customers will not be messaged.')) return
    await whatsappAPI.cancelCampaign(id)
    loadCampaigns()
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp Marketing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connect your business's WhatsApp and send a promotion to customers who opted in. Uses your real
          WhatsApp number, not the official Business API - keep messages occasional to avoid getting flagged.
        </p>
      </div>

      <ConnectionPanel status={status} onStatusChange={setStatus} />
      <CampaignComposer connected={status.status === 'connected'} onCreated={loadCampaigns} />
      <CampaignHistory campaigns={campaigns} onCancel={handleCancel} />
    </div>
  )
}
