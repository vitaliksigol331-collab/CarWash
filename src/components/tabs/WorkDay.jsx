import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Car, ChevronLeft, ChevronRight, Tag, Save } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { SERVICES, BODY_TYPES } from '../../lib/services'
import {
  PageHeader, Card, StatCard, Button, Input, Select, Textarea, Modal, Loading, EmptyState, Badge,
} from '../ui'

const todayISO = () => new Date().toISOString().slice(0, 10)

const emptyForm = {
  service: SERVICES[0],
  car_brand: '',
  body_type: BODY_TYPES[0],
  price: '',
  price_note: '',
  employee_id: '',
}

const CARPET_SERVICE = 'Мийка килимків'
const CARPET_RATES = [100, 125, 150]

function priceKey(service, bodyType) {
  return `${service}|${bodyType}`
}

function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('uk-UA', {
    day: '2-digit', month: 'long', weekday: 'short',
  })
}

export default function WorkDay() {
  const { storeId } = useAuth()
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [entries, setEntries] = useState([])
  const [employees, setEmployees] = useState([])
  const [history, setHistory] = useState([])
  const [dayExpenses, setDayExpenses] = useState(0)
  const [priceList, setPriceList] = useState({}) // { "service|bodyType": price }
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [priceModalOpen, setPriceModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [priceTouched, setPriceTouched] = useState(false)
  const [carpetLength, setCarpetLength] = useState('')
  const [carpetWidth, setCarpetWidth] = useState('')
  const [carpetRate, setCarpetRate] = useState(String(CARPET_RATES[0]))
  const [saving, setSaving] = useState(false)

  async function loadEmployees() {
    const { data } = await supabase
      .from('employees')
      .select('id, name, commission_percent, active')
      .eq('store_id', storeId)
      .eq('active', true)
      .order('name')
    setEmployees(data ?? [])
  }

  async function loadPriceList() {
    const { data } = await supabase
      .from('price_list')
      .select('service, body_type, price')
      .eq('store_id', storeId)
    const map = {}
    ;(data ?? []).forEach((row) => {
      map[priceKey(row.service, row.body_type)] = row.price
    })
    setPriceList(map)
  }

  async function loadDay(date) {
    setLoading(true)
    const [{ data: dayEntries }, { data: expenseRows }, { data: historyRows }] = await Promise.all([
      supabase
        .from('car_entries')
        .select('*')
        .eq('store_id', storeId)
        .eq('entry_date', date)
        .order('created_at', { ascending: false }),
      supabase
        .from('expense_entries')
        .select('amount')
        .eq('store_id', storeId)
        .eq('expense_date', date),
      supabase
        .from('work_days')
        .select('date, revenue, cars_washed, expenses')
        .eq('store_id', storeId)
        .order('date', { ascending: false })
        .limit(14),
    ])
    setEntries(dayEntries ?? [])
    setDayExpenses((expenseRows ?? []).reduce((s, r) => s + Number(r.amount || 0), 0))
    setHistory(historyRows ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (storeId) {
      loadEmployees()
      loadPriceList()
    }
  }, [storeId])

  useEffect(() => {
    if (storeId) loadDay(selectedDate)
  }, [storeId, selectedDate])

  const totals = useMemo(() => {
    const revenue = entries.reduce((s, e) => s + Number(e.price || 0), 0)
    const commissions = entries.reduce((s, e) => s + Number(e.commission_amount || 0), 0)
    const cars = entries.length
    return { revenue, commissions, cars, net: revenue - commissions - dayExpenses }
  }, [entries, dayExpenses])

  const priceFor = (service, bodyType) => {
    const listed = priceList[priceKey(service, bodyType)]
    return listed !== undefined ? String(listed) : ''
  }

  const carpetPrice = (length, width, rate) => {
    const area = (Number(length) || 0) * (Number(width) || 0)
    const price = area * Number(rate)
    return price > 0 ? price.toFixed(2) : ''
  }

  const openAddCar = () => {
    setForm({ ...emptyForm, price: priceFor(emptyForm.service, emptyForm.body_type) })
    setPriceTouched(false)
    setCarpetLength('')
    setCarpetWidth('')
    setCarpetRate(String(CARPET_RATES[0]))
    setModalOpen(true)
  }

  const handleServiceChange = (newService) => {
    setForm((f) => {
      if (newService === CARPET_SERVICE) {
        return { ...f, service: newService, price: priceTouched ? f.price : '' }
      }
      return { ...f, service: newService, price: priceTouched ? f.price : priceFor(newService, f.body_type) }
    })
    if (newService === CARPET_SERVICE) {
      setCarpetLength('')
      setCarpetWidth('')
      setCarpetRate(String(CARPET_RATES[0]))
    }
  }

  const handleBodyTypeChange = (newBodyType) => {
    setForm((f) => ({
      ...f,
      body_type: newBodyType,
      price: (priceTouched || f.service === CARPET_SERVICE) ? f.price : priceFor(f.service, newBodyType),
    }))
  }

  const handleCarpetFieldChange = (field, value) => {
    const next = { length: carpetLength, width: carpetWidth, rate: carpetRate, [field]: value }
    if (field === 'length') setCarpetLength(value)
    if (field === 'width') setCarpetWidth(value)
    if (field === 'rate') setCarpetRate(value)
    if (!priceTouched) {
      setForm((f) => ({ ...f, price: carpetPrice(next.length, next.width, next.rate) }))
    }
  }

  const carpetArea = (Number(carpetLength) || 0) * (Number(carpetWidth) || 0)

  const handleAddCar = async (e) => {
    e.preventDefault()
    setSaving(true)
    const chosenEmployee = employees.find((emp) => emp.id === form.employee_id)
    const { error } = await supabase.from('car_entries').insert({
      store_id: storeId,
      entry_date: selectedDate,
      service: form.service,
      car_brand: form.car_brand || null,
      body_type: form.body_type,
      price: Number(form.price) || 0,
      price_note: form.price_note || null,
      employee_id: chosenEmployee?.id || null,
      employee_name_snapshot: chosenEmployee?.name || null,
      commission_percent_snapshot: chosenEmployee?.commission_percent || 0,
    })
    setSaving(false)
    if (!error) {
      setModalOpen(false)
      setForm(emptyForm)
      loadDay(selectedDate)
    } else {
      alert('Помилка збереження: ' + error.message)
    }
  }

  const handleDeleteCar = async (id) => {
    if (!confirm('Видалити цей запис про авто? Списані матеріали зі складу повернуться назад.')) return
    await supabase.from('car_entries').delete().eq('id', id)
    loadDay(selectedDate)
  }

  const shiftDate = (deltaDays) => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, d))
    date.setUTCDate(date.getUTCDate() + deltaDays)
    setSelectedDate(date.toISOString().slice(0, 10))
  }

  return (
    <div>
      <PageHeader
        title="Робочий день"
        subtitle="Додавай кожне помите авто окремо — дохід і статистика порахуються самі"
        action={
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="ghost" onClick={() => setPriceModalOpen(true)} className="flex-1 sm:flex-none">
              <Tag size={16} /> Прайс-лист
            </Button>
            <Button onClick={openAddCar} className="flex-1 sm:flex-none">
              <Plus size={16} /> Додати авто
            </Button>
          </div>
        }
      />

      {/* Перемикач дати */}
      <Card className="flex items-center justify-between gap-2 mb-6">
        <button onClick={() => shiftDate(-1)} className="p-2 rounded-lg text-slate-400 hover:bg-ink-700 hover:text-white shrink-0">
          <ChevronLeft size={18} />
        </button>
        <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 min-w-0">
          <span className="font-display font-bold text-white capitalize text-sm sm:text-base truncate">{fmtDate(selectedDate)}</span>
          <input
            type="date"
            value={selectedDate}
            max={todayISO()}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-ink-900 border border-ink-600 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-aqua-400 max-w-[140px]"
          />
        </div>
        <button
          onClick={() => shiftDate(1)}
          disabled={selectedDate >= todayISO()}
          className="p-2 rounded-lg text-slate-400 hover:bg-ink-700 hover:text-white disabled:opacity-30 shrink-0"
        >
          <ChevronRight size={18} />
        </button>
      </Card>

      {/* Підсумки дня */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Дохід за день" value={`${totals.revenue.toLocaleString('uk-UA')} ₴`} accent="foam" />
        <StatCard label="Помито авто" value={totals.cars} accent="aqua" />
        <StatCard label="Виплати працівникам" value={`${totals.commissions.toLocaleString('uk-UA')} ₴`} accent="amber" hint="Сума % за цей день" />
        <StatCard label="Чистими" value={`${totals.net.toLocaleString('uk-UA')} ₴`} accent="coral" hint="Дохід − виплати − витрати" />
      </div>

      {/* Витрати за день (керуються у вкладці "Витрати") */}
      <Card className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">Витрати за цей день</p>
          <p className="font-mono font-bold text-coral-400 text-lg">{dayExpenses.toLocaleString('uk-UA')} ₴</p>
        </div>
        <p className="text-xs text-slate-500 sm:max-w-[220px] sm:text-right">
          Додавай і редагуй витрати у вкладці «Витрати» — тут вони враховуються автоматично
        </p>
      </Card>

      {/* Список авто за день */}
      {loading ? (
        <Loading />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Car}
          title="За цей день ще немає жодного авто"
          subtitle="Додай перше помите авто, вкажи послугу, ціну і, якщо треба, працівника."
          action={
            <Button onClick={openAddCar}>
              <Plus size={16} /> Додати авто
            </Button>
          }
        />
      ) : (
        <div className="mb-6 space-y-3 md:space-y-0">
          {/* Мобільні картки (< md) */}
          <div className="md:hidden space-y-3">
            {entries.map((e) => (
              <Card key={e.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-slate-200 font-medium truncate">{e.car_brand || e.service}</p>
                    <Badge tone="slate">{e.body_type}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{e.service}</p>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="font-mono text-foam-400 font-semibold">
                      {Number(e.price).toLocaleString('uk-UA')} ₴
                    </span>
                    {e.employee_name_snapshot && (
                      <span className="font-mono text-amber-400 text-xs">
                        {e.employee_name_snapshot}: {Number(e.commission_amount).toLocaleString('uk-UA')} ₴
                      </span>
                    )}
                  </div>
                  {e.price_note && <p className="text-xs text-slate-500 italic mt-1">{e.price_note}</p>}
                </div>
                <button onClick={() => handleDeleteCar(e.id)} className="text-slate-500 hover:text-coral-400 shrink-0">
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
                    <th className="px-5 py-3 font-medium">Авто</th>
                    <th className="px-5 py-3 font-medium">Послуга</th>
                    <th className="px-5 py-3 font-medium">Ціна</th>
                    <th className="px-5 py-3 font-medium">Працівник</th>
                    <th className="px-5 py-3 font-medium">Виплата</th>
                    <th className="px-5 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b border-ink-700/60 last:border-0 hover:bg-ink-700/30">
                      <td className="px-5 py-3 text-slate-200">
                        {e.car_brand || '—'}
                        <div className="mt-0.5"><Badge tone="slate">{e.body_type}</Badge></div>
                      </td>
                      <td className="px-5 py-3 text-slate-400">{e.service}</td>
                      <td className="px-5 py-3 font-mono text-foam-400 font-semibold">
                        {Number(e.price).toLocaleString('uk-UA')} ₴
                        {e.price_note && <div className="text-[11px] text-slate-500 italic font-sans">{e.price_note}</div>}
                      </td>
                      <td className="px-5 py-3 text-slate-300">{e.employee_name_snapshot || '—'}</td>
                      <td className="px-5 py-3 font-mono text-amber-400">
                        {e.employee_name_snapshot
                          ? `${Number(e.commission_amount).toLocaleString('uk-UA')} ₴ (${e.commission_percent_snapshot}%)`
                          : '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => handleDeleteCar(e.id)} className="text-slate-500 hover:text-coral-400">
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
      )}

      {/* Історія попередніх днів */}
      {history.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <p className="px-5 py-3 text-xs font-medium text-slate-500 border-b border-ink-700">
            Останні дні
          </p>
          <div className="divide-y divide-ink-700/60">
            {history.map((d) => (
              <button
                key={d.date}
                onClick={() => setSelectedDate(d.date)}
                className={`w-full flex items-center justify-between px-5 py-3 text-sm hover:bg-ink-700/30 ${
                  d.date === selectedDate ? 'bg-ink-700/40' : ''
                }`}
              >
                <span className="text-slate-300 capitalize">{fmtDate(d.date)}</span>
                <span className="flex items-center gap-4 text-xs">
                  <span className="text-foam-400 font-mono">{Number(d.revenue).toLocaleString('uk-UA')} ₴</span>
                  <span className="text-slate-500">{d.cars_washed} авто</span>
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {modalOpen && (
        <Modal title="Нове авто" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleAddCar} className="space-y-4">
            <Select
              label="Послуга"
              value={form.service}
              onChange={(e) => handleServiceChange(e.target.value)}
            >
              {SERVICES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>

            {form.service !== CARPET_SERVICE && (
              <Input
                label="Марка/модель авто"
                value={form.car_brand}
                onChange={(e) => setForm({ ...form, car_brand: e.target.value })}
                placeholder="Наприклад, Toyota Camry"
              />
            )}

            {form.service !== CARPET_SERVICE && (
              <Select
                label="Тип кузова"
                value={form.body_type}
                onChange={(e) => handleBodyTypeChange(e.target.value)}
              >
                {BODY_TYPES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </Select>
            )}

            {form.service === CARPET_SERVICE && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Довжина, м"
                    type="number"
                    min="0"
                    step="0.1"
                    value={carpetLength}
                    onChange={(e) => handleCarpetFieldChange('length', e.target.value)}
                    placeholder="Наприклад, 2"
                  />
                  <Input
                    label="Ширина, м"
                    type="number"
                    min="0"
                    step="0.1"
                    value={carpetWidth}
                    onChange={(e) => handleCarpetFieldChange('width', e.target.value)}
                    placeholder="Наприклад, 1.5"
                  />
                </div>
                <Select
                  label="Ціна за м² (залежно від забруднення)"
                  value={carpetRate}
                  onChange={(e) => handleCarpetFieldChange('rate', e.target.value)}
                >
                  {CARPET_RATES.map((r) => (
                    <option key={r} value={r}>
                      {r} ₴/м²{r === CARPET_RATES[0] ? ' — звичайні' : r === CARPET_RATES[CARPET_RATES.length - 1] ? ' — дуже брудні' : ' — брудні'}
                    </option>
                  ))}
                </Select>
                {carpetArea > 0 && (
                  <p className="text-xs text-slate-500 -mt-2">
                    Площа: {carpetArea.toFixed(2)} м² × {carpetRate} ₴ = <span className="text-foam-400 font-semibold">{(carpetArea * Number(carpetRate)).toFixed(2)} ₴</span>
                  </p>
                )}
              </>
            )}

            <Input
              label="Ціна, ₴"
              type="number"
              min="0"
              step="0.01"
              required
              value={form.price}
              onChange={(e) => {
                setPriceTouched(true)
                setForm({ ...form, price: e.target.value })
              }}
              placeholder="0"
            />
            <p className="text-xs text-slate-500 -mt-2">
              Ціна підставляється з прайс-листа — зміни її вручну для знижки чи надбавки
            </p>

            <Textarea
              label="Нотатка до ціни (необов'язково)"
              rows={2}
              value={form.price_note}
              onChange={(e) => setForm({ ...form, price_note: e.target.value })}
              placeholder="Наприклад: знижка постійному клієнту, дуже брудне авто..."
            />

            <Select
              label="Працівник (необов'язково)"
              value={form.employee_id}
              onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
            >
              <option value="">Без працівника</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.commission_percent}%)
                </option>
              ))}
            </Select>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'Збереження...' : 'Додати авто'}
            </Button>
          </form>
        </Modal>
      )}

      {priceModalOpen && (
        <PriceListModal
          storeId={storeId}
          priceList={priceList}
          onClose={() => setPriceModalOpen(false)}
          onSaved={loadPriceList}
        />
      )}
    </div>
  )
}

function PriceListModal({ storeId, priceList, onClose, onSaved }) {
  const [values, setValues] = useState(() => {
    const initial = {}
    SERVICES.forEach((s) => {
      BODY_TYPES.forEach((b) => {
        initial[priceKey(s, b)] = priceList[priceKey(s, b)] ?? ''
      })
    })
    return initial
  })
  const [saving, setSaving] = useState(false)

  const handleSaveAll = async () => {
    setSaving(true)
    const rows = []
    SERVICES.forEach((service) => {
      BODY_TYPES.forEach((body_type) => {
        const val = values[priceKey(service, body_type)]
        if (val !== '' && val !== undefined && val !== null) {
          rows.push({ store_id: storeId, service, body_type, price: Number(val) || 0 })
        }
      })
    })
    const { error } = await supabase
      .from('price_list')
      .upsert(rows, { onConflict: 'store_id,service,body_type' })
    setSaving(false)
    if (!error) {
      onSaved()
      onClose()
    } else {
      alert('Помилка збереження прайс-листа: ' + error.message)
    }
  }

  return (
    <Modal title="Прайс-лист" onClose={onClose}>
      <p className="text-xs text-slate-500 mb-4">
        Задай базову ціну для кожної послуги й типу кузова. Порожнє поле — ціна не підставлятиметься автоматично,
        її доведеться вводити вручну.
      </p>
      <div className="space-y-5 max-h-[50vh] overflow-y-auto scrollbar-thin pr-1">
        {SERVICES.map((service) => (
          <div key={service}>
            <p className="text-sm font-semibold text-slate-200 mb-2">{service}</p>
            <div className="grid grid-cols-2 gap-2">
              {BODY_TYPES.map((body) => (
                <label key={body} className="block">
                  <span className="block text-[11px] text-slate-500 mb-1">{body}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={values[priceKey(service, body)]}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [priceKey(service, body)]: e.target.value }))
                    }
                    placeholder="—"
                    className="w-full bg-ink-900 border border-ink-600 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 outline-none focus:border-aqua-400"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Button onClick={handleSaveAll} disabled={saving} className="w-full mt-5">
        {saving ? 'Збереження...' : <><Save size={14} /> Зберегти прайс-лист</>}
      </Button>
    </Modal>
  )
}
