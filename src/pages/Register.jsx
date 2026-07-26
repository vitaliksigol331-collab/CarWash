import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { AuthShell, Field } from './Login'

export default function Register({ onSwitchToLogin }) {
  const { signUp } = useAuth()
  const [storeName, setStoreName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Пароль має містити щонайменше 6 символів')
      return
    }

    setLoading(true)
    const { error } = await signUp({ email, password, storeName })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <AuthShell title="Майже готово" subtitle="Залишився один крок">
        <p className="text-sm text-slate-300 leading-relaxed">
          Ми надіслали лист на <span className="text-aqua-400">{email}</span>. Підтверди пошту,
          щоб активувати робочий простір «{storeName}», а тоді повертайся й заходь.
        </p>
        <button onClick={onSwitchToLogin} className="btn-primary w-full mt-6">
          Перейти до входу
        </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Створити простір" subtitle="Реєстрація нової автомийки в AquaBoard">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Назва автомийки">
          <input
            type="text"
            required
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Наприклад, «Чистий Двір»"
            className="input"
          />
        </Field>
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
            placeholder="Мінімум 6 символів"
            className="input"
          />
        </Field>

        {error && <p className="text-sm text-coral-400">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 className="animate-spin" size={18} /> : 'Зареєструватись'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Вже маєш простір?{' '}
        <button onClick={onSwitchToLogin} className="text-aqua-400 hover:text-aqua-300 font-medium">
          Увійти
        </button>
      </p>
    </AuthShell>
  )
}
