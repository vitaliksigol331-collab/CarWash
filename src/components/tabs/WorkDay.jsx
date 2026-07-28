import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Car, ChevronLeft, ChevronRight, ChevronDown, Tag, Save, Check } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { SERVICES, BODY_TYPES } from '../../lib/services'
import {
  PageHeader, Card, StatCard, Button, Input, Select, Textarea, Modal, Loading, EmptyState, Badge,
} from '../ui'

const todayISO = () => new Date().toISOString().slice(0, 10)

const CARPET_SERVICE = 'Мийка килимків'
const CARPET_RATES = [100, 125, 150]

const emptyForm = {
  car_brand: '',
  body_type: BODY_TYPES[0],
  price_note: '',
  employee_ids: [],
}

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
  const [servicesByEntry, setServicesByEntry] = useState({}) // { car_entry_id: [{service, price}] }
  const [employeesByEntry, setEmployeesByEntry] = useState({}) // { car_entry_id: [{name, percent, amount}] }
  const [employees, setEmployees] = useState([])
  const [history, setHistory] = useState([])
  const [dayExpenses, setDayExpenses] = useState(0)
  const [priceList, setPriceList] = useState({}) // { "service|bodyType": price }
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [priceModalOpen, setPriceModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)

  // Обрані послуги для нового авто: { [service]: priceString }
  const [selectedServices, setSelectedServices] = useState({})
  const [touchedPrices, setTouchedPrices] = useState({}) // { [service]: true } — щоб не перезаписувати ручну ціну
  const [carpetLength, setCarpetLength] = useState('')
  const [carpetWidth, setCarpetWidth] = useState('')
  const [carpetRate, setCarpetRate] = useState(String(CARPET_RATES[0]))
  const [servicesPickerOpen, setServicesPickerOpen] = useState(false)
  const [employeesPickerOpen, setEmployeesPickerOpen] = useState(false)
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
    const [
      { data: dayEntries },
      { data: entryServices },
      { data: entryEmployees },
      { data: expenseRows },
      { data: historyRows },
    ] = await Promise.all([
      supabase
        .from('car_entries')
        .select('*')
        .eq('store_id', storeId)
        .eq('entry_date', date)
        .order('created_at', { ascending: false }),
      supabase
        .from('car_entry_services')
        .select('car_entry_id, service, price')
        .eq('store_id', storeId)
        .eq('entry_date', date),
      supabase
        .from('car_entry_employees')
        .select('car_entry_id, employee_name_snapshot, commission_percent_snapshot, commission_amount')
        .eq('store_id', storeId)
        .eq('entry_date', date),
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

    const servicesGrouped = {}
    ;(entryServices ?? []).forEach((row) => {
      if (!servicesGrouped[row.car_entry_id]) servicesGrouped[row.car_entry_id] = []
      servicesGrouped[row.car_entry_id].push(row)
    })
    setServicesByEntry(servicesGrouped)

    const employeesGrouped = {}
    ;(entryEmployees ?? []).forEach((row) => {
      if (!employeesGrouped[row.car_entry_id]) employeesGrouped[row.car_entry_id] = []
      employeesGrouped[row.car_entry_id].push(row)
    })
    setEmployeesByEntry(employeesGrouped)

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
    const commissions = Object.values(employeesByEntry)
      .flat()
      .reduce((s, row) => s + Number(row.commission_amount || 0), 0)
    const cars = entries.length
    return { revenue, commissions, cars, net: revenue - commissions - dayExpenses }
  }, [entries, employeesByEntry, dayExpenses])

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
    setForm(emptyForm)
    setSelectedServices({})
    setTouchedPrices({})
    setCarpetLength('')
    setCarpetWidth('')
    setCarpetRate(String(CARPET_RATES[0]))
    setServicesPickerOpen(false)
    setEmployeesPickerOpen(false)
    setModalOpen(true)
  }

  const toggleService = (service) => {
    setSelectedServices((prev) => {
      const next = { ...prev }
      if (service in next) {
        delete next[service]
        setTouchedPrices((t) => {
          const nt = { ...t }
          delete nt[service]
          return nt
        })
        if (service === CARPET_SERVICE) {
          setCarpetLength('')
          setCarpetWidth('')
          setCarpetRate(String(CARPET_RATES[0]))
        }
      } else {
        next[service] = service === CARPET_SERVICE ? '' : priceFor(service, form.body_type)
      }
      return next
    })
  }

  const handleServicePriceChange = (service, value) => {
    setTouchedPrices((t) => ({ ...t, [service]: true }))
    setSelectedServices((prev) => ({ ...prev, [service]: value }))
  }

  const handleBodyTypeChange = (newBodyType) => {
    setForm((f) => ({ ...f, body_type: newBodyType }))
    // оновлюємо ціну лише для послуг, які користувач ще не редагував вручну
    setSelectedServices((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((service) => {
        if (service !== CARPET_SERVICE && !touchedPrices[service]) {
          next[service] = priceFor(service, newBodyType)
        }
      })
      return next
    })
  }

  const handleCarpetFieldChange = (field, value) => {
    const next = { length: carpetLength, width: carpetWidth, rate: carpetRate, [field]: value }
    if (field === 'length') setCarpetLength(value)
    if (field === 'width') setCarpetWidth(value)
    if (field === 'rate') setCarpetRate(value)
    if (!touchedPrices[CARPET_SERVICE]) {
      setSelectedServices((prev) => ({ ...prev, [CARPET_SERVICE]: carpetPrice(next.length, next.width, next.rate) }))
    }
  }

  const carpetArea = (Number(carpetLength) || 0) * (Number(carpetWidth) || 0)

  const totalPrice = useMemo(
    () => Object.values(selectedServices).reduce((s, v) => s + (Number(v) || 0), 0),
    [selectedServices]
  )

  const toggleEmployee = (id) => {
    setForm((f) => {
      const has = f.employee_ids.includes(id)
      return {
        ...f,
        employee_ids: has ? f.employee_ids.filter((x) => x !== id) : [...f.employee_ids, id],
      }
    })
  }

  const handleAddCar = async (e) => {
    e.preventDefault()
    const chosenServices = Object.entries(selectedServices)
    if (chosenServices.length === 0) {
      alert('Обери хоча б одну послугу')
      return
    }
    setSaving(true)

    const { data: inserted, error } = await supabase
      .from('car_entries')
      .insert({
        store_id: storeId,
        entry_date: selectedDate,
        service: chosenServices[0][0],
        car_brand: form.car_brand || null,
        body_type: form.body_type,
        price: totalPrice,
        price_note: form.price_note || null,
      })
      .select()
      .single()

    if (error) {
      setSaving(false)
      alert('Помилка збереження: ' + error.message)
      return
    }

    const serviceRows = chosenServices.map(([service, price]) => ({
      store_id: storeId,
      car_entry_id: inserted.id,
      entry_date: selectedDate,
      service,
      price: Number(price) || 0,
    }))
    const { error: servicesError } = await supabase.from('car_entry_services').insert(serviceRows)
    if (servicesError) {
      setSaving(false)
      alert('Помилка збереження послуг: ' + servicesError.message)
      return
    }

    if (form.employee_ids.length > 0) {
      const employeeRows = form.employee_ids.map((empId) => {
        const emp = employees.find((x) => x.id === empId)
        return {
          store_id: storeId,
          car_entry_id: inserted.id,
          entry_date: selectedDate,
          employee_id: emp?.id || null,
          employee_name_snapshot: emp?.name || null,
          commission_percent_snapshot: emp?.commission_percent || 0,
          commission_amount: Number(((totalPrice * (emp?.commission_percent || 0)) / 100).toFixed(2)),
        }
      })
      const { error: empError } = await supabase.from('car_entry_employees').insert(employeeRows)
      if (empError) {
        alert('Авто збережено, але не вдалось прив\'язати працівників: ' + empError.message)
      }
    }

    setSaving(false)
    setModalOpen(false)
    loadDay(selectedDate)
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
          subtitle="Додай перше помите авто, обери одну чи кілька послуг і, якщо треба, працівників."
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
            {entries.map((e) => {
              const empRows = employeesByEntry[e.id] || []
              const svcRows = servicesByEntry[e.id] || []
              return (
                <Card key={e.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-slate-200 font-medium truncate">{e.car_brand || svcRows[0]?.service || e.service}</p>
                      <Badge tone="slate">{e.body_type}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {svcRows.map((s, i) => (
                        <span key={i} className="text-xs text-slate-500">
                          {s.service} ({Number(s.price).toLocaleString('uk-UA')} ₴){i < svcRows.length - 1 ? ',' : ''}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-sm">
                      <span className="font-mono text-foam-400 font-semibold">
                        {Number(e.price).toLocaleString('uk-UA')} ₴ разом
                      </span>
                    </div>
                    {empRows.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {empRows.map((row, i) => (
                          <span key={i} className="text-[11px] font-mono text-amber-400 bg-amber-400/10 rounded-md px-1.5 py-0.5">
                            {row.employee_name_snapshot}: {Number(row.commission_amount).toLocaleString('uk-UA')} ₴
                          </span>
                        ))}
                      </div>
                    )}
                    {e.price_note && <p className="text-xs text-slate-500 italic mt-1">{e.price_note}</p>}
                  </div>
                  <button onClick={() => handleDeleteCar(e.id)} className="text-slate-500 hover:text-coral-400 shrink-0">
                    <Trash2 size={16} />
                  </button>
                </Card>
              )
            })}
          </div>

          {/* Таблиця (>= md) */}
          <Card className="hidden md:block p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-ink-700">
                    <th className="px-5 py-3 font-medium">Авто</th>
                    <th className="px-5 py-3 font-medium">Послуги</th>
                    <th className="px-5 py-3 font-medium">Разом</th>
                    <th className="px-5 py-3 font-medium">Працівники</th>
                    <th className="px-5 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => {
                    const empRows = employeesByEntry[e.id] || []
                    const svcRows = servicesByEntry[e.id] || []
                    return (
                      <tr key={e.id} className="border-b border-ink-700/60 last:border-0 hover:bg-ink-700/30">
                        <td className="px-5 py-3 text-slate-200">
                          {e.car_brand || '—'}
                          <div className="mt-0.5"><Badge tone="slate">{e.body_type}</Badge></div>
                        </td>
                        <td className="px-5 py-3 text-slate-400">
                          <div className="flex flex-col gap-0.5">
                            {svcRows.map((s, i) => (
                              <span key={i} className="text-xs whitespace-nowrap">
                                {s.service} — <span className="text-slate-500">{Number(s.price).toLocaleString('uk-UA')} ₴</span>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3 font-mono text-foam-400 font-semibold align-top">
                          {Number(e.price).toLocaleString('uk-UA')} ₴
                          {e.price_note && <div className="text-[11px] text-slate-500 italic font-sans">{e.price_note}</div>}
                        </td>
                        <td className="px-5 py-3 align-top">
                          {empRows.length === 0 ? (
                            <span className="text-slate-500">—</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {empRows.map((row, i) => (
                                <span key={i} className="font-mono text-amber-400 text-xs whitespace-nowrap">
                                  {row.employee_name_snapshot}: {Number(row.commission_amount).toLocaleString('uk-UA')} ₴
                                  <span className="text-slate-500"> ({row.commission_percent_snapshot}%)</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right align-top">
                          <button onClick={() => handleDeleteCar(e.id)} className="text-slate-500 hover:text-coral-400">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
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
            <Input
              label="Марка/модель авто (необов'язково)"
              value={form.car_brand}
              onChange={(e) => setForm({ ...form, car_brand: e.target.value })}
              placeholder="Наприклад, Toyota Camry"
            />

            <Select
              label="Тип кузова"
              value={form.body_type}
              onChange={(e) => handleBodyTypeChange(e.target.value)}
            >
              {BODY_TYPES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </Select>

            <div>
              <span className="block text-xs font-medium text-slate-400 mb-1.5">
                Послуги
              </span>
              <button
                type="button"
                onClick={() => setServicesPickerOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 bg-ink-900 border border-ink-600 rounded-xl px-3.5 py-2.5 text-sm text-left"
              >
                <span className={Object.keys(selectedServices).length ? 'text-slate-100' : 'text-slate-600'}>
                  {Object.keys(selectedServices).length
                    ? Object.keys(selectedServices).join(', ')
                    : 'Обери одну чи кілька послуг'}
                </span>
                <ChevronDown size={16} className={`shrink-0 text-slate-500 transition-transform ${servicesPickerOpen ? 'rotate-180' : ''}`} />
              </button>

              {servicesPickerOpen && (
                <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                  {SERVICES.map((service) => {
                    const checked = service in selectedServices
                    return (
                      <button
                        type="button"
                        key={service}
                        onClick={() => toggleService(service)}
                        className={`w-full flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
                          checked
                            ? 'bg-aqua-400/10 border-aqua-400/40 text-white'
                            : 'bg-ink-900 border-ink-600 text-slate-300 hover:border-ink-500'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                          checked ? 'bg-aqua-400 border-aqua-400' : 'border-ink-500'
                        }`}>
                          {checked && <Check size={12} className="text-ink-950" />}
                        </span>
                        {service}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Поля цін для обраних послуг — завжди видно, навіть коли список згорнутий */}
              {Object.keys(selectedServices).length > 0 && (
                <div className="mt-3 space-y-3">
                  {Object.keys(selectedServices).map((service) => (
                    <div key={service} className="pl-2 border-l-2 border-aqua-400/30">
                      {service === CARPET_SERVICE ? (
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-slate-300">{service}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              label="Довжина, м"
                              type="number"
                              min="0"
                              step="0.1"
                              value={carpetLength}
                              onChange={(e) => handleCarpetFieldChange('length', e.target.value)}
                              placeholder="2"
                            />
                            <Input
                              label="Ширина, м"
                              type="number"
                              min="0"
                              step="0.1"
                              value={carpetWidth}
                              onChange={(e) => handleCarpetFieldChange('width', e.target.value)}
                              placeholder="1.5"
                            />
                          </div>
                          <Select
                            label="Ціна за м²"
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
                            <p className="text-xs text-slate-500">
                              Площа: {carpetArea.toFixed(2)} м² × {carpetRate} ₴ = <span className="text-foam-400 font-semibold">{selectedServices[CARPET_SERVICE]} ₴</span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <Input
                          label={`Ціна за "${service}", ₴`}
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={selectedServices[service]}
                          onChange={(e) => handleServicePriceChange(service, e.target.value)}
                          placeholder="0"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {Object.keys(selectedServices).length > 0 && (
              <div className="flex items-center justify-between bg-ink-900 border border-ink-600 rounded-xl px-3.5 py-2.5">
                <span className="text-xs text-slate-400">Загальна ціна</span>
                <span className="font-mono font-bold text-foam-400">{totalPrice.toLocaleString('uk-UA')} ₴</span>
              </div>
            )}

            <Textarea
              label="Нотатка до ціни (необов'язково)"
              rows={2}
              value={form.price_note}
              onChange={(e) => setForm({ ...form, price_note: e.target.value })}
              placeholder="Наприклад: знижка постійному клієнту, дуже брудне авто..."
            />

            <div>
              <span className="block text-xs font-medium text-slate-400 mb-1.5">
                Працівники
              </span>
              {employees.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Ще немає жодного працівника — додай у вкладці "Працівники".
                </p>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setEmployeesPickerOpen((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 bg-ink-900 border border-ink-600 rounded-xl px-3.5 py-2.5 text-sm text-left"
                  >
                    <span className={form.employee_ids.length ? 'text-slate-100' : 'text-slate-600'}>
                      {form.employee_ids.length
                        ? employees.filter((e) => form.employee_ids.includes(e.id)).map((e) => e.name).join(', ')
                        : 'Обери одного чи кількох працівників'}
                    </span>
                    <ChevronDown size={16} className={`shrink-0 text-slate-500 transition-transform ${employeesPickerOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {employeesPickerOpen && (
                    <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                      {employees.map((emp) => {
                        const checked = form.employee_ids.includes(emp.id)
                        return (
                          <button
                            type="button"
                            key={emp.id}
                            onClick={() => toggleEmployee(emp.id)}
                            className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
                              checked
                                ? 'bg-aqua-400/10 border-aqua-400/40 text-white'
                                : 'bg-ink-900 border-ink-600 text-slate-300 hover:border-ink-500'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                checked ? 'bg-aqua-400 border-aqua-400' : 'border-ink-500'
                              }`}>
                                {checked && <Check size={12} className="text-ink-950" />}
                              </span>
                              {emp.name}
                            </span>
                            <span className="text-xs text-slate-500">{emp.commission_percent}%</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
              {form.employee_ids.length > 1 && (
                <p className="text-xs text-slate-500 mt-1.5">
                  Кожен обраний працівник отримає свій % від загальної ціни цього авто.
                </p>
              )}
            </div>

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
