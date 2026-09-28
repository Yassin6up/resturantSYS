import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ordersAPI } from '../../services/api'
import { useSocket } from '../../contexts/SocketContext'
import { 
  ClockIcon, 
  CheckIcon, 
  ExclamationTriangleIcon,
  PrinterIcon,
  EyeIcon,
  FireIcon,
  UserIcon,
  TableCellsIcon,
  TruckIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

// Simple and reliable print function
const printContent = (content) => {
  return new Promise((resolve, reject) => {
    try {
      const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=no,resizable=no')
      if (!printWindow) {
        reject(new Error('Popup blocked. Please allow popups for printing.'))
        return
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Bill</title>
            <meta charset="utf-8">
            <style>
              body { 
                margin: 0 !important; 
                padding: 0 !important; 
                font-family: 'Arial', sans-serif !important;
                background: white !important;
                color: black !important;
                width: 80mm !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              * {
                box-sizing: border-box !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              @media print {
                body { 
                  margin: 0 !important; 
                  padding: 0 !important;
                  width: 80mm !important;
                }
                @page {
                  size: auto;
                  margin: 0;
                }
              }
            </style>
          </head>
          <body onload="window.print(); setTimeout(() => window.close(), 500);">
            ${content}
          </body>
        </html>
      `)

      printWindow.document.close()
      
      // Fallback in case onload doesn't work
      setTimeout(() => {
        try {
          printWindow.print()
          setTimeout(() => {
            printWindow.close()
            resolve()
          }, 1000)
        } catch (error) {
          printWindow.close()
          reject(error)
        }
      }, 1000)

    } catch (error) {
      reject(error)
    }
  })
}

// Kitchen Order Print Component (for emergency use)
const KitchenOrderPrint = React.forwardRef(({ order, urgency, currentTime }, ref) => {
  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'very-late': return '#dc2626'
      case 'late': return '#ea580c'
      case 'new': return '#16a34a'
      default: return '#2563eb'
    }
  }

  const getUrgencyText = (urgency) => {
    switch (urgency) {
      case 'very-late': return 'VERY LATE - URGENT'
      case 'late': return 'LATE - PRIORITY'
      case 'new': return 'NEW ORDER'
      default: return 'NORMAL'
    }
  }

  const calculateWaitTime = (createdAt) => {
    const created = new Date(createdAt)
    const diffMs = currentTime - created
    const diffMins = Math.floor(diffMs / 60000)
    return diffMins
  }

  const formatCurrency = (amount) => {
    return `${parseFloat(amount || 0).toFixed(2)} MAD`
  }

  return (
    <div ref={ref} style={{ display: 'none' }}>
      <div style={{ 
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        width: '80mm',
        padding: '10px',
        backgroundColor: 'white',
        color: 'black',
        margin: '0 auto'
      }}>
        <div style={{ textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '10px', marginBottom: '10px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 5px 0' }}>KITCHEN ORDER</h1>
          <div style={{ 
            display: 'inline-block', 
            padding: '5px 10px', 
            backgroundColor: getUrgencyColor(urgency),
            color: 'white',
            fontWeight: 'bold',
            fontSize: '11px'
          }}>
            {getUrgencyText(urgency)}
          </div>
        </div>

        <table style={{ width: '100%', marginBottom: '10px', fontSize: '11px' }}>
          <tbody>
            <tr>
              <td><strong>Order:</strong> #{order?.order_code || 0}</td>
              <td style={{ textAlign: 'right' }}><strong>Time:</strong> {new Date(order?.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
            </tr>
            <tr>
              <td><strong>Table:</strong> {order?.table_number || 'TAKEAWAY'}</td>
              <td style={{ textAlign: 'right' }}><strong>Wait:</strong> {calculateWaitTime(order?.created_at)}min</td>
            </tr>
            <tr>
              <td><strong>Customer:</strong> {order?.customer_name || 'WALK-IN'}</td>
              <td style={{ textAlign: 'right' }}><strong>Status:</strong> {order?.status}</td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '11px', border: '1px solid black' }}>
          <thead>
            <tr style={{ backgroundColor: 'black', color: 'white' }}>
              <th style={{ border: '1px solid black', padding: '5px', textAlign: 'left' }}>Qty</th>
              <th style={{ border: '1px solid black', padding: '5px', textAlign: 'left' }}>Item</th>
              <th style={{ border: '1px solid black', padding: '5px', textAlign: 'right' }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {order?.items?.map((item, index) => {
              const itemTotal = ((item.unit_price || 0) * (item.quantity || 1)) + 
                ((item.modifiers?.reduce((sum, mod) => sum + (mod.extra_price || 0), 0) || 0) * (item.quantity || 1))
              
              return (
                <tr key={index}>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>
                    {item.quantity}x
                  </td>
                  <td style={{ border: '1px solid black', padding: '5px' }}>
                    <div style={{ fontWeight: 'bold' }}>{item.menu_item_name || item.item_name}</div>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div style={{ fontSize: '10px', color: '#666' }}>
                        + {item.modifiers.map(mod => mod.name).join(', ')}
                      </div>
                    )}
                    {item.note && (
                      <div style={{ fontSize: '10px', color: '#0066cc', fontWeight: 'bold' }}>
                        Note: {item.note}
                      </div>
                    )}
                  </td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'right' }}>
                    {formatCurrency(itemTotal)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div style={{ borderTop: '2px solid black', paddingTop: '8px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', marginBottom: '3px' }}>
            <span>SUBTOTAL:</span>
            <span>{formatCurrency((order?.total || 0) - (order?.tax || 0) - (order?.service_charge || 0))}</span>
          </div>
          {order?.tax > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
              <span>Tax:</span>
              <span>{formatCurrency(order?.tax)}</span>
            </div>
          )}
          {order?.service_charge > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
              <span>Service:</span>
              <span>{formatCurrency(order?.service_charge)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', borderTop: '1px solid black', paddingTop: '5px', marginTop: '5px' }}>
            <span>TOTAL:</span>
            <span>{formatCurrency(order?.total)}</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', borderTop: '1px solid black', paddingTop: '8px', fontSize: '10px' }}>
          <p style={{ margin: '0 0 3px 0' }}>Printed: {new Date(currentTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
          <p style={{ margin: '0', color: '#666' }}>Kitchen Display System</p>
        </div>
      </div>
    </div>
  )
})

// Customer Bill Print Component (for emergency use)
const CustomerBillPrint = React.forwardRef(({ order, currentTime }, ref) => {
  const formatCurrency = (amount) => {
    return `${parseFloat(amount || 0).toFixed(2)} MAD`
  }

  const calculateItemTotal = (item) => {
    const baseTotal = (item.unit_price || 0) * (item.quantity || 1)
    const modifiersTotal = (item.modifiers?.reduce((sum, mod) => sum + (mod.extra_price || 0), 0) || 0) * (item.quantity || 1)
    return baseTotal + modifiersTotal
  }

  const subtotal = order?.items?.reduce((sum, item) => sum + calculateItemTotal(item), 0) || 0
  const tax = order?.tax || 0
  const serviceCharge = order?.service_charge || 0
  const total = order?.total || subtotal + tax + serviceCharge

  return (
    <div ref={ref} style={{ display: 'none' }}>
      <div style={{ 
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        width: '80mm',
        padding: '15px',
        backgroundColor: 'white',
        color: 'black',
        margin: '0 auto'
      }}>
        <div style={{ textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '10px', marginBottom: '15px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 5px 0', textTransform: 'uppercase' }}>
            RESTAURANT BILL
          </h1>
          <p style={{ fontSize: '11px', margin: '0', color: '#666' }}>
            Thank you for dining with us
          </p>
        </div>

        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f5f5f5', border: '1px solid #ddd' }}>
          <table style={{ width: '100%', fontSize: '12px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '3px 0' }}><strong>Order #:</strong></td>
                <td style={{ padding: '3px 0', textAlign: 'right' }}>{order?.order_code}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0' }}><strong>Table:</strong></td>
                <td style={{ padding: '3px 0', textAlign: 'right' }}>{order?.table_number || 'TAKEAWAY'}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0' }}><strong>Customer:</strong></td>
                <td style={{ padding: '3px 0', textAlign: 'right' }}>{order?.customer_name || 'Walk-in'}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0' }}><strong>Date:</strong></td>
                <td style={{ padding: '3px 0', textAlign: 'right' }}>
                  {new Date(order?.created_at).toLocaleDateString()}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0' }}><strong>Time:</strong></td>
                <td style={{ padding: '3px 0', textAlign: 'right' }}>
                  {new Date(order?.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h3 style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            borderBottom: '1px solid black', 
            paddingBottom: '5px', 
            marginBottom: '10px',
            margin: '0 0 10px 0'
          }}>
            ORDER DETAILS
          </h3>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <th style={{ padding: '5px 0', textAlign: 'left', width: '15%' }}>Qty</th>
                <th style={{ padding: '5px 0', textAlign: 'left', width: '55%' }}>Item</th>
                <th style={{ padding: '5px 0', textAlign: 'right', width: '30%' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {order?.items?.map((item, index) => (
                <React.Fragment key={index}>
                  <tr style={{ borderBottom: '1px dotted #ddd' }}>
                    <td style={{ padding: '8px 0', fontWeight: 'bold' }}>
                      {item.quantity}x
                    </td>
                    <td style={{ padding: '8px 0' }}>
                      <div style={{ fontWeight: '600' }}>
                        {item.menu_item_name || item.item_name || 'Item'}
                      </div>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                          + {item.modifiers.map(mod => mod.name).join(', ')}
                        </div>
                      )}
                      {item.note && (
                        <div style={{ fontSize: '10px', color: '#0066cc', marginTop: '2px', fontStyle: 'italic' }}>
                          Note: {item.note}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>
                      {formatCurrency(calculateItemTotal(item))}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ borderTop: '2px solid black', paddingTop: '10px', marginBottom: '15px' }}>
          <table style={{ width: '100%', fontSize: '13px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 0' }}>Subtotal:</td>
                <td style={{ padding: '4px 0', textAlign: 'right' }}>{formatCurrency(subtotal)}</td>
              </tr>
              {tax > 0 && (
                <tr>
                  <td style={{ padding: '4px 0' }}>Tax:</td>
                  <td style={{ padding: '4px 0', textAlign: 'right' }}>{formatCurrency(tax)}</td>
                </tr>
              )}
              {serviceCharge > 0 && (
                <tr>
                  <td style={{ padding: '4px 0' }}>Service Charge:</td>
                  <td style={{ padding: '4px 0', textAlign: 'right' }}>{formatCurrency(serviceCharge)}</td>
                </tr>
              )}
              <tr style={{ borderTop: '1px solid #ddd' }}>
                <td style={{ padding: '8px 0', fontSize: '16px', fontWeight: 'bold' }}>TOTAL:</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontSize: '16px', fontWeight: 'bold' }}>
                  {formatCurrency(total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ 
          marginBottom: '15px', 
          padding: '10px', 
          backgroundColor: '#fffbea', 
          border: '1px dashed #d4a017',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0', fontSize: '12px', fontWeight: 'bold' }}>
            ✓ ORDER READY - PLEASE SERVE
          </p>
        </div>

        <div style={{ 
          textAlign: 'center', 
          borderTop: '1px solid #ddd', 
          paddingTop: '10px', 
          fontSize: '11px',
          color: '#666'
        }}>
          <p style={{ margin: '0 0 3px 0' }}>Thank you for your visit!</p>
          <p style={{ margin: '0 0 3px 0' }}>
            Printed: {new Date(currentTime).toLocaleString()}
          </p>
          <p style={{ margin: '0', fontStyle: 'italic' }}>Kitchen Display System</p>
        </div>
      </div>
    </div>
  )
})

function KitchenDisplayPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [currentTime, setCurrentTime] = useState(new Date())
  const { socket } = useSocket()
  const [isPrinting, setIsPrinting] = useState(false)
  const newOrdersRef = useRef(new Set())

  // Refs for emergency print components
  const printRef = useRef()
  const billPrintRef = useRef()

  // Time update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  // Fixed print functions
  const handlePrintKitchenOrder = async (order) => {
    if (isPrinting) {
      toast.error('Please wait, another print is in progress')
      return
    }
    
    setIsPrinting(true)
    try {
      const urgency = getOrderUrgency(order)
      const urgencyColor = urgency === 'very-late' ? '#dc2626' : 
                          urgency === 'late' ? '#ea580c' : 
                          urgency === 'new' ? '#16a34a' : '#2563eb'
      
      const urgencyText = urgency === 'very-late' ? 'VERY LATE - URGENT' : 
                         urgency === 'late' ? 'LATE - PRIORITY' : 
                         urgency === 'new' ? 'NEW ORDER' : 'NORMAL'

      const waitTime = Math.floor((currentTime - new Date(order.created_at)) / 60000)

      const kitchenContent = `
        <div style="font-family: Arial, sans-serif; font-size: 12px; width: 80mm; padding: 10px; background: white; color: black; margin: 0 auto;">
          <div style="text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 10px;">
            <h1 style="font-size: 18px; font-weight: bold; margin: 0 0 5px 0;">KITCHEN ORDER</h1>
            <div style="display: inline-block; padding: 5px 10px; background: ${urgencyColor}; color: white; font-weight: bold; font-size: 11px;">
              ${urgencyText}
            </div>
          </div>

          <table style="width: 100%; margin-bottom: 10px; font-size: 11px;">
            <tr>
              <td><strong>Order:</strong> #${order.order_code}</td>
              <td style="text-align: right"><strong>Time:</strong> ${new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
            </tr>
            <tr>
              <td><strong>Table:</strong> ${order.table_number || 'TAKEAWAY'}</td>
              <td style="text-align: right"><strong>Wait:</strong> ${waitTime}min</td>
            </tr>
            <tr>
              <td><strong>Customer:</strong> ${order.customer_name || 'WALK-IN'}</td>
              <td style="text-align: right"><strong>Status:</strong> ${order.status}</td>
            </tr>
          </table>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px; border: 1px solid black;">
            <thead>
              <tr style="background-color: black; color: white;">
                <th style="border: 1px solid black; padding: 5px; text-align: left;">Qty</th>
                <th style="border: 1px solid black; padding: 5px; text-align: left;">Item</th>
                <th style="border: 1px solid black; padding: 5px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${order.items?.map(item => {
                const itemTotal = ((item.unit_price || 0) * (item.quantity || 1)) + 
                  ((item.modifiers?.reduce((sum, mod) => sum + (mod.extra_price || 0), 0) || 0) * (item.quantity || 1))
                
                return `
                  <tr>
                    <td style="border: 1px solid black; padding: 5px; text-align: center; font-weight: bold;">${item.quantity}x</td>
                    <td style="border: 1px solid black; padding: 5px;">
                      <div style="font-weight: bold;">${item.menu_item_name || item.item_name}</div>
                      ${item.modifiers && item.modifiers.length > 0 ? 
                        `<div style="font-size: 10px; color: #666;">+ ${item.modifiers.map(mod => mod.name).join(', ')}</div>` : ''}
                      ${item.note ? 
                        `<div style="font-size: 10px; color: #0066cc; font-weight: bold;">Note: ${item.note}</div>` : ''}
                    </td>
                    <td style="border: 1px solid black; padding: 5px; text-align: right;">${itemTotal.toFixed(2)} MAD</td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>

          <div style="border-top: 2px solid black; padding-top: 8px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-bottom: 3px;">
              <span>SUBTOTAL:</span>
              <span>${((order.total || 0) - (order.tax || 0) - (order.service_charge || 0)).toFixed(2)} MAD</span>
            </div>
            ${order.tax > 0 ? `
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                <span>Tax:</span>
                <span>${(order.tax || 0).toFixed(2)} MAD</span>
              </div>
            ` : ''}
            ${order.service_charge > 0 ? `
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                <span>Service:</span>
                <span>${(order.service_charge || 0).toFixed(2)} MAD</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; border-top: 1px solid black; padding-top: 5px; margin-top: 5px;">
              <span>TOTAL:</span>
              <span>${(order.total || 0).toFixed(2)} MAD</span>
            </div>
          </div>

          <div style="text-align: center; border-top: 1px solid black; padding-top: 8px; font-size: 10px;">
            <p style="margin: 0 0 3px 0;">Printed: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
            <p style="margin: 0; color: #666;">Kitchen Display System</p>
          </div>
        </div>
      `
      
      await printContent(kitchenContent)
      toast.success('Kitchen order printed successfully')
    } catch (error) {
      console.error('Kitchen print error:', error)
      toast.error('Failed to print kitchen order: ' + error.message)
    } finally {
      setIsPrinting(false)
    }
  }

  const handlePrintCustomerBill = async (order) => {
    if (isPrinting) {
      toast.error('Please wait, another print is in progress')
      return
    }

    console.log('Printing customer bill for order:', order)
    
    setIsPrinting(true)
    try {
      const calculateItemTotal = (item) => {
        const baseTotal = (item.unit_price || 0) * (item.quantity || 1)
        const modifiersTotal = (item.modifiers?.reduce((sum, mod) => sum + (mod.extra_price || 0), 0) || 0) * (item.quantity || 1)
        return baseTotal + modifiersTotal
      }

      const subtotal = order.items?.reduce((sum, item) => sum + calculateItemTotal(item), 0) || 0
      const tax = order.tax || 0
      const serviceCharge = order.service_charge || 0
      const total = order.total || subtotal + tax + serviceCharge

      const billContent = `
        <div style="font-family: Arial, sans-serif; font-size: 13px; width: 80mm; padding: 15px; background: white; color: black; margin: 0 auto;">
          <div style="text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 15px;">
            <h1 style="font-size: 20px; font-weight: bold; margin: 0 0 5px 0; text-transform: uppercase;">RESTAURANT BILL</h1>
            <p style="font-size: 11px; margin: 0; color: #666;">Thank you for dining with us</p>
          </div>

          <div style="margin-bottom: 15px; padding: 10px; background-color: #f5f5f5; border: 1px solid #ddd;">
            <table style="width: 100%; font-size: 12px;">
              <tr>
                <td style="padding: 3px 0;"><strong>Order #:</strong></td>
                <td style="padding: 3px 0; text-align: right">${order.order_code}</td>
              </tr>
              <tr>
                <td style="padding: 3px 0;"><strong>Table:</strong></td>
                <td style="padding: 3px 0; text-align: right">${order.table_number || 'TAKEAWAY'}</td>
              </tr>
              <tr>
                <td style="padding: 3px 0;"><strong>Customer:</strong></td>
                <td style="padding: 3px 0; text-align: right">${order.customer_name || 'Walk-in'}</td>
              </tr>
              <tr>
                <td style="padding: 3px 0;"><strong>Date:</strong></td>
                <td style="padding: 3px 0; text-align: right">${new Date(order.created_at).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style="padding: 3px 0;"><strong>Time:</strong></td>
                <td style="padding: 3px 0; text-align: right">${new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
              </tr>
            </table>
          </div>

          <div style="margin-bottom: 15px;">
            <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid black; padding-bottom: 5px; margin-bottom: 10px; margin: 0 0 10px 0;">ORDER DETAILS</h3>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead>
                <tr style="border-bottom: 1px solid #ddd;">
                  <th style="padding: 5px 0; text-align: left; width: 15%;">Qty</th>
                  <th style="padding: 5px 0; text-align: left; width: 55%;">Item</th>
                  <th style="padding: 5px 0; text-align: right; width: 30%;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${order.items?.map(item => {
                  const itemTotal = calculateItemTotal(item)
                  return `
                    <tr style="border-bottom: 1px dotted #ddd;">
                      <td style="padding: 8px 0; font-weight: bold;">${item.quantity}x</td>
                      <td style="padding: 8px 0;">
                        <div style="font-weight: 600;">${item.menu_item_name || item.item_name || 'Item'}</div>
                        ${item.modifiers && item.modifiers.length > 0 ? 
                          `<div style="font-size: 10px; color: #666; margin-top: 2px;">+ ${item.modifiers.map(mod => mod.name).join(', ')}</div>` : ''}
                        ${item.note ? 
                          `<div style="font-size: 10px; color: #0066cc; margin-top: 2px; font-style: italic;">Note: ${item.note}</div>` : ''}
                      </td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600;">${itemTotal.toFixed(2)} MAD</td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
          </div>

          <div style="border-top: 2px solid black; padding-top: 10px; margin-bottom: 15px;">
            <table style="width: 100%; font-size: 13px;">
              <tr>
                <td style="padding: 4px 0;">Subtotal:</td>
                <td style="padding: 4px 0; text-align: right;">${subtotal.toFixed(2)} MAD</td>
              </tr>
              ${tax > 0 ? `
                <tr>
                  <td style="padding: 4px 0;">Tax:</td>
                  <td style="padding: 4px 0; text-align: right;">${tax.toFixed(2)} MAD</td>
                </tr>
              ` : ''}
              ${serviceCharge > 0 ? `
                <tr>
                  <td style="padding: 4px 0;">Service Charge:</td>
                  <td style="padding: 4px 0; text-align: right;">${serviceCharge.toFixed(2)} MAD</td>
                </tr>
              ` : ''}
              <tr style="border-top: 1px solid #ddd;">
                <td style="padding: 8px 0; font-size: 16px; font-weight: bold;">TOTAL:</td>
                <td style="padding: 8px 0; text-align: right; font-size: 16px; font-weight: bold;">${total.toFixed(2)} MAD</td>
              </tr>
            </table>
          </div>

          <div style="margin-bottom: 15px; padding: 10px; background-color: #fffbea; border: 1px dashed #d4a017; text-align: center;">
            <p style="margin: 0; font-size: 12px; font-weight: bold;">✓ ORDER READY - PLEASE SERVE</p>
          </div>

          <div style="text-align: center; border-top: 1px solid #ddd; padding-top: 10px; font-size: 11px; color: #666">
            <p style="margin: 0 0 3px 0;">Thank you for your visit!</p>
            <p style="margin: 0 0 3px 0;">Printed: ${new Date().toLocaleString()}</p>
            <p style="margin: 0; font-style: italic;">Kitchen Display System</p>
          </div>
        </div>
      `

      await printContent(billContent)
      console.log('Customer bill printed successfully')
      toast.success('Customer bill printed successfully')
      
    } catch (error) {
      console.error('Bill print error:', error)
      toast.error('Failed to print customer bill: ' + error.message)
    } finally {
      setIsPrinting(false)
    }
  }

  // Load orders
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true)
      const response = await ordersAPI.getOrders({ 
        branchId: 1,
        status: ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED']
      })
      if (response.data.success) {
        setOrders(response.data.orders)
      }
    } catch (error) {
      console.error('Orders load error:', error)
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // Socket handlers
  const handleOrderCreated = useCallback((order) => {
    setOrders(prev => {
      const existingOrderIndex = prev.findIndex(o => o.id === order.id)
      if (existingOrderIndex !== -1) {
        const updated = [...prev]
        updated[existingOrderIndex] = order
        return updated
      } else {
        newOrdersRef.current.add(order.id)
        setTimeout(() => {
          newOrdersRef.current.delete(order.id)
        }, 5000)
        playNotificationSound()
        return [order, ...prev]
      }
    })
  }, [])

  const handleOrderUpdated = useCallback((updatedOrder) => {
    setOrders(prev => prev.map(order => 
      order.id === updatedOrder.id ? { ...updatedOrder, updated_at: new Date().toISOString() } : order
    ))
  }, [])

  const handleOrderConfirmed = useCallback((order) => {
    handleOrderCreated(order)
  }, [handleOrderCreated])

  const handleOrderStatusUpdated = useCallback(({ orderId, status }) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status, updated_at: new Date().toISOString() } : order
    ))
  }, [])

  // Socket setup
  useEffect(() => {
    if (socket) {
      socket.emit('join-kitchen', 1)

      const handlers = {
        'order.created': handleOrderCreated,
        'order.paid': handleOrderCreated,
        'order.updated': handleOrderUpdated,
        'order.confirmed': handleOrderConfirmed,
        'order.status.updated': handleOrderStatusUpdated
      }

      Object.entries(handlers).forEach(([event, handler]) => {
        socket.on(event, handler)
      })

      return () => {
        socket.emit('leave-kitchen')
        Object.entries(handlers).forEach(([event, handler]) => {
          socket.off(event, handler)
        })
      }
    }
  }, [socket, handleOrderCreated, handleOrderUpdated, handleOrderConfirmed, handleOrderStatusUpdated])

  // Notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==')
      audio.play().catch(() => {})
      
      toast.success('🔔 New Order Received!', {
        duration: 3000,
        style: {
          background: '#10B981',
          color: '#fff',
          fontSize: '16px',
          fontWeight: 'bold'
        }
      })
    } catch (error) {
      console.error('Error playing sound:', error)
      toast.success('🔔 New Order Received!')
    }
  }, [])

  // Order actions
  const acknowledgeOrder = useCallback(async (orderId) => {
    try {
      await ordersAPI.updateOrderStatus(orderId, 'PREPARING')
      toast.success('Order acknowledged and cooking started')
    } catch (error) {
      console.error('Acknowledge error:', error)
      toast.error('Failed to acknowledge order')
    }
  }, [])

  const markOrderReady = useCallback(async (orderId) => {
    try {
      const order = orders.find(o => o.id === orderId)
      await ordersAPI.updateOrderStatus(orderId, 'COMPLETED')
      toast.success('Order marked as completed')
      
      if (order) {
        setTimeout(() => {
          handlePrintCustomerBill(order)
        }, 1000)
      }
    } catch (error) {
      console.error('Mark completed error:', error)
      toast.error('Failed to mark order as completed')
    }
  }, [orders])

  // Utility functions
  const getOrderUrgency = useCallback((order) => {
    const created = new Date(order.created_at)
    const diffMs = currentTime - created
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins > 30) return 'very-late'
    if (diffMins > 15) return 'late'
    if (diffMins <= 5) return 'new'
    return 'normal'
  }, [currentTime])

  const getUrgencyColor = useCallback((urgency) => {
    switch (urgency) {
      case 'very-late': return 'border-l-red-500 bg-red-50 hover:bg-red-100'
      case 'late': return 'border-l-orange-500 bg-orange-50 hover:bg-orange-100'
      case 'new': return 'border-l-green-500 bg-green-50 hover:bg-green-100'
      default: return 'border-l-blue-500 bg-blue-50 hover:bg-blue-100'
    }
  }, [])

  const getUrgencyBadge = useCallback((urgency) => {
    switch (urgency) {
      case 'very-late': return 'bg-red-100 text-red-800 border-red-200'
      case 'late': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'new': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }, [])

  const getUrgencyIcon = useCallback((urgency) => {
    switch (urgency) {
      case 'very-late': return <FireIcon className="h-5 w-5 text-red-600" />
      case 'late': return <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
      case 'new': return <ClockIcon className="h-5 w-5 text-green-600" />
      default: return <ClockIcon className="h-5 w-5 text-blue-600" />
    }
  }, [])

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'PREPARING': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'READY': return 'bg-green-100 text-green-800 border-green-200'
      case 'COMPLETED': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }, [])

  const getTimeElapsed = useCallback((createdAt) => {
    const created = new Date(createdAt)
    const diffMs = currentTime - created
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    return `${diffHours}h ${diffMins % 60}m ago`
  }, [currentTime])

  // Filtered and sorted orders
  const { filteredOrders, stats } = useMemo(() => {
    const filtered = orders.filter(order => {
      if (filter === 'all') return order.status !== 'COMPLETED'
      return order.status === filter
    })

    const sorted = [...filtered].sort((a, b) => {
      const aIsNew = newOrdersRef.current.has(a.id)
      const bIsNew = newOrdersRef.current.has(b.id)
      
      if (aIsNew && !bIsNew) return -1
      if (!aIsNew && bIsNew) return 1
      
      const urgencyA = getOrderUrgency(a)
      const urgencyB = getOrderUrgency(b)
      
      const urgencyOrder = { 'very-late': 0, 'late': 1, 'new': 2, 'normal': 3 }
      
      if (urgencyOrder[urgencyA] !== urgencyOrder[urgencyB]) {
        return urgencyOrder[urgencyA] - urgencyOrder[urgencyB]
      }
      
      return new Date(a.created_at) - new Date(b.created_at)
    })

    const stats = {
      total: orders.filter(o => o.status !== 'COMPLETED').length,
      confirmed: orders.filter(o => o.status === 'CONFIRMED').length,
      preparing: orders.filter(o => o.status === 'PREPARING').length,
      ready: orders.filter(o => o.status === 'READY').length,
      completed: orders.filter(o => o.status === 'COMPLETED').length,
      veryLate: orders.filter(o => getOrderUrgency(o) === 'very-late').length,
      late: orders.filter(o => getOrderUrgency(o) === 'late').length,
      new: orders.filter(o => getOrderUrgency(o) === 'new').length,
      normal: orders.filter(o => getOrderUrgency(o) === 'normal').length,
    }

    return { filteredOrders: sorted, stats }
  }, [orders, filter, getOrderUrgency])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading kitchen orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      {/* Hidden print components for emergency use */}
      <div style={{ display: 'none' }}>
        <KitchenOrderPrint ref={printRef} />
        <CustomerBillPrint ref={billPrintRef} />
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            Kitchen Display
          </h1>
          <p className="text-gray-600 mt-2">
            Real-time order management • {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
          </p>
        </div>
        
        {/* Status Filter */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All Active', count: stats.total },
            { key: 'CONFIRMED', label: 'Confirmed', count: stats.confirmed },
            { key: 'PREPARING', label: 'Preparing', count: stats.preparing },
            { key: 'READY', label: 'Ready', count: stats.ready },
            { key: 'COMPLETED', label: 'Completed', count: stats.completed }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                filter === key
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Urgency Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { count: stats.new, label: 'New (0-5min)', color: 'green', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
          { count: stats.normal, label: 'Normal (6-15min)', color: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
          { count: stats.late, label: 'Late (16-30min)', color: 'orange', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
          { count: stats.veryLate, label: 'Very Late (30+ min)', color: 'red', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' }
        ].map((stat, index) => (
          <div key={index} className={`card text-center ${stat.bg} ${stat.border}`}>
            <div className="card-body p-4">
              <div className={`text-2xl font-bold ${stat.text}`}>{stat.count}</div>
              <div className={`text-sm ${stat.text.replace('600', '700')}`}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredOrders.map((order) => {
          const urgency = getOrderUrgency(order)
          const isNewOrder = newOrdersRef.current.has(order.id)
          
          return (
            <div
              key={order.id}
              className={`card border-l-4 ${getUrgencyColor(urgency)} hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] ${
                isNewOrder ? 'animate-pulse ring-2 ring-green-400' : ''
              }`}
            >
              <div className="card-body">
                {/* Order Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getUrgencyIcon(urgency)}
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.order_code}
                        {isNewOrder && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-bounce">
                            NEW
                          </span>
                        )}
                      </h3>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <TableCellsIcon className="h-4 w-4" />
                        <span>{order.table_number ? `Table ${order.table_number}` : 'Takeaway'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <UserIcon className="h-4 w-4" />
                        <span>{order.customer_name || 'Walk-in Customer'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right space-y-2">
                    <span className={`badge ${getStatusColor(order.status)} text-sm px-3 py-1`}>
                      {order.status}
                    </span>
                    <div>
                      <span className={`badge ${getUrgencyBadge(urgency)} text-xs px-2 py-1`}>
                        {urgency === 'very-late' ? 'URGENT' : 
                         urgency === 'late' ? 'PRIORITY' : 
                         urgency === 'new' ? 'NEW' : 'NORMAL'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {getTimeElapsed(order.created_at)}
                    </p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-3 mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Items to Prepare:
                  </h4>
                  {order.items?.map((item, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                      {/* Item Image */}
                      <div className="flex-shrink-0">
                        <img
                          src={item.menu_item?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&h=80&fit=crop'}
                          alt={item.item_name || 'Food item'}
                          className="w-16 h-16 rounded-lg object-cover border border-gray-300"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&h=80&fit=crop'
                          }}
                        />
                      </div>
                      
                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-lg font-bold text-blue-600">
                            {item.quantity}x
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {item.item_name || 'Unknown Item'}
                          </span>
                        </div>
                        
                        {item.modifiers && item.modifiers.length > 0 && (
                          <div className="text-xs text-gray-600 mb-1">
                            <span className="text-blue-600 font-medium">Modifiers:</span> {item.modifiers.map(mod => mod.name).join(', ')}
                          </div>
                        )}
                        
                        {item.note && (
                          <div className="text-xs text-blue-700 font-medium bg-blue-50 px-2 py-1 rounded border border-blue-200">
                            📝 Note: {item.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Actions */}
                <div className="flex space-x-3">
                  {order.status === 'CONFIRMED' && (
                    <button
                      onClick={() => acknowledgeOrder(order.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg text-sm font-semibold transition-colors duration-200 flex items-center justify-center"
                    >
                      <CheckIcon className="h-5 w-5 mr-2" />
                      Start Cooking
                    </button>
                  )}
                  
                  {order.status === 'PREPARING' && (
                    <button
                      onClick={() => markOrderReady(order.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg text-sm font-semibold transition-colors duration-200 flex items-center justify-center"
                    >
                      <CheckIcon className="h-5 w-5 mr-2" />
                      Mark Ready
                    </button>
                  )}
                  
                  {order.status === 'READY' && (
                    <div className="flex-1 text-center py-3">
                      <span className="text-sm font-medium text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                        Ready for Service
                      </span>
                    </div>
                  )}
                  
                  {order.status === 'COMPLETED' && (
                    <div className="flex-1 text-center py-3">
                      <span className="text-sm font-medium text-purple-600 bg-purple-50 px-4 py-2 rounded-lg">
                        Completed
                      </span>
                    </div>
                  )}
                  
                  {/* <button
                    onClick={() => handlePrintKitchenOrder(order)}
                    disabled={isPrinting}
                    className="bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg text-sm font-semibold transition-colors duration-200 flex items-center justify-center min-w-[70px] disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Print Kitchen Ticket"
                  >
                    ☕
                  </button> */}
                  
                  <button
                    onClick={() => handlePrintCustomerBill(order)}
                    disabled={isPrinting}
                    className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg text-sm font-semibold transition-colors duration-200 flex items-center justify-center min-w-[70px] disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Print Customer Bill"
                  >
                    <PrinterIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Order Total */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 font-medium">Total Amount:</span>
                    <span className="text-lg font-bold text-blue-600">
                      {order.total?.toFixed(2)} MAD
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClockIcon className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            {filter === 'all' 
              ? 'No active orders in the kitchen at the moment. New orders will appear here automatically.'
              : `No ${filter.toLowerCase()} orders at the moment.`
            }
          </p>
        </div>
      )}

      {/* Kitchen Status Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[
          { count: stats.confirmed, label: 'Confirmed', color: 'blue', text: 'text-blue-600' },
          { count: stats.preparing, label: 'Preparing', color: 'orange', text: 'text-orange-600' },
          { count: stats.ready, label: 'Ready', color: 'green', text: 'text-green-600' },
          { count: stats.completed, label: 'Completed', color: 'purple', text: 'text-purple-600' },
          { count: stats.total, label: 'Total Active', color: 'gray', text: 'text-gray-600' }
        ].map((stat, index) => (
          <div key={index} className="card text-center hover:shadow-lg transition-shadow">
            <div className="card-body p-4">
              <div className={`text-2xl font-bold ${stat.text}`}>{stat.count}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default KitchenDisplayPage