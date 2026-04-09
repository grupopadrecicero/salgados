import { useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle } from 'lucide-react'

// Store simples de toasts
let listeners = []
let toastId = 0

export const toast = {
  success: (msg) => emit({ type: 'success', message: msg }),
  error:   (msg) => emit({ type: 'error',   message: msg }),
}

function emit(toast) {
  toastId++
  const t = { ...toast, id: toastId }
  listeners.forEach(fn => fn(t))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  // Registrar listener
  const addToast = useCallback((t) => {
    setToasts(prev => [...prev, t])
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 4000)
  }, [])

  if (!listeners.includes(addToast)) listeners.push(addToast)

  const remove = (id) => setToasts(prev => prev.filter(x => x.id !== id))

  return (
    <div className="fixed bottom-4 right-4 z-[100] space-y-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm min-w-64 max-w-sm
            ${t.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
        >
          {t.type === 'success'
            ? <CheckCircle size={16} className="flex-shrink-0" />
            : <AlertCircle size={16} className="flex-shrink-0" />
          }
          <span className="flex-1">{t.message}</span>
          <button onClick={() => remove(t.id)} className="opacity-75 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
