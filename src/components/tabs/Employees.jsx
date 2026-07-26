import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil, UserCog, Wallet, Car as CarIcon } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { POSITIONS } from '../../lib/services'
import { PERIODS, periodStartDate } from '../../lib/period'
import {
  PageHeader, Card, StatCard, Button, Input, Select, Modal, Loading, EmptyState, Badge, PeriodSelector,
} from '../ui'

const emptyForm = { name: '', phone: '', commission_percent: '', position: POSITIONS[0], customPosition: '' }

export default function Employees() {
  const { storeId } = useAuth()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [detailEmployee, setDetailEmployee] = useState(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('store_id', storeId)
      .order('name')
    if (!error) setEmployees(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (storeId) load()
  }, [storeId])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (emp) => {
    setEditingId(emp.id)
    const isPreset = POSITIONS.includes(emp.position)
    setForm({
      name: emp.name,
      phone: emp.phone || '',
      commission_percent: emp.commission_percent,
      position: isPreset ? emp.position : 'Інше',
      customPosition: isPreset ? '' : (emp.position || ''),
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const finalPosition = form.position === 'Інше' ? (form.customPosition || 'Інше') : form.position
    const payload = {
      store_id: storeId,
      name: form.name,
      phone: form.phone || null,
      commission_percent: Number(form.commission_percent) || 0,
      position: finalPosition,
    }
    const { error } = editingId
      ? await supabase.from('employees').update(payload).eq('id', editingId)
      : await supabase.from('employees').insert(payload)

    setSaving(false)
    if (!error) {
      setModalOpen(false)
      load()
    } else {
      alert('Помилка збереження: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Видалити працівника? Його минулі записи про авто залишаться в історії.')) return
    await supabase.from('employees').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <PageHeader
        title="Працівники"
        subtitle="Додавай працівників, посаду і відсоток, який вони отримують від кожного авто"
        action={
          <Button onClick={openCreate}>
            <Plus size={16} /> Додати працівника
          </Button>
        }
      />

      {loading ? (
        <Loading />
      ) : employees.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="Ще немає працівників"
          subtitle='Додай першого працівника — його можна буде обрати у вкладці "Робочий день" при додаванні авто.'
          action={
            <Button onClick={openCreate}>
              <Plus size={16} /> Додати працівника
            </Button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <Card key={emp.id} className={!emp.active ? 'opacity-50' : ''}>
              <button className="text-left w-full" onClick={() => setDetailEmployee(emp)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display font-bold text-white">{emp.name}</p>
                    {emp.position && <p className="text-xs text-aqua-400 mt-0.5">{emp.position}</p>}
                    {emp.phone && <p className="text-xs text-slate-500 mt-0.5">{emp.phone}</p>}
                  </div>
                  <Badge tone="amber">{emp.commission_percent}%</Badge>
                </div>
                <p className="text-xs text-aqua-400 mt-3">Натисни, щоб побачити статистику →</p>
              </button>

              <div className="flex items-center gap-2 mt-4">
                <Button variant="ghost" className="flex-1" onClick={() => openEdit(emp)}>
                  <Pencil size={14} /> Редагувати
                </Button>
                <Button variant="danger" onClick={() => handleDelete(emp.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal title={editingId ? 'Редагувати працівника' : 'Новий працівник'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Ім'я працівника"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Наприклад, Віталій"
            />
            <Select
              label="Посада"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
            >
              {POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
            {form.position === 'Інше' && (
              <Input
                label="Вкажи посаду"
                required
                value={form.customPosition}
                onChange={(e) => setForm({ ...form, customPosition: e.target.value })}
                placeholder="Наприклад, Менеджер з якості"
              />
            )}
            <Input
              label="Телефон (необов'язково)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+380..."
            />
            <Input
              label="Відсоток від кожного авто, %"
              type="number"
              min="0"
              max="100"
              step="0.5"
              required
              value={form.commission_percent}
              onChange={(e) => setForm({ ...form, commission_percent: e.target.value })}
              placeholder="Наприклад, 30"
            />
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'Збереження...' : 'Зберегти'}
            </Button>
          </form>
        </Modal>
      )}

      {detailEmployee && (
        <EmployeeDetail
          employee={detailEmployee}
          storeId={storeId}
          onClose={() => setDetailEmployee(null)}
        />
      )}
    </div>
  )
}

function EmployeeDetail({ employee, storeId, onClose }) {
  const [period, setPeriod] = useState('week')
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState([])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const from = periodStartDate(period)
      let query = supabase
        .from('car_entries')
        .select('*')
        .eq('store_id', storeId)
        .eq('employee_id', employee.id)
        .order('entry_date', { ascending: false })
      if (from) query = query.gte('entry_date', from)
      const { data } = await query
      if (!active) return
      setEntries(data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [period, employee.id, storeId])

  const totalEarned = entries.reduce((s, e) => s + Number(e.commission_amount || 0), 0)
  const totalRevenue = entries.reduce((s, e) => s + Number(e.price || 0), 0)
  const totalCars = entries.length

  return (
    <Modal title={employee.name} onClose={onClose}>
      {employee.position && (
        <p className="text-xs text-aqua-400 -mt-3 mb-4">{employee.position}</p>
      )}

      <div className="mb-5">
        <PeriodSelector periods={PERIODS} value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-1 gap-3 mb-5">
        <StatCard label="Заробив" value={`${totalEarned.toLocaleString('uk-UA')} ₴`} accent="amber" />
        <StatCard label="Помив авто" value={totalCars} accent="aqua" />
        <StatCard label="Приніс доходу" value={`${totalRevenue.toLocaleString('uk-UA')} ₴`} accent="foam" />
      </div>

      {loading ? (
        <Loading />
      ) : entries.length === 0 ? (
        <p className="text-center text-sm text-slate-500 py-8">
          За цей період у {employee.name} ще немає жодного авто.
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between bg-ink-900 border border-ink-600 rounded-xl px-3.5 py-2.5 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <CarIcon size={14} className="text-slate-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-slate-200 truncate">{e.car_brand || e.service}</p>
                  <p className="text-[11px] text-slate-500">
                    {new Date(e.entry_date + 'T00:00:00').toLocaleDateString('uk-UA')} · {e.service}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-mono text-amber-400 flex items-center gap-1 justify-end whitespace-nowrap">
                  <Wallet size={12} /> {Number(e.commission_amount).toLocaleString('uk-UA')} ₴
                </p>
                <p className="text-[11px] text-slate-500 whitespace-nowrap">з {Number(e.price).toLocaleString('uk-UA')} ₴</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
