import { useEffect, useState } from 'react'
import { customersApi } from '../api/resources'
import { extractError } from '../api/client'
import { useToast } from '../context/ToastContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Modal from '../components/Modal.jsx'
import { EmptyState, ErrorState, Spinner } from '../components/States.jsx'

const emptyForm = { full_name: '', email: '', phone: '' }
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Customers() {
  const toast = useToast()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      setCustomers(await customersApi.list())
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
    setForm(emptyForm)
    setErrors({})
    setModalOpen(true)
  }

  function validate() {
    const e = {}
    if (!form.full_name.trim()) e.full_name = 'Full name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!emailRe.test(form.email)) e.email = 'Enter a valid email address'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submit(e) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await customersApi.create({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
      })
      toast.success('Customer created')
      setModalOpen(false)
      load()
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  async function remove(c) {
    if (!confirm(`Delete customer "${c.full_name}"?`)) return
    try {
      await customersApi.remove(c.id)
      toast.success('Customer deleted')
      load()
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Manage your customer directory"
        action={
          <button className="btn-primary" onClick={openCreate}>
            + Add Customer
          </button>
        }
      />

      <div className="card !p-0 overflow-x-auto">
        {loading ? (
          <Spinner />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={load} />
        ) : customers.length === 0 ? (
          <EmptyState message="No customers yet. Add your first customer." />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Name</th>
                <th className="th">Email</th>
                <th className="th">Phone</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="td font-medium text-gray-900">{c.full_name}</td>
                  <td className="td">{c.email}</td>
                  <td className="td">{c.phone || '—'}</td>
                  <td className="td text-right">
                    <button className="btn-danger !py-1 !px-3" onClick={() => remove(c)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} title="Add Customer" onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Full name" error={errors.full_name}>
            <input
              className="input"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Phone (optional)" error={errors.phone}>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Create'}
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
