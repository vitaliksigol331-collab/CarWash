import { useState } from 'react'
import { Droplets, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login({ onSwitchToRegister }) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn({ email, password })
    setLoading(false)
    if (error) setError(perevestyPomylku(error.message))
  }

  return (
    <AuthShell
      title="З поверненням"
      subtitle="Увійди у свій робочий простір автомийки"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="pошта@example.com"
            className="input"
          />
        </Field>
        <Field label="Пароль">
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input"
          />
        </Field>

        {error && <p className="text-sm text-coral-400">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 className="animate-spin" size={18} /> : 'Увійти'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Ще немає простору?{' '}
        <button onClick={onSwitchToRegister} className="text-aqua-400 hover:text-aqua-300 font-medium">
          Зареєструвати мийку
        </button>
      </p>
    </AuthShell>
  )
}

function perevestyPomylku(msg) {
  if (msg.includes('Invalid login credentials')) return 'Невірний email або пароль'
  if (msg.includes('Email not confirmed')) return 'Підтвердьте email перед входом'
  return msg
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-ink-950 relative overflow-hidden px-4">
      <div className="absolute -top-40 -left-32 w-[420px] h-[420px] rounded-full bg-aqua-500/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full bg-foam-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-aqua-400/15 flex items-center justify-center">
            <Droplets size={18} className="text-aqua-400" />
          </div>
          <span className="font-display font-extrabold text-lg tracking-tight text-white">
            Aqua<span className="text-aqua-400">Board</span>
          </span>
        </div>

        <div className="bg-ink-800 border border-ink-600 rounded-2xl p-8 shadow-glow animate-drop-in">
          <h1 className="text-2xl font-display font-bold text-white">{title}</h1>
          <p className="text-slate-400 text-sm mt-1 mb-6">{subtitle}</p>
          {children}
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          background: #0F1729;
          border: 1px solid #253150;
          border-radius: 0.75rem;
          padding: 0.65rem 0.9rem;
          font-size: 0.9rem;
          color: #E8EDF7;
          outline: none;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .input:focus {
          border-color: #22D3EE;
          box-shadow: 0 0 0 3px rgba(34,211,238,0.15);
        }
        .input::placeholder { color: #56617F; }
        .btn-primary {
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          background: linear-gradient(135deg, #22D3EE, #10B981);
          color: #061018;
          font-weight: 700;
          padding: 0.7rem 1rem;
          border-radius: 0.75rem;
          font-size: 0.9rem;
          transition: opacity .15s ease, transform .1s ease;
        }
        .btn-primary:hover { opacity: 0.92; }
        .btn-primary:active { transform: scale(0.99); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-400 mb-1.5">{label}</span>
      {children}
    </label>
  )
}
