import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Wallet2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { EXPENSE_CATEGORIES } from '../../lib/services'
import { PERIODS, periodStartDate } from '../../lib/period'
import {
  PageHeader, Card, StatCard, Button, Input, Select, Textarea, Modal,
  Loading, EmptyState, Badge, PeriodSelector,
} from '../ui'

const todayISO = () => new Date().toISOString().slice(0, 10)

const FUNDING_SOURCES = ['Каса мийки', 'Особисті кошти власника']

const emptyForm = {
  category: EXPENSE_CATEGORIES[0],
  amount: '',
  note: '',
  expense_date: todayISO(),
  funding_source: FUNDING_SOURCES[0],
}

export default function Expenses() {
  const { storeId } = useAuth()
  const [period, setPeriod] = useState('month')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const from = periodStartDate(period)
    let query = supabase
      .from('expense_entries')
      .select('*')
      .eq('store_id', storeId)
      .order('expense_date', { ascending: false })
    if (from) query = query.gte('expense_date', from)
    const { data, error } = await query
    if (!error) setEntries(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (storeId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, period])

  const total = useMemo(() => entries.reduce((s, e) => s + Number(e.amount || 0), 0), [entries])

  const personalFunded = useMemo(
    () => entries.filter((e) => e.funding_source === 'Особисті кошти власника')
      .reduce((s, e) => s + Number(e.amount || 0), 0),
    [entries]
  )

  const byCategory = useMemo(() => {
    const map = {}
    entries.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount || 0)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [entries])

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('expense_entries').insert({
      store_id: storeId,
      category: form.category,
      amount: Number(form.amount) || 0,
      note: form.note || null,
      expense_date: form.expense_date,
      funding_source: form.funding_source,
    })
    setSaving(false)
    if (!error) {
      setModalOpen(false)
      setForm(emptyForm)
      load()
    } else {
      alert('Помилка збереження: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Видалити цю витрату?')) return
    await supabase.from('expense_entries').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <PageHeader
        title="Витрати"
        subtitle="Хімія, зарплата, оренда та інші витрати мийки по категоріях"
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Додати витрату
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <PeriodSelector periods={PERIODS} value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Всього витрачено" value={`${total.toLocaleString('uk-UA')} ₴`} accent="coral" />
        <StatCard label="Записів витрат" value={entries.length} accent="aqua" />
        <StatCard
          label="З особистих коштів"
          value={`${personalFunded.toLocaleString('uk-UA')} ₴`}
          accent="amber"
          hint="Скільки довелось докласти з кишені"
        />
        {byCategory[0] && (
          <StatCard
            label="Найбільша категорія"
            value={byCategory[0][0]}
            hint={`${byCategory[0][1].toLocaleString('uk-UA')} ₴`}
            accent="amber"
          />
        )}
      </div>

      {loading ? (
        <Loading />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Wallet2}
          title="За цей період витрат ще немає"
          subtitle="Додай першу витрату — наприклад, закупку хімії чи оплату оренди."
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={16} /> Додати витрату
            </Button>
          }
        />
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3 md:space-y-0">
            {/* Мобільні картки (< md) */}
            <div className="md:hidden space-y-3">
              {entries.map((e) => (
                <Card key={e.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone="slate">{e.category}</Badge>
                      {e.funding_source === 'Особисті кошти власника' && (
                        <Badge tone="amber">З кишені</Badge>
                      )}
                      <span className="text-xs text-slate-500 font-mono">
                        {new Date(e.expense_date + 'T00:00:00').toLocaleDateString('uk-UA')}
                      </span>
                    </div>
                    <p className="font-mono text-coral-400 font-semibold mt-2">
                      {Number(e.amount).toLocaleString('uk-UA')} ₴
                    </p>
                    {e.note && <p className="text-xs text-slate-500 mt-1 truncate">{e.note}</p>}
                  </div>
                  <button onClick={() => handleDelete(e.id)} className="text-slate-500 hover:text-coral-400 shrink-0">
                    <Trash2 size={16} />
                  </button>
                </Card>
              ))}
            </div>

            {/* Таблиця (>= md) */}
            <Card className="hidden md:block p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-ink-700">
                      <th className="px-5 py-3 font-medium">Дата</th>
                      <th className="px-5 py-3 font-medium">Категорія</th>
                      <th className="px-5 py-3 font-medium">Джерело</th>
                      <th className="px-5 py-3 font-medium">Сума</th>
                      <th className="px-5 py-3 font-medium">Нотатка</th>
                      <th className="px-5 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id} className="border-b border-ink-700/60 last:border-0 hover:bg-ink-700/30">
                        <td className="px-5 py-3 font-mono text-slate-300">
                          {new Date(e.expense_date + 'T00:00:00').toLocaleDateString('uk-UA')}
                        </td>
                        <td className="px-5 py-3"><Badge tone="slate">{e.category}</Badge></td>
                        <td className="px-5 py-3">
                          {e.funding_source === 'Особисті кошти власника'
                            ? <Badge tone="amber">З кишені</Badge>
                            : <span className="text-xs text-slate-500">Каса мийки</span>}
                        </td>
                        <td className="px-5 py-3 font-mono text-coral-400 font-semibold">
                          {Number(e.amount).toLocaleString('uk-UA')} ₴
                        </td>
                        <td className="px-5 py-3 text-slate-500 max-w-[220px] truncate">{e.note || '—'}</td>
                        <td className="px-5 py-3 text-right">
                          <button onClick={() => handleDelete(e.id)} className="text-slate-500 hover:text-coral-400">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="font-display font-bold text-white mb-4">За категоріями</h3>
            <div className="space-y-3">
              {byCategory.map(([cat, sum]) => (
                <div key={cat} className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{cat}</span>
                  <span className="font-mono text-coral-400">{sum.toLocaleString('uk-UA')} ₴</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {modalOpen && (
        <Modal title="Нова витрата" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <Select
              label="Категорія"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
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
            <Input
              label="Дата"
              type="date"
              required
              max={todayISO()}
              value={form.expense_date}
              onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
            />
            <Select
              label="Джерело коштів"
              value={form.funding_source}
              onChange={(e) => setForm({ ...form, funding_source: e.target.value })}
            >
              {FUNDING_SOURCES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </Select>
            <p className="text-xs text-slate-500 -mt-2">
              "Особисті кошти власника" — якщо довелось заплатити зі свого гаманця, а не з каси мийки.
              На чистий прибуток мийки це все одно впливає (це реальна витрата), але так буде видно,
              скільки саме довелось докласти самому.
            </p>
            <Textarea
              label="Нотатка (необов'язково)"
              rows={3}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Наприклад, закупка автошампуню"
            />
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'Збереження...' : 'Зберегти витрату'}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  )
}
