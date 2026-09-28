import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle, Users, Clock } from 'lucide-react'
import { reservationsAPI } from '../../services/api'
import { useTenant } from '../../contexts/TenantContext'
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
export default function ReservationPage() {
 const tenant = useTenant()
 const [date,setDate] = useState(today)
 const [party,setParty] = useState(2)
 const [slots,setSlots] = useState([])
 const [slot,setSlot] = useState('')
 const [zone,setZone] = useState('')
 const [loading,setLoading] = useState(false)
 const [busy,setBusy] = useState(false)
 const [error,setError] = useState('')
 const [result,setResult] = useState(null)
 const [form,setForm] = useState({customerName:'',customerPhone:'',notes:''})
 useEffect(() => {
  let current = true; setSlot(''); setSlots([]); setError(''); setLoading(true)
  reservationsAPI.availability(date,party).then(({data}) => { if(current) {setSlots(data.slots);setZone(data.timeZone)} }).catch(e => {if(current) setError(e.response?.data?.error || 'Could not load times')}).finally(() => {if(current) setLoading(false)})
  return () => {current=false}
 },[date,party])
 const submit = async e => {
  e.preventDefault(); if(!slot || busy) return; setBusy(true);setError('')
  try { const {data} = await reservationsAPI.create({...form,date,partySize:party,startTime:slot});setResult(data.reservation) }
  catch(e) {setError(e.response?.data?.error || 'Could not reserve this time');setSlot('')}
  finally {setBusy(false)}
 }
 if(result) return <section className="flow-panel max-w-xl mx-auto text-center"><CheckCircle className="mx-auto h-14 w-14 text-emerald-700 mb-5"/><p className="eyebrow">REQUEST RECEIVED</p><h1 className="flow-title">A seat at our table.</h1><p className="mt-5 text-slate-600">Reservation #{result.id} for {party} guests on {new Date(result.start_time).toLocaleString([], {timeZone:zone || undefined})}. {tenant.name} will contact you to confirm.</p><button className="flow-primary mt-6" onClick={()=>{setResult(null);setSlot('')}}>Make another reservation</button></section>
 return <div className="commerce-flow grid lg:grid-cols-[1fr_1.2fr] gap-10 items-start"><section className="reservation-intro"><p className="eyebrow">YOU'RE INVITED</p><h1 className="flow-title">Good company.<br/>A table for you.</h1><p className="text-slate-600 text-lg mt-6 leading-relaxed">Plan your next visit to {tenant.name || 'our restaurant'}. Pick your party size and a time. We will take care of the table.</p><div className="space-y-5 mt-10"><p className="flex gap-3"><Users/> Parties of 1–30 guests</p><p className="flex gap-3"><Clock/> Your table is reserved for 90 minutes</p><p className="flex gap-3"><CalendarDays/> Times shown in {zone || 'the restaurant time zone'}</p></div></section>
 <form className="flow-panel" onSubmit={submit}><h2 className="text-2xl font-semibold mb-6">Reserve a table</h2><div className="grid grid-cols-2 gap-4"><div><label htmlFor="reservation-date" className="flow-label">Date</label><input id="reservation-date" type="date" className="flow-input" required min={today()} value={date} onChange={e=>setDate(e.target.value)}/></div><div><label htmlFor="reservation-guests" className="flow-label">Guests</label><select id="reservation-guests" className="flow-input" value={party} onChange={e=>setParty(Number(e.target.value))}>{Array.from({length:30},(_,i)=><option key={i+1} value={i+1}>{i+1} {i===0?'guest':'guests'}</option>)}</select></div></div>
 <fieldset className="mt-6"><legend className="flow-label">Choose a time</legend>{loading?<p role="status">Finding your table…</p>:slots.length?<div className="grid grid-cols-3 gap-2">{slots.map(t=><button type="button" className={`flow-choice ${slot===t?'is-selected':''}`} aria-pressed={slot===t} key={t} onClick={()=>setSlot(t)}>{new Date(t).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',timeZone:zone||undefined})}</button>)}</div>:<p className="rounded-xl bg-stone-50 p-4 text-slate-600">No tables available. Try another date or a smaller party.</p>}</fieldset>
 {slot && <div className="mt-6 border-t pt-6"><label htmlFor="reservation-name" className="flow-label">Your name</label><input id="reservation-name" className="flow-input" autoComplete="name" required maxLength={100} value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})}/><label htmlFor="reservation-phone" className="flow-label mt-4">Phone number</label><input id="reservation-phone" className="flow-input" autoComplete="tel" type="tel" required maxLength={30} value={form.customerPhone} onChange={e=>setForm({...form,customerPhone:e.target.value})}/><label htmlFor="reservation-notes" className="flow-label mt-4">Anything we should know? (optional)</label><textarea id="reservation-notes" className="flow-input" rows={2} maxLength={1000} placeholder="Accessibility needs, a special occasion…" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>}
 {error&&<p role="alert" className="text-red-700 mt-4">{error}</p>}<button disabled={!slot||busy||loading} className="flow-primary w-full mt-6">{busy?'Requesting your table…':'Request reservation'}</button><p className="text-xs text-center text-slate-500 mt-3">Your reservation is pending until the restaurant confirms it.</p></form></div>
}
