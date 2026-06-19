export function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
    </div>
  )
}

export function EmptyState({ message }) {
  return (
    <div className="text-center py-12 text-gray-400 text-sm">{message}</div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="text-center py-12">
      <p className="text-red-600 text-sm mb-3">{message}</p>
      {onRetry && (
        <button className="btn-secondary" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}
