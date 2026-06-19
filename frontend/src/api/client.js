import axios from 'axios'

// The backend base URL is injected at build time via Vite env var.
// Locally (docker-compose / vite dev) it defaults to localhost:8000.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const client = axios.create({ baseURL })

// Normalise FastAPI error responses into a single readable message.
export function extractError(err) {
  const detail = err?.response?.data?.detail
  if (Array.isArray(detail)) {
    // Pydantic validation errors: [{loc, msg, ...}]
    return detail.map((d) => `${d.loc?.slice(1).join('.') || 'field'}: ${d.msg}`).join('; ')
  }
  if (typeof detail === 'string') return detail
  if (err?.message) return err.message
  return 'Something went wrong'
}

export default client
