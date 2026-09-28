import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Upload, Download, ExternalLink, Palette } from 'lucide-react'
import { themesAPI } from '../../services/api'
import { useAdminBusiness } from '../../contexts/AdminBusinessContext'
import toast from 'react-hot-toast'

export default function WebsitePage() {
  const { branch, businessType } = useAdminBusiness()
  const [theme, setTheme] = useState(null)
  const [published, setPublished] = useState(null)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const website = `/?branch=${branch.id}`
  const load = async () => {
    try { const { data } = await themesAPI.current(); setTheme(data.theme); setPublished(data.publishedTheme); setError('') }
    catch { setError('Could not load your saved theme. Please try again.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [branch.id])
  const run = async (action, message) => {
    setBusy(true)
    try { await action(); await load(); toast.success(message) }
    catch (e) { toast.error(e.response?.data?.error || 'Could not save your changes') }
    finally { setBusy(false) }
  }
  const download = () => {
    const starter = { name: `${branch.name} theme`, businessType, template: 'default', version: '1.0.0', colors: { primary: '#263f32', secondary: '#eaece4', accent: '#9b6b32', background: '#faf9f6', text: '#202925' }, heroTitle: branch.name, heroSubtitle: businessType === 'restaurant' ? 'Good food. Great company.' : businessType === 'ecommerce' ? 'Discover your next favourite.' : 'Make time for what matters.' }
    const url = URL.createObjectURL(new Blob([JSON.stringify(starter, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = `${businessType}-theme.json`; a.click(); URL.revokeObjectURL(url)
  }
  const templatesTab = businessType === 'restaurant' ? 'menu_templates' : businessType === 'ecommerce' ? 'store_templates' : 'booking_templates'
  return <div className="max-w-5xl mx-auto space-y-8">
    <header className="flex flex-wrap justify-between items-start gap-4"><div><p className="text-sm font-medium text-emerald-700 mb-2">{branch.name} · {businessType}</p><h1 className="text-3xl font-semibold text-slate-900">Website & Themes</h1><p className="text-slate-500 mt-3">Your business, beautifully online. Upload a design, then publish when you’re ready.</p></div><a href={website} target="_blank" rel="noreferrer" className="btn-secondary inline-flex gap-2 items-center"><ExternalLink size={17}/> View website</a></header>
    {error && <div role="alert" className="p-4 bg-red-50 text-red-700 rounded-xl">{error} <button onClick={load} className="underline">Retry</button></div>}
    <section className="rounded-2xl border bg-white p-6 flex flex-wrap items-center justify-between gap-4"><div><span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Live website</span><h2 className="text-xl font-semibold mt-2">{published?.active ? published.name : 'Built-in design'}</h2><p className="text-sm text-slate-500 mt-1">Customers can browse your {businessType === 'restaurant' ? 'menu and reserve a table' : businessType === 'ecommerce' ? 'products and shop online' : 'services and book a time'}.</p></div><Link className="btn-secondary" to={`/admin/settings?tab=${templatesTab}`}>Browse templates</Link></section>
    <div className="grid md:grid-cols-2 gap-6">
      <section className="rounded-2xl border bg-white p-6 space-y-5"><div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center"><Upload size={21}/></div><h2 className="text-xl font-semibold">1. Upload your design</h2><p className="text-sm text-slate-500">Use a POSQ JSON theme package to set your template, colours and welcome text. Download a starter for your business below.</p><label className="block rounded-xl border-2 border-dashed p-7 text-center hover:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600 cursor-pointer"><span className="block font-medium">{file?.name || 'Choose a theme file'}</span><span className="block text-xs text-slate-500 mt-2">.json or .theme · up to 1 MB</span><input type="file" className="sr-only" accept=".json,.theme,application/json" onChange={e => setFile(e.target.files?.[0] || null)} /></label><button className="btn-primary w-full" disabled={!file || busy || loading} onClick={() => run(async () => { const form = new FormData(); form.append('theme', file); await themesAPI.upload(form); setFile(null) }, 'Design saved as a draft')}>{busy ? 'Saving…' : 'Upload and save draft'}</button><button className="text-sm text-emerald-700 flex gap-2 items-center" onClick={download}><Download size={16}/> Download starter theme</button><p className="text-xs text-slate-500">Shopify Liquid / ZIP themes are not compatible with this format.</p></section>
      <section className="rounded-2xl border bg-white p-6 space-y-5"><div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 grid place-items-center"><Palette size={21}/></div><h2 className="text-xl font-semibold">2. Publish your theme</h2>{loading ? <p>Loading saved design…</p> : theme ? <><div className="rounded-xl p-6" style={{ background: theme.colors?.background || '#f8fafc', color: theme.colors?.text || '#0f172a' }}><span className="text-xs uppercase tracking-wider">{theme.active ? 'Published' : 'Draft'} · {theme.template}</span><h3 className="text-2xl font-semibold mt-4">{theme.heroTitle || theme.name}</h3><p className="text-sm mt-2">{theme.heroSubtitle}</p><div className="flex gap-2 mt-5">{Object.entries(theme.colors || {}).map(([name, color]) => <span key={name} title={name} className="w-7 h-7 rounded-full border" style={{ background: color }}/>)}</div></div><p className="text-sm text-slate-500">{theme.name} · version {theme.version}. Publishing applies this design to your public website.</p><button className="btn-primary w-full" disabled={busy || !!theme.active} onClick={() => run(() => themesAPI.activate(true), 'Your theme is now live')}>{theme.active ? 'Published to your website' : 'Publish theme'}</button>{published?.active && <button className="btn-secondary w-full" disabled={busy} onClick={() => run(() => themesAPI.activate(false), 'Built-in design restored')}>Use built-in design</button>}<button className="text-sm text-red-600" disabled={busy} onClick={() => run(() => themesAPI.remove(), 'Uploaded theme removed')}>Remove uploaded theme</button></> : <p className="text-slate-500 py-10">Your saved design will appear here. Upload a theme to get started.</p>}</section>
    </div>
  </div>
}
