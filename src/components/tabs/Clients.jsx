import { useEffect, useState } from 'react'
import { Plus, Trash2, Users, PlusCircle, Phone } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { PageHeader, Card, Button, Input, Textarea, Modal, Loading, EmptyState, Badge } from '../ui'

const emptyForm = { name: '', phone: '', car_model: '', notes: '' }

export default function Clients() {
  const { storeId } = useAuth()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
    if (!error) setClients(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (storeId) load()
  }, [storeId])

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('clients').insert({
      store_id: storeId,
      name: form.name,
      phone: form.phone || null,
      car_model: form.car_model || null,
      notes: form.notes || null,
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
    if (!confirm('Видалити клієнта?')) return
    await supabase.from('clients').delete().eq('id', id)
    load()
  }

  const handleVisit = async (client) => {
    await supabase
      .from('clients')
      .update({ visits_count: (client.visits_count || 0) + 1 })
      .eq('id', client.id)
    load()
  }

  return (
    <div>
      <PageHeader
        title="Клієнти"
        subtitle="База клієнтів та історія їхніх відвідувань"
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Додати клієнта
          </Button>
        }
      />

      {loading ? (
        <Loading />
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Ще немає клієнтів"
          subtitle="Додай першого клієнта, щоб відстежувати відвідування та контакти."
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={16} /> Додати клієнта
            </Button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display font-bold text-white truncate">{c.name}</p>
                  {c.car_model && <p className="text-xs text-slate-500 mt-0.5">{c.car_model}</p>}
                </div>
                <Badge tone="aqua">{c.visits_count || 0} відвідувань</Badge>
              </div>

              {c.phone && (
                <p className="flex items-center gap-1.5 text-sm text-slate-400 mt-3">
                  <Phone size={13} /> {c.phone}
                </p>
              )}
              {c.notes && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{c.notes}</p>}

              <div className="flex items-center gap-2 mt-4">
                <Button variant="ghost" className="flex-1" onClick={() => handleVisit(c)}>
                  <PlusCircle size={14} /> Відмітити візит
                </Button>
                <Button variant="danger" onClick={() => handleDelete(c.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal title="Новий клієнт" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <Input
              label="Ім'я клієнта"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Наприклад, Олександр"
            />
            <Input
              label="Телефон"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+380..."
            />
            <Input
              label="Марка/модель авто"
              value={form.car_model}
              onChange={(e) => setForm({ ...form, car_model: e.target.value })}
              placeholder="Наприклад, Toyota Camry"
            />
            <Textarea
              label="Нотатки"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Побажання, особливості авто..."
            />
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'Збереження...' : 'Зберегти клієнта'}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  )
}
