import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil, Boxes, Link2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { SERVICES } from '../../lib/services'
import { PageHeader, Card, Button, Input, Select, Modal, Loading, EmptyState, Badge } from '../ui'

const emptyForm = { name: '', quantity: '', unit: 'л', min_threshold: '', price: '' }
const UNITS = ['л', 'кг', 'шт', 'уп']

const emptyLinkForm = { service: SERVICES[0], warehouse_item_id: '', quantity_per_wash: '' }

export default function Warehouse() {
  const { storeId } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [links, setLinks] = useState([])
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [linkForm, setLinkForm] = useState(emptyLinkForm)
  const [linkSaving, setLinkSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('warehouse_items')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true })
    if (!error) setItems(data ?? [])
    setLoading(false)
  }

  async function loadLinks() {
    const { data } = await supabase
      .from('service_materials')
      .select('id, service, quantity_per_wash, warehouse_item_id, warehouse_items ( name, unit )')
      .eq('store_id', storeId)
      .order('service')
    setLinks(data ?? [])
  }

  useEffect(() => {
    if (storeId) {
      load()
      loadLinks()
    }
  }, [storeId])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setForm({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      min_threshold: item.min_threshold,
      price: item.price ?? '',
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      store_id: storeId,
      name: form.name,
      quantity: Number(form.quantity) || 0,
      unit: form.unit,
      min_threshold: Number(form.min_threshold) || 0,
      price: form.price === '' ? null : Number(form.price),
    }
    const { error } = editingId
      ? await supabase.from('warehouse_items').update(payload).eq('id', editingId)
      : await supabase.from('warehouse_items').insert(payload)

    setSaving(false)
    if (!error) {
      setModalOpen(false)
      load()
    } else {
      alert('Помилка збереження: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Видалити цю позицію зі складу?')) return
    await supabase.from('warehouse_items').delete().eq('id', id)
    load()
  }

  const handleAddLink = async (e) => {
    e.preventDefault()
    if (!linkForm.warehouse_item_id) return
    setLinkSaving(true)
    const { error } = await supabase.from('service_materials').insert({
      store_id: storeId,
      service: linkForm.service,
      warehouse_item_id: linkForm.warehouse_item_id,
      quantity_per_wash: Number(linkForm.quantity_per_wash) || 0,
    })
    setLinkSaving(false)
    if (!error) {
      setLinkModalOpen(false)
      setLinkForm(emptyLinkForm)
      loadLinks()
    } else {
      alert('Помилка збереження: ' + error.message)
    }
  }

  const handleDeleteLink = async (id) => {
    if (!confirm('Прибрати це списання? Матеріал більше не буде автоматично зменшуватись для цієї послуги.')) return
    await supabase.from('service_materials').delete().eq('id', id)
    loadLinks()
  }

  return (
    <div>
      <PageHeader
        title="Склад"
        subtitle="Хімія, витратні матеріали та залишки на складі"
        action={
          <Button onClick={openCreate}>
            <Plus size={16} /> Додати позицію
          </Button>
        }
      />

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Склад порожній"
          subtitle="Додай першу позицію — шампунь, віск, мікрофібру тощо."
          action={
            <Button onClick={openCreate}>
              <Plus size={16} /> Додати позицію
            </Button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const low = Number(item.quantity) <= Number(item.min_threshold)
            return (
              <Card key={item.id} className={low ? 'border-coral-400/40' : ''}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display font-bold text-white">{item.name}</p>
                    <p className="font-mono text-2xl font-bold text-aqua-400 mt-1">
                      {item.quantity} <span className="text-sm text-slate-500">{item.unit}</span>
                    </p>
                  </div>
                  {low ? <Badge tone="coral">Закінчується</Badge> : <Badge tone="foam">В нормі</Badge>}
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  Мінімальний залишок: {item.min_threshold} {item.unit}
                  {item.price != null && <> · Ціна: {item.price} ₴</>}
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <Button variant="ghost" className="flex-1" onClick={() => openEdit(item)}>
                    <Pencil size={14} /> Редагувати
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(item.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Автосписання матеріалів на послуги */}
      <div className="mt-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display font-bold text-white flex items-center gap-2">
              <Link2 size={16} className="text-aqua-400" /> Списання матеріалів на послуги
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Коли додаєш авто з цією послугою в "Робочому дні" — вказана кількість спишеться зі складу сама
            </p>
          </div>
          <Button variant="ghost" onClick={() => setLinkModalOpen(true)} className="shrink-0">
            <Plus size={16} /> Прив'язати
          </Button>
        </div>

        {links.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-sm text-slate-500">
              Ще нічого не прив'язано — авто додаватимуться без автоматичного списання складу.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {links.map((l) => (
              <Card key={l.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-slate-200">
                    <span className="font-semibold">{l.service}</span>
                    <span className="text-slate-500"> → </span>
                    {l.warehouse_items?.name || 'видалена позиція'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    −{l.quantity_per_wash} {l.warehouse_items?.unit} за кожне авто
                  </p>
                </div>
                <button onClick={() => handleDeleteLink(l.id)} className="text-slate-500 hover:text-coral-400 shrink-0">
                  <Trash2 size={16} />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title={editingId ? 'Редагувати позицію' : 'Нова позиція'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Назва"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Наприклад, Автошампунь Х7"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Кількість"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
              <label className="block">
                <span className="block text-xs font-medium text-slate-400 mb-1.5">Одиниця</span>
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full bg-ink-900 border border-ink-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-aqua-400"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </label>
            </div>
            <Input
              label="Мінімальний залишок (поріг сповіщення)"
              type="number"
              min="0"
              step="0.01"
              required
              value={form.min_threshold}
              onChange={(e) => setForm({ ...form, min_threshold: e.target.value })}
            />
            <Input
              label="Ціна за одиницю, ₴ (необов'язково)"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'Збереження...' : 'Зберегти'}
            </Button>
          </form>
        </Modal>
      )}

      {linkModalOpen && (
        <Modal title="Прив'язати матеріал до послуги" onClose={() => setLinkModalOpen(false)}>
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">
              Спочатку додай хоча б одну позицію на складі — тоді зможеш прив'язати її до послуги.
            </p>
          ) : (
            <form onSubmit={handleAddLink} className="space-y-4">
              <Select
                label="Послуга"
                value={linkForm.service}
                onChange={(e) => setLinkForm({ ...linkForm, service: e.target.value })}
              >
                {SERVICES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
              <Select
                label="Матеріал зі складу"
                required
                value={linkForm.warehouse_item_id}
                onChange={(e) => setLinkForm({ ...linkForm, warehouse_item_id: e.target.value })}
              >
                <option value="">Обери позицію...</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                ))}
              </Select>
              <Input
                label="Скільки списувати за 1 миття"
                type="number"
                min="0"
                step="0.001"
                required
                value={linkForm.quantity_per_wash}
                onChange={(e) => setLinkForm({ ...linkForm, quantity_per_wash: e.target.value })}
                placeholder="Наприклад, 0.3"
              />
              <Button type="submit" disabled={linkSaving} className="w-full">
                {linkSaving ? 'Збереження...' : "Прив'язати"}
              </Button>
            </form>
          )}
        </Modal>
      )}
    </div>
  )
}
