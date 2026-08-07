import { useEffect, useMemo, useState } from 'react'
import { Wallet, Trash2, ArrowDownCircle, ArrowUpCircle, Settings2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import {
  PageHeader, Card, StatCard, Button, Input, Select, Textarea, Modal, Loading, EmptyState, Badge,
} from '../ui'

const todayISO = () => new Date().toISOString().slice(0, 10)

const TX_TYPES = ['Зняття', 'Внесення', 'Коригування']

const emptyForm = {
  type: 'Зняття',
  amount: '',
  note: '',
  transaction_date: todayISO(),
}

export default function Cashbox() {
  const { storeId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [revenue, setRevenue] = useState(0)
  const [cashExpenses, setCashExpenses] = useState(0)
  const [commissionsPaid, setCommissionsPaid] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: cars }, { data: expenseRows }, { data: commissionRows }, { data: txRows }] = await Promise.all([
      supabase.from('car_entries').select('price').eq('store_id', storeId),
      supabase
        .from('expense_entries')
        .select('amount')
        .eq('store_id', storeId)
        .eq('funding_source', 'Каса мийки'),
      supabase.from('car_entry_employees').select('commission_amount').eq('store_id', storeId),
      supabase
        .from('cash_transactions')
        .select('*')
        .eq('store_id', storeId)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false }),
    ])
    setRevenue((cars ?? []).reduce((s, c) => s + Number(c.price || 0), 0))
    setCashExpenses((expenseRows ?? []).reduce((s, e) => s + Number(e.amount || 0), 0))
    setCommissionsPaid((commissionRows ?? []).reduce((s, c) => s + Number(c.commission_amount || 0), 0))
    setTransactions(txRows ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (storeId) load()
  }, [storeId])

  const manualTotal = useMemo(
    () => transactions.reduce((s, t) => s + Number(t.amount || 0), 0),
    [transactions]
  )

  const balance = revenue - cashExpenses - commissionsPaid + manualTotal

  const openModal = (type) => {
    setForm({ ...emptyForm, type })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const raw = Number(form.amount) || 0
    const signedAmount = form.type === 'Зняття' ? -Math.abs(raw) : Math.abs(raw)
    const { error } = await supabase.from('cash_transactions').insert({
      store_id: storeId,
      amount: signedAmount,
      type: form.type,
      note: form.note || null,
      transaction_date: form.transaction_date,
    })
    setSaving(false)
    if (!error) {
      setModalOpen(false)
      load()
    } else {
      alert('Помилка збереження: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Видалити цю операцію? Баланс каси перерахується.')) return
    await supabase.from('cash_transactions').delete().eq('id', id)
    load()
  }

  if (loading) return <Loading />

  return (
    <div>
      <PageHeader
        title="Каса"
        subtitle="Скільки готівки зараз фактично в касі мийки"
        action={
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="ghost" onClick={() => openModal('Внесення')} className="flex-1 sm:flex-none">
              <ArrowUpCircle size={16} /> Внести
            </Button>
            <Button variant="ghost" onClick={() => openModal('Зняття')} className="flex-1 sm:flex-none">
              <ArrowDownCircle size={16} /> Зняти
            </Button>
          </div>
        }
      />

      <Card className="mb-6 flex items-center gap-4 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br from-aqua-400 to-foam-400 opacity-10 blur-3xl" />
        <div className="w-14 h-14 rounded-2xl bg-aqua-400/15 flex items-center justify-center shrink-0">
          <Wallet size={26} className="text-aqua-400" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400">У касі зараз</p>
          <p className={`text-3xl md:text-4xl font-mono font-extrabold mt-1 ${balance >= 0 ? 'text-white' : 'text-coral-400'}`}>
            {balance.toLocaleString('uk-UA')} ₴
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Весь дохід" value={`${revenue.toLocaleString('uk-UA')} ₴`} accent="foam" hint="Сума всіх авто за весь час" />
        <StatCard label="Витрачено з каси" value={`${cashExpenses.toLocaleString('uk-UA')} ₴`} accent="coral" hint='Витрати з джерелом "Каса мийки"' />
        <StatCard
          label="Ручні операції"
          value={`${manualTotal >= 0 ? '+' : ''}${manualTotal.toLocaleString('uk-UA')} ₴`}
          accent={manualTotal >= 0 ? 'aqua' : 'amber'}
          hint="Внесення мінус зняття"
        />
        <StatCard label="Баланс" value={`${balance.toLocaleString('uk-UA')} ₴`} accent={balance >= 0 ? 'foam' : 'coral'} />
      </div>

      <Card className="mb-6 flex items-start gap-3 border-aqua-400/20">
        <Settings2 className="text-aqua-400 shrink-0 mt-0.5" size={18} />
        <p className="text-xs text-slate-400 leading-relaxed">
          Баланс = весь дохід за авто мінус виплати працівникам мінус витрати, позначені джерелом "Каса мийки" у вкладці "Витрати", плюс ручні
          внесення/зняття тут. Якщо баланс не збігається з реальною готівкою (наприклад, ти вже користувався мийкою
          до цієї системи) — зроби "Коригування" на потрібну суму, щоб вирівняти.
        </p>
      </Card>

      <h3 className="font-display font-bold text-white mb-3">Ручні операції</h3>
      {transactions.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Ручних операцій ще не було"
          subtitle='Використовуй "Внести" чи "Зняти", якщо готівка рухається поза звичайними витратами — наприклад, забираєш виручку додому чи довносиш на розмін.'
        />
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <Card key={t.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone={t.amount >= 0 ? 'foam' : 'coral'}>{t.type}</Badge>
                  <span className="text-xs text-slate-500 font-mono">
                    {new Date(t.transaction_date + 'T00:00:00').toLocaleDateString('uk-UA')}
                  </span>
                </div>
                {t.note && <p className="text-xs text-slate-500 mt-1 truncate">{t.note}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`font-mono font-semibold ${t.amount >= 0 ? 'text-foam-400' : 'text-coral-400'}`}>
                  {t.amount >= 0 ? '+' : ''}{Number(t.amount).toLocaleString('uk-UA')} ₴
                </span>
                <button onClick={() => handleDelete(t.id)} className="text-slate-500 hover:text-coral-400">
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal title="Касова операція" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <Select
              label="Тип операції"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {TX_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
            <Input
              label="Сума, ₴"
              type="number"
              min="0"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0"
            />
            <p className="text-xs text-slate-500 -mt-2">
              {form.type === 'Зняття'
                ? 'Ця сума буде відніматись від балансу каси.'
                : 'Ця сума буде додаватись до балансу каси.'}
            </p>
            <Input
              label="Дата"
              type="date"
              required
              max={todayISO()}
              value={form.transaction_date}
              onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
            />
            <Textarea
              label="Нотатка (необов'язково)"
              rows={2}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Наприклад: забрав виручку додому, поповнення розміну..."
            />
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'Збереження...' : 'Зберегти операцію'}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  )
}
