import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function MenuPage() {
  const params = new URLSearchParams(location.search)
  const branch = params.get('branchId') || 1
  const table = params.get('table') || 'T1'
  const [data, setData] = useState({ categories: [] })
  const [error, setError] = useState('')

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/menu?branchId=${branch}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
  }, [branch])

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Menu — Table {table}</h1>
      {error && <div className="text-red-500">{error}</div>}
      {data.categories.map(c => (
        <div key={c.id} className="mt-4">
          <h2 className="font-semibold">{c.name}</h2>
          <ul>
            {c.items?.map(i => (
              <li key={i.id} className="flex justify-between py-1">
                <span>{i.name}</span>
                <span>{Number(i.price).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
