import React, { useEffect, useState } from 'react'

export default function AdminDashboard(){
  const [orders, setOrders] = useState([])
  useEffect(()=>{
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/orders`)
      .then(r=>r.json()).then(setOrders)
  },[])
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Admin Dashboard</h1>
      <div className="mt-4">
        <h2 className="font-semibold">Recent Orders</h2>
        <ul>
          {orders.map(o=> (
            <li key={o.id} className="py-1 flex gap-2">
              <span>#{o.id}</span>
              <span>{o.order_code}</span>
              <span>{o.status}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
