import React, { useState } from 'react'

export default function AdminLogin() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  async function submit(e){
    e.preventDefault()
    setError('')
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/login`,{
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username,password})
    })
    if(!res.ok){ setError('Invalid'); return }
    const data = await res.json()
    localStorage.setItem('token', data.accessToken)
    location.href = '/admin/dashboard'
  }
  return (
    <div className="p-4 max-w-sm mx-auto">
      <h1 className="text-xl font-bold">Admin Login</h1>
      <form onSubmit={submit} className="mt-4 space-y-2">
        <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Username" className="border p-2 w-full"/>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="border p-2 w-full"/>
        <button className="bg-black text-white px-4 py-2">Login</button>
        {error && <div className="text-red-500">{error}</div>}
      </form>
    </div>
  )
}
