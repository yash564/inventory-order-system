import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { customersApi, ordersApi, productsApi } from '../api/resources'
import { extractError } from '../api/client'
import { useToast } from '../context/ToastContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Modal from '../components/Modal.jsx'
import { EmptyState, ErrorState, Spinner } from '../components/States.jsx'

export default function Orders() {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      setOrders(await ordersApi.list())
    } catch (err) {
      setLoadError(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function remove(o) {
    if (!confirm(`Cancel order #${o.id}? Stock will be returned to inventory.`)) return
    try {
      await ordersApi.remove(o.id)
      toast.success('Order cancelled')
      load()
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="Create and track customer orders"
        action={
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            + New Order
          </button>
        }
      />

      <div className="card !p-0 overflow-x-auto">
        {loading ? (
          <Spinner />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={load} />
        ) : orders.length === 0 ? (
          <EmptyState message="No orders yet. Create your first order." />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Order</th>
                <th className="th">Items</th>
                <th className="th">Total</th>
                <th className="th">Placed</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="td font-medium text-gray-900">#{o.id}</td>
                  <td className="td">{o.items.length} item(s)</td>
                  <td className="td font-medium">${Number(o.total_amount).toFixed(2)}</td>
                  <td className="td">{new Date(o.created_at).toLocaleString()}</td>
                  <td className="td text-right space-x-2">
                    <Link to={`/orders/${o.id}`} className="btn-secondary !py-1 !px-3">
                      View
                    </Link>
                    <button className="btn-danger !py-1 !px-3" onClick={() => remove(o)}>
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <NewOrderModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          setModalOpen(false)
          load()
        }}
      />
    </div>
  )
}

function NewOrderModal({ open, onClose, onCreated }) {
  const toast = useToast()
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [refLoading, setRefLoading] = useState(false)
  const [refError, setRefError] = useState('')

  const [customerId, setCustomerId] = useState('')
  const [lines, setLines] = useState([{ product_id: '', quantity: 1 }])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setCustomerId('')
    setLines([{ product_id: '', quantity: 1 }])
    setErrors({})
    setRefLoading(true)
    setRefError('')
    Promise.all([customersApi.list(), productsApi.list()])
      .then(([c, p]) => {
        setCustomers(c)
        setProducts(p)
      })
      .catch((err) => setRefError(extractError(err)))
      .finally(() => setRefLoading(false))
  }, [open])

  const productsById = useMemo(
    () => Object.fromEntries(products.map((p) => [String(p.id), p])),
    [products]
  )

  const estimatedTotal = useMemo(() => {
    return lines.reduce((sum, l) => {
      const p = productsById[l.product_id]
      if (!p) return sum
      return sum + Number(p.price) * Number(l.quantity || 0)
    }, 0)
  }, [lines, productsById])

  function setLine(i, patch) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  function addLine() {
    setLines((ls) => [...ls, { product_id: '', quantity: 1 }])
  }
  function removeLine(i) {
    setLines((ls) => (ls.length === 1 ? ls : ls.filter((_, idx) => idx !== i)))
  }

  function validate() {
    const e = {}
    if (!customerId) e.customer = 'Select a customer'
    const chosen = lines.filter((l) => l.product_id)
    if (chosen.length === 0) e.items = 'Add at least one product'
    lines.forEach((l, i) => {
      if (l.product_id) {
        const p = productsById[l.product_id]
        const qty = Number(l.quantity)
        if (!Number.isInteger(qty) || qty <= 0) e[`qty_${i}`] = 'Qty must be ≥ 1'
        else if (p && qty > p.quantity) e[`qty_${i}`] = `Only ${p.quantity} in stock`
      }
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submit(e) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await ordersApi.create({
        customer_id: Number(customerId),
        items: lines
          .filter((l) => l.product_id)
          .map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity) })),
      })
      toast.success('Order created')
      onCreated()
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="New Order" onClose={onClose}>
      {refLoading ? (
        <Spinner />
      ) : refError ? (
        <ErrorState message={refError} />
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label className="label">Customer</label>
            <select
              className="input"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.email})
                </option>
              ))}
            </select>
            {errors.customer && <p className="text-xs text-red-600 mt-1">{errors.customer}</p>}
          </div>

          <div>
            <label className="label">Items</label>
            <div className="space-y-2">
              {lines.map((l, i) => {
                const p = productsById[l.product_id]
                return (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <select
                        className="input"
                        value={l.product_id}
                        onChange={(e) => setLine(i, { product_id: e.target.value })}
                      >
                        <option value="">Select product…</option>
                        {products.map((pr) => (
                          <option key={pr.id} value={pr.id} disabled={pr.quantity === 0}>
                            {pr.name} — ${Number(pr.price).toFixed(2)} ({pr.quantity} in stock)
                          </option>
                        ))}
                      </select>
                      {errors[`qty_${i}`] && (
                        <p className="text-xs text-red-600 mt-1">{errors[`qty_${i}`]}</p>
                      )}
                    </div>
                    <input
                      type="number"
                      min="1"
                      max={p ? p.quantity : undefined}
                      className="input w-20"
                      value={l.quantity}
                      onChange={(e) => setLine(i, { quantity: e.target.value })}
                    />
                    <button
                      type="button"
                      className="btn-secondary !px-3"
                      onClick={() => removeLine(i)}
                      disabled={lines.length === 1}
                      title="Remove line"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
            {errors.items && <p className="text-xs text-red-600 mt-1">{errors.items}</p>}
            <button type="button" className="btn-secondary !py-1 mt-2" onClick={addLine}>
              + Add item
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 pt-4">
            <span className="text-sm text-gray-500">Estimated total</span>
            <span className="text-lg font-bold text-gray-900">
              ${estimatedTotal.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Placing…' : 'Place order'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
