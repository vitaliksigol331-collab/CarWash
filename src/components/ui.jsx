import { X } from 'lucide-react'

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl md:text-2xl font-display font-extrabold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="w-full sm:w-auto">{action}</div>}
    </div>
  )
}

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-ink-800 border border-ink-600 rounded-2xl p-4 md:p-5 ${className}`}>
      {children}
    </div>
  )
}

export function StatCard({ label, value, hint, accent = 'aqua', onClick }) {
  const accents = {
    aqua: 'from-aqua-400 to-aqua-500 text-aqua-400',
    foam: 'from-foam-400 to-foam-500 text-foam-400',
    amber: 'from-amber-400 to-amber-400 text-amber-400',
    coral: 'from-coral-400 to-coral-400 text-coral-400',
  }
  const content = (
    <>
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${accents[accent]} opacity-10 blur-2xl`} />
      <p className="text-xs font-medium text-slate-400 truncate">{label}</p>
      <p className="text-lg md:text-2xl font-mono font-bold text-white mt-2 truncate" title={value}>{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-1 truncate">{hint}</p>}
    </>
  )

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="text-left w-full bg-ink-800 border border-ink-600 rounded-2xl p-4 md:p-5 relative overflow-hidden min-w-0 hover:border-aqua-400/40 hover:bg-ink-700/60 transition-colors cursor-pointer"
      >
        {content}
      </button>
    )
  }

  return (
    <Card className="relative overflow-hidden min-w-0">
      {content}
    </Card>
  )
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold px-4 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-gradient-to-r from-aqua-400 to-foam-400 text-ink-950 hover:opacity-90 active:scale-[0.99]',
    ghost: 'bg-ink-700 text-slate-200 hover:bg-ink-600',
    danger: 'bg-coral-400/10 text-coral-400 hover:bg-coral-400/20',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Input({ label, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-slate-400 mb-1.5">{label}</span>}
      <input
        className={`w-full bg-ink-900 border border-ink-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-aqua-400 focus:ring-2 focus:ring-aqua-400/15 placeholder:text-slate-600 ${className}`}
        {...props}
      />
    </label>
  )
}

export function Select({ label, children, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-slate-400 mb-1.5">{label}</span>}
      <select
        className={`w-full bg-ink-900 border border-ink-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-aqua-400 focus:ring-2 focus:ring-aqua-400/15 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  )
}

export function Textarea({ label, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-slate-400 mb-1.5">{label}</span>}
      <textarea
        className={`w-full bg-ink-900 border border-ink-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-aqua-400 focus:ring-2 focus:ring-aqua-400/15 placeholder:text-slate-600 resize-none ${className}`}
        {...props}
      />
    </label>
  )
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-ink-800 border border-ink-600 rounded-2xl p-5 md:p-6 shadow-glow animate-drop-in max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-display font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <Card className="flex flex-col items-center justify-center text-center py-14">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-ink-700 flex items-center justify-center mb-4">
          <Icon size={22} className="text-aqua-400" />
        </div>
      )}
      <p className="font-display font-bold text-white">{title}</p>
      {subtitle && <p className="text-sm text-slate-500 mt-1 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  )
}

export function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-ink-700 text-slate-300',
    foam: 'bg-foam-500/15 text-foam-400',
    amber: 'bg-amber-400/15 text-amber-400',
    coral: 'bg-coral-400/15 text-coral-400',
    aqua: 'bg-aqua-400/15 text-aqua-400',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function Loading() {
  return (
    <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
      Завантаження даних...
    </div>
  )
}

export function PeriodSelector({ periods, value, onChange }) {
  return (
    <div className="w-full sm:w-auto overflow-x-auto scrollbar-thin">
      <div className="inline-flex items-center gap-1 bg-ink-800 border border-ink-600 rounded-xl p-1 whitespace-nowrap">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => onChange(p.key)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              value === p.key ? 'bg-aqua-400 text-ink-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
