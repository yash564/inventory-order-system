import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { customersApi, ordersApi, productsApi } from '../api/resources'
import { extractError } from '../api/client'
import PageHeader from '../components/PageHeader.jsx'
import { ErrorState, Spinner } from '../components/States.jsx'

const LOW_STOCK_THRESHOLD = 10

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    setError('')
    Promise.all([productsApi.list(), customersApi.list(), ordersApi.list()])
      .then(([products, customers, orders]) => setData({ products, customers, orders }))
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) return <Spinner />
  if (error) return <ErrorState message={error} onRetry={load} />

  const { products, customers, orders } = data
  const lowStock = products.filter((p) => p.quantity < LOW_STOCK_THRESHOLD)
  const revenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0)

  const cards = [
    { label: 'Total Products', value: products.length, to: '/products', accent: 'bg-indigo-50 text-indigo-700' },
    { label: 'Total Customers', value: customers.length, to: '/customers', accent: 'bg-sky-50 text-sky-700' },
    { label: 'Total Orders', value: orders.length, to: '/orders', accent: 'bg-emerald-50 text-emerald-700' },
    { label: 'Low Stock', value: lowStock.length, to: '/products', accent: 'bg-amber-50 text-amber-700' },
  ]

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your inventory and orders" />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="card hover:shadow-md transition-shadow"
          >
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className={`mt-2 inline-block rounded-md px-3 py-1 text-3xl font-bold ${c.accent}`}>
              {c.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 mt-8 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Total Revenue</h2>
          <p className="text-sm text-gray-500 mb-4">Sum of all order totals</p>
          <p className="text-4xl font-bold text-gray-900">${revenue.toFixed(2)}</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Low Stock Products{' '}
            <span className="text-sm font-normal text-gray-400">
              (&lt; {LOW_STOCK_THRESHOLD})
            </span>
          </h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-gray-400">All products are well stocked. 🎉</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700">{p.name}</span>
                  <span
                    className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                      p.quantity === 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {p.quantity} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
