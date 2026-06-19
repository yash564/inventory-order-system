import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ordersApi } from '../api/resources'
import { extractError } from '../api/client'
import { ErrorState, Spinner } from '../components/States.jsx'

export default function OrderDetail() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    setError('')
    ordersApi
      .get(id)
      .then(setOrder)
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [id])

  if (loading) return <Spinner />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!order) return null

  return (
    <div>
      <Link to="/orders" className="text-sm text-indigo-600 hover:underline">
        ← Back to orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Order #{order.id}</h1>
        <span className="text-sm text-gray-500">
          {new Date(order.created_at).toLocaleString()}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="card md:col-span-1">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Customer
          </h2>
          <p className="font-medium text-gray-900">{order.customer.full_name}</p>
          <p className="text-sm text-gray-600">{order.customer.email}</p>
          <p className="text-sm text-gray-600">{order.customer.phone || '—'}</p>
        </div>

        <div className="card md:col-span-2 !p-0 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Product</th>
                <th className="th">Unit price</th>
                <th className="th">Qty</th>
                <th className="th text-right">Line total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.items.map((it) => (
                <tr key={it.id}>
                  <td className="td font-medium text-gray-900">{it.product_name}</td>
                  <td className="td">${Number(it.unit_price).toFixed(2)}</td>
                  <td className="td">{it.quantity}</td>
                  <td className="td text-right">${Number(it.line_total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="td font-semibold" colSpan={3}>
                  Total
                </td>
                <td className="td text-right font-bold text-gray-900">
                  ${Number(order.total_amount).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
