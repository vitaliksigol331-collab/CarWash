import { useEffect, useState } from 'react'
import { Plus, Trash2, CalendarClock, Check, X as XIcon } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { PageHeader, Card, Button, Input, Select, Modal, Loading, EmptyState, Badge } from '../ui'
import { SERVICES } from '../../lib/services'

const emptyForm = {
  client_name: '',
  phone: '',
  service: 'Комплексне миття',
  booking_date: new Date().toISOString().slice(0, 10),
  booking_time: '10:00',
}

const STATUS_TONE = { 'заплановано': 'aqua', 'виконано': 'foam', 'скасовано': 'coral' }

export default function Booking() {
  const { storeId } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('store_id', storeId)
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true })
    if (!error) setBookings(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (storeId) load()
  }, [storeId])

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('bookings').insert({
      store_id: storeId,
      client_name: form.client_name,
      phone: form.phone || null,
      service: form.service,
      booking_date: form.booking_date,
      booking_time: form.booking_time,
      status: 'заплановано',
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

  const setStatus = async (id, status) => {
    await supabase.from('bookings').update({ status }).eq('id', id)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Видалити запис?')) return
    await supabase.from('bookings').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <PageHeader
        title="Запис"
        subtitle="Розклад бронювань клієнтів на мийку"
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Новий запис
          </Button>
        }
      />

      {loading ? (
        <Loading />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Записів ще немає"
          subtitle="Створи перший запис, щоб бачити розклад дня."
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={16} /> Новий запис
            </Button>
          }
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="divide-y divide-ink-700/60">
            {bookings.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="w-16 shrink-0 text-center">
                  <p className="font-mono font-bold text-white text-sm">{b.booking_time?.slice(0, 5)}</p>
                  <p className="text-[11px] text-slate-500">
                    {new Date(b.booking_date).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })}
                  </p>
                </div>

                <div className="flex-1 min-w-[160px]">
                  <p className="font-medium text-white text-sm">{b.client_name}</p>
                  <p className="text-xs text-slate-500">{b.service}{b.phone ? ` · ${b.phone}` : ''}</p>
                </div>

                <Badge tone={STATUS_TONE[b.status] || 'slate'}>{b.status}</Badge>

                <div className="flex items-center gap-1.5">
                  {b.status === 'заплановано' && (
                    <>
                      <button
                        title="Позначити виконаним"
                        onClick={() => setStatus(b.id, 'виконано')}
                        className="p-2 rounded-lg text-slate-500 hover:text-foam-400 hover:bg-ink-700"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        title="Скасувати"
                        onClick={() => setStatus(b.id, 'скасовано')}
                        className="p-2 rounded-lg text-slate-500 hover:text-coral-400 hover:bg-ink-700"
                      >
                        <XIcon size={16} />
                      </button>
                    </>
                  )}
                  <button
                    title="Видалити"
                    onClick={() => handleDelete(b.id)}
                    className="p-2 rounded-lg text-slate-500 hover:text-coral-400 hover:bg-ink-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {modalOpen && (
        <Modal title="Новий запис" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <Input
              label="Ім'я клієнта"
              required
              value={form.client_name}
              onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              placeholder="Наприклад, Марія"
            />
            <Input
              label="Телефон"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+380..."
            />
            <Select
              label="Послуга"
              value={form.service}
              onChange={(e) => setForm({ ...form, service: e.target.value })}
            >
              {SERVICES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Дата"
                type="date"
                required
                value={form.booking_date}
                onChange={(e) => setForm({ ...form, booking_date: e.target.value })}
              />
              <Input
                label="Час"
                type="time"
                required
                value={form.booking_time}
                onChange={(e) => setForm({ ...form, booking_time: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'Збереження...' : 'Записати'}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  )
}
