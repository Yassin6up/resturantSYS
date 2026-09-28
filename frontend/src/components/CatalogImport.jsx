import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { Upload, X, Download } from 'lucide-react'
import { menuAPI } from '../services/api'
import toast from 'react-hot-toast'

const fields = [['name', 'Name *'], ['price', 'Price *'], ['category', 'Category'], ['sku', 'SKU'], ['description', 'Description'], ['image', 'Image URL']]
const aliases = { name: ['name', 'product', 'productname', 'item', 'itemname', 'menuitem', 'nom', 'produit'], price: ['price', 'prix', 'unitprice', 'saleprice'], category: ['category', 'categories', 'categorie', 'categoryname'], sku: ['sku', 'code', 'reference'], description: ['description', 'details'], image: ['image', 'imageurl', 'photo', 'photourl'] }
const normalize = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

export default function CatalogImport({ isEcommerce, onClose, onImported }) {
  const [book, setBook] = useState(null)
  const [sheet, setSheet] = useState('')
  const [headers, setHeaders] = useState([])
  const [data, setData] = useState([])
  const [mapping, setMapping] = useState({})
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [rowErrors, setRowErrors] = useState([])
  const noun = isEcommerce ? 'products' : 'menu items'
  const clear = () => { setBook(null); setHeaders([]); setData([]); setMapping({}); setError(''); setRowErrors([]) }

  const chooseSheet = async (workbook, name) => {
    const XLSX = await import('xlsx')
    const table = workbook.Sheets[name]
    const range = XLSX.utils.decode_range(table['!ref'] || 'A1')
    if (range.e.r > 1000 || range.e.c > 99) throw new Error('Use a sheet with at most 1,000 data rows and 100 columns.')
    if (Object.entries(table).some(([key, cell]) => !key.startsWith('!') && cell.f)) throw new Error('This sheet contains formulas. Paste their calculated values into a copy, or upload a CSV export.')
    const matrix = XLSX.utils.sheet_to_json(table, { header: 1, defval: '', raw: true, blankrows: false })
    if (matrix.length < 2) throw new Error('The first row must contain column names, followed by at least one item.')
    const columns = matrix[0].map((value, index) => String(value).trim() || `Column ${index + 1}`)
    const matched = Object.fromEntries(fields.map(([key]) => [key, String(columns.findIndex(label => aliases[key].includes(normalize(label))))]))
    setSheet(name); setHeaders(columns); setData(matrix.slice(1)); setMapping(matched); setRowErrors([])
  }
  const read = async (source, type) => {
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(source, { type, raw: true, cellFormula: true })
    await chooseSheet(workbook, workbook.SheetNames[0]); setBook(workbook)
  }
  const loadFile = async file => {
    clear(); if (!file) return
    if (!/\.(xlsx|xls|csv)$/i.test(file.name) || file.size > 5 * 1024 * 1024) { setError('Choose an Excel (.xlsx / .xls) or CSV file up to 5 MB.'); return }
    setBusy(true)
    try { await read(await file.arrayBuffer(), 'array') }
    catch (e) { setError(e.message || 'Could not read this file.') }
    finally { setBusy(false) }
  }
  const loadGoogle = async () => {
    clear(); setBusy(true)
    try { const { data: response } = await menuAPI.readGoogleSheet(url); await read(response.csv, 'string') }
    catch (e) { setError(e.response?.data?.error || e.message) }
    finally { setBusy(false) }
  }
  const rows = data.map(row => Object.fromEntries(fields.map(([key]) => [key, String(row[Number(mapping[key])] ?? '').trim()])))
  const invalid = rows.reduce((count, row) => count + (!row.name || !/^\d+(?:[.,]\d{1,2})?$/.test(row.price) ? 1 : 0), 0)
  const ready = mapping.name !== '-1' && mapping.price !== '-1' && rows.length && !invalid
  const save = async () => {
    setBusy(true); setError(''); setRowErrors([])
    try {
      const { data: result } = await menuAPI.importItems(rows)
      toast.success(`${result.created} ${noun} saved · ${result.categoriesCreated} categories created · ${result.skipped} duplicates skipped`, { duration: 7000 })
      onImported()
    } catch (e) { setError(e.response?.data?.error || 'Import failed. Try again.'); setRowErrors(e.response?.data?.errors || []) }
    finally { setBusy(false) }
  }
  const download = () => {
    const content = 'Name,Price,Category,SKU,Description,Image URL\r\n' + (isEcommerce ? 'Cotton T-shirt,25.00,Clothing,TS-001,Soft cotton shirt,\r\n' : 'Margherita pizza,12.50,Pizzas,PIZ-001,Tomato and mozzarella,\r\n')
    const href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = href; a.download = `${isEcommerce ? 'products' : 'menu'}-import.csv`; a.click(); URL.revokeObjectURL(href)
  }
  return <Dialog open onClose={() => !busy && onClose()} className="relative z-50"><div className="fixed inset-0 bg-slate-900/50" aria-hidden="true"/><div className="fixed inset-0 overflow-y-auto p-4 sm:p-8"><Dialog.Panel className="mx-auto max-w-4xl rounded-2xl bg-white p-5 sm:p-8 shadow-xl">
    <div className="flex justify-between items-start gap-4"><div><Dialog.Title className="text-2xl font-semibold text-slate-900">Import {noun}</Dialog.Title><Dialog.Description className="text-slate-500 mt-2">Upload once. Match your columns. Save your catalogue in bulk.</Dialog.Description></div><button aria-label="Close import" disabled={busy} onClick={onClose}><X size={22}/></button></div>
    <div className="grid sm:grid-cols-2 gap-5 mt-6"><label className="rounded-xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center gap-3 cursor-pointer focus-within:ring-2 focus-within:ring-blue-500"><Upload size={25}/><span className="font-medium">Upload Excel or CSV</span><span className="text-xs text-slate-500">Up to 5 MB · 1,000 rows per import</span><input disabled={busy} type="file" accept=".xlsx,.xls,.csv" className="max-w-full text-sm" onChange={e => loadFile(e.target.files?.[0])}/></label><div className="border rounded-xl p-5 space-y-3"><label htmlFor="sheet-url" className="font-medium">Or import a Google Sheet</label><input id="sheet-url" className="form-input w-full" value={url} disabled={busy} onChange={e => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…"/><p className="text-xs text-slate-500">Use a link-viewable sheet. For private sheets, download Excel or CSV from Google Sheets and upload it here.</p><button className="btn-secondary" disabled={!url || busy} onClick={loadGoogle}>Load sheet</button></div></div>
    <button onClick={download} className="inline-flex items-center gap-2 text-blue-700 text-sm mt-4"><Download size={16}/> Download example CSV</button>
    <p className="text-xs text-slate-500 mt-3">Name and price are required. Prices use your business currency. Missing categories become “Uncategorized”. Existing SKU or same name within a category is skipped. Imported items are available immediately. Variants and stock quantities are not imported.</p>
    {error && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">{error}{rowErrors.length > 0 && <ul className="mt-2 max-h-40 overflow-auto">{rowErrors.map(e => <li key={e.row}>Row {e.row}: {e.error}</li>)}</ul>}</div>}
    {book && <><div className="mt-6 flex flex-wrap gap-4 justify-between items-center"><h3 className="font-semibold">Match columns · {rows.length} rows</h3><label className="text-sm">Worksheet <select className="form-select ml-2" disabled={busy} value={sheet} onChange={async e => { setData([]); setError(''); try { await chooseSheet(book, e.target.value) } catch (err) { setError(err.message) } }}>{book.SheetNames.map(name => <option key={name}>{name}</option>)}</select></label></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">{fields.map(([key, label]) => <label key={key} className="text-sm font-medium">{label}<select disabled={busy} className="form-select w-full mt-1" value={mapping[key] ?? '-1'} onChange={e => { setMapping(prev => ({ ...prev, [key]: e.target.value })); setRowErrors([]) }}><option value="-1">{['name', 'price'].includes(key) ? 'Choose column' : 'Not included'}</option>{headers.map((name, i) => <option key={i} value={String(i)}>{name}</option>)}</select></label>)}</div><div className="overflow-auto border rounded-xl mt-5 max-h-64"><table className="min-w-full text-sm text-left"><thead className="bg-slate-50"><tr>{['Name', 'Price', 'Category', 'SKU'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{rows.slice(0, 20).map((row, i) => <tr key={i} className="border-t"><td className="p-3">{row.name || '—'}</td><td className="p-3">{row.price || '—'}</td><td className="p-3">{row.category || 'Uncategorized'}</td><td className="p-3">{row.sku || '—'}</td></tr>)}</tbody></table></div><p className="text-sm text-slate-500 mt-2">Previewing the first {Math.min(20, rows.length)} rows. {invalid > 0 ? `${invalid} rows need a name or valid price. Check your column choices.` : 'All rows will be validated again before saving.'}</p></>}
    <div className="flex justify-end gap-3 mt-6"><button className="btn-secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy || !ready} onClick={save}>{busy ? 'Working…' : `Import ${rows.length || ''} ${noun}`}</button></div>
  </Dialog.Panel></div></Dialog>
}
