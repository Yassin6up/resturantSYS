import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

export default function OrderPage() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/orders/${orderId}`)
      .then(r => r.json()).then(setOrder)
  }, [orderId])

  if (!order) return <div className="p-4">Loading...</div>
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Order {order.order_code}</h1>
      <pre className="bg-gray-100 p-2 mt-2">{JSON.stringify(order, null, 2)}</pre>
    </div>
  )
}
