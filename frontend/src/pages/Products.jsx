import { useEffect, useState } from 'react'
import { productsApi } from '../api/resources'
import { extractError } from '../api/client'
import { useToast } from '../context/ToastContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Modal from '../components/Modal.jsx'
import { EmptyState, ErrorState, Spinner } from '../components/States.jsx'

const emptyForm = { name: '', sku: '', price: '', quantity: '' }

export default function Products() {
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      setProducts(await productsApi.list())
    } catch (err) {
      setLoadError(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setErrors({})
    setModalOpen(true)
  }

  function openEdit(p) {
    setEditing(p)
    setForm({ name: p.name, sku: p.sku, price: p.price, quantity: p.quantity })
    setErrors({})
    setModalOpen(true)
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.sku.trim()) e.sku = 'SKU is required'
    if (form.price === '' || Number(form.price) < 0) e.price = 'Price must be 0 or more'
    if (form.quantity === '' || !Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 0)
      e.quantity = 'Quantity must be a whole number ≥ 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submit(e) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: Number(form.price),
      quantity: Number(form.quantity),
    }
    try {
      if (editing) {
        await productsApi.update(editing.id, payload)
        toast.success('Product updated')
      } else {
        await productsApi.create(payload)
        toast.success('Product created')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  async function remove(p) {
    if (!confirm(`Delete product "${p.name}"?`)) return
    try {
      await productsApi.remove(p.id)
      toast.success('Product deleted')
      load()
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage your catalogue and stock levels"
        action={
          <button className="btn-primary" onClick={openCreate}>
            + Add Product
          </button>
        }
      />

      <div className="card !p-0 overflow-x-auto">
        {loading ? (
          <Spinner />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={load} />
        ) : products.length === 0 ? (
          <EmptyState message="No products yet. Add your first product." />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Name</th>
                <th className="th">SKU</th>
                <th className="th">Price</th>
                <th className="th">In Stock</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="td font-medium text-gray-900">{p.name}</td>
                  <td className="td">{p.sku}</td>
                  <td className="td">${Number(p.price).toFixed(2)}</td>
                  <td className="td">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.quantity === 0
                          ? 'bg-red-100 text-red-700'
                          : p.quantity < 10
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {p.quantity}
                    </span>
                  </td>
                  <td className="td text-right space-x-2">
                    <button className="btn-secondary !py-1 !px-3" onClick={() => openEdit(p)}>
                      Edit
                    </button>
                    <button className="btn-danger !py-1 !px-3" onClick={() => remove(p)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'Edit Product' : 'Add Product'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Name" error={errors.name}>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="SKU / Code" error={errors.sku}>
            <input
              className="input"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price" error={errors.price}>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </Field>
            <Field label="Quantity in stock" error={errors.quantity}>
              <input
                type="number"
                min="0"
                className="input"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
