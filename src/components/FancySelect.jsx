import { useEffect, useRef, useState } from 'react'

export function FancySelect({
  value,
  onChange,
  options,
  placeholder,
  className = '',
  align = 'right',
  buttonClassName,
  panelClassName,
  labelClassName = 'truncate',
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)
  const panelRef = useRef(null)

  // Current label from options or placeholder
  const selected = options.find((o) => o.value === value)
  const label = selected?.label || placeholder || ''

  // Close on outside click/touch or Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      const t = e.target
      if (
        panelRef.current &&
        !panelRef.current.contains(t) &&
        !(btnRef.current && btnRef.current.contains(t))
      ) {
        setOpen(false)
      }
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Default styles, overridable via props
  const triggerClass = buttonClassName || 'h-10 inline-flex items-center gap-2 rounded-md bg-gray-800/60 px-3 pr-8 text-sm text-white ring-1 ring-white/10 hover:ring-white/20 focus:outline-none focus:ring-2 focus:ring-[#F18800]'
  const panelCls = panelClassName || `absolute z-50 mt-2 top-full ${align === 'right' ? 'right-0' : 'left-0'} min-w-[14rem] bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-lg shadow-lg p-1`

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
      >
        {/* Visible value/placeholder */}
  <span className={`block ${labelClassName}`}>{label}</span>
        {/* Caret icon */}
        <svg
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.17l3.71-2.94a.75.75 0 1 1 .94 1.16l-4.24 3.36a.75.75 0 0 1-.94 0L5.21 8.39a.75.75 0 0 1 .02-1.18z" />
        </svg>
      </button>

      {open && (
        <div ref={panelRef} className={panelCls}>
          <ul className="max-h-60 overflow-auto">
            {options.map((o) => {
              const active = o.value === value
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${active ? 'bg-white/10 text-white' : 'text-gray-200 hover:bg-white/5'}`}
                    onClick={() => { onChange?.(o.value); setOpen(false) }}
                  >
                    <span className="inline-flex items-center gap-2">
                      {/* Check icon for selected option */}
                      {active && (
                        <svg className="h-4 w-4 text-[#F18800]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.07 7.07a1 1 0 0 1-1.415 0L3.29 9.838a1 1 0 1 1 1.415-1.415l3.239 3.239 6.364-6.364a1 1 0 0 1 1.396-.008z" clipRule="evenodd" />
                        </svg>
                      )}
                      {/* Dropdown items: original single-line truncation */}
                      <span className="truncate">{o.label}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export default FancySelect
