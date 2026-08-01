import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { Wallet, TrendingUp, PackageX, Target, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { PERIODS, getPeriodRange } from '../../lib/period'
import { PageHeader, StatCard, Card, Button, Input, Modal, Loading, EmptyState, PeriodSelector } from '../ui'

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function Overview({ onNavigate }) {
  const { storeId } = useAuth()
  const [period, setPeriod] = useState('month')
  const [periodOffset, setPeriodOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [chartRows, setChartRows] = useState([])
  const [stats, setStats] = useState({ revenue: 0, cars: 0, commissions: 0, expenses: 0 })
  const [lowStockCount, setLowStockCount] = useState(0)
  const [upcomingCount, setUpcomingCount] = useState(0)

  const [dailyGoal, setDailyGoal] = useState(null)
  const [todayCars, setTodayCars] = useState(0)
  const [goalModalOpen, setGoalModalOpen] = useState(false)

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod)
    setPeriodOffset(0)
  }

  const range = getPeriodRange(period, periodOffset)

  useEffect(() => {
    if (!storeId) return
    let active = true

    async function load() {
      setLoading(true)
      const { from, to } = range

      let carsQuery = supabase
        .from('car_entries')
        .select('price, entry_date')
        .eq('store_id', storeId)
      if (from) carsQuery = carsQuery.gte('entry_date', from)
      if (to) carsQuery = carsQuery.lte('entry_date', to)

      let commissionsQuery = supabase
        .from('car_entry_employees')
        .select('commission_amount, entry_date')
        .eq('store_id', storeId)
      if (from) commissionsQuery = commissionsQuery.gte('entry_date', from)
      if (to) commissionsQuery = commissionsQuery.lte('entry_date', to)

      let expensesQuery = supabase
        .from('expense_entries')
        .select('amount')
        .eq('store_id', storeId)
      if (from) expensesQuery = expensesQuery.gte('expense_date', from)
      if (to) expensesQuery = expensesQuery.lte('expense_date', to)

      const [
        { data: cars },
        { data: commissionRows },
        { data: expenseRows },
        { data: chartDays },
        { data: items },
        { data: bookings },
      ] = await Promise.all([
        carsQuery,
        commissionsQuery,
        expensesQuery,
        supabase
          .from('work_days')
          .select('date, revenue')
          .eq('store_id', storeId)
          .order('date', { ascending: false })
          .limit(14),
        supabase.from('warehouse_items').select('id, quantity, min_threshold').eq('store_id', storeId),
        supabase
          .from('bookings')
          .select('id')
          .eq('store_id', storeId)
          .eq('status', 'заплановано'),
      ])

      if (!active) return

      const revenue = (cars ?? []).reduce((s, c) => s + Number(c.price || 0), 0)
      const commissions = (commissionRows ?? []).reduce((s, c) => s + Number(c.commission_amount || 0), 0)
      const expenses = (expenseRows ?? []).reduce((s, e) => s + Number(e.amount || 0), 0)

      setStats({ revenue, cars: (cars ?? []).length, commissions, expenses })
      setChartRows((chartDays ?? []).slice().reverse())
      setLowStockCount((items ?? []).filter((i) => Number(i.quantity) <= Number(i.min_threshold)).length)
      setUpcomingCount((bookings ?? []).length)
      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [storeId, period, periodOffset])

  async function loadGoalProgress() {
    const [{ data: store }, { data: todayEntries }] = await Promise.all([
      supabase.from('stores').select('daily_car_goal').eq('id', storeId).single(),
      supabase.from('car_entries').select('id').eq('store_id', storeId).eq('entry_date', todayISO()),
    ])
    setDailyGoal(store?.daily_car_goal ?? null)
    setTodayCars((todayEntries ?? []).length)
  }

  useEffect(() => {
    if (storeId) loadGoalProgress()
  }, [storeId])

  if (loading) return <Loading />

  const avgCheck = stats.cars > 0 ? (stats.revenue / stats.cars).toFixed(0) : 0
  const netProfit = stats.revenue - stats.commissions - stats.expenses
  const netMargin = stats.revenue > 0 ? (netProfit / stats.revenue) * 100 : 0

  const chartData = chartRows.map((d) => ({
    date: new Date(d.date).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }),
    revenue: Number(d.revenue || 0),
  }))

  return (
    <div>
      <PageHeader
        title="Огляд"
        subtitle="Статистика твого робочого простору за обраний період"
        action={<PeriodSelector periods={PERIODS} value={period} onChange={handlePeriodChange} />}
      />

      {period !== 'all' && (
        <Card className="flex items-center justify-between gap-2 mb-4 py-2.5">
          <button
            onClick={() => setPeriodOffset((o) => o + 1)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-ink-700 hover:text-white shrink-0"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-slate-200 text-center truncate">{range.label}</span>
          <button
            onClick={() => setPeriodOffset((o) => Math.max(0, o - 1))}
            disabled={periodOffset === 0}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-ink-700 hover:text-white disabled:opacity-30 shrink-0"
          >
            <ChevronRight size={18} />
          </button>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Дохід" value={`${stats.revenue.toLocaleString('uk-UA')} ₴`} accent="foam" hint="Сума за обраний період" />
        <StatCard label="Помито авто" value={stats.cars} accent="aqua" />
        <StatCard label="Середній чек" value={`${avgCheck} ₴`} accent="aqua" hint="Дохід / кількість авто" />
        <StatCard label="Витрати" value={`${stats.expenses.toLocaleString('uk-UA')} ₴`} accent="coral" hint="За цей же період" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <GoalGauge
          current={todayCars}
          target={dailyGoal}
          onEditGoal={() => setGoalModalOpen(true)}
        />
        <StatCard
          label="Чистий прибуток"
          value={`${netProfit.toLocaleString('uk-UA')} ₴`}
          accent={netProfit >= 0 ? 'foam' : 'coral'}
          hint="Дохід − виплати працівникам − витрати"
        />
        <StatCard
          label="Виплачено працівникам"
          value={`${stats.commissions.toLocaleString('uk-UA')} ₴`}
          accent="amber"
          hint={`Рентабельність: ${netMargin.toFixed(1)}% · натисни, щоб побачити по кожному →`}
          onClick={() => onNavigate?.('employees')}
        />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-white">Дохід за останні дні</h3>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <TrendingUp size={14} className="text-aqua-400" /> останні 14 днів
          </div>
        </div>

        {chartData.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Ще немає даних"
            subtitle='Додай перше авто у вкладці "Робочий день", щоб побачити графік доходу тут.'
          />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1A2438" vertical={false} />
              <XAxis dataKey="date" stroke="#56617F" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#56617F" fontSize={12} tickLine={false} axisLine={false} width={50} />
              <Tooltip
                contentStyle={{ background: '#131B2C', border: '1px solid #253150', borderRadius: 12, fontSize: 13 }}
                labelStyle={{ color: '#8B96AD' }}
                formatter={(value) => [`${value} ₴`, 'Дохід']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#22D3EE" strokeWidth={2} fill="url(#revenueFill)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {lowStockCount > 0 && (
        <Card className="mt-6 flex items-center gap-3 border-coral-400/30">
          <PackageX className="text-coral-400 shrink-0" size={20} />
          <p className="text-sm text-slate-300">
            У тебе <span className="text-coral-400 font-semibold">{lowStockCount}</span>{' '}
            {lowStockCount === 1 ? 'позиція закінчується' : 'позицій закінчуються'} на складі — перевір вкладку «Склад».
          </p>
        </Card>
      )}

      {upcomingCount > 0 && (
        <Card className="mt-3 flex items-center gap-3 border-aqua-400/20">
          <Target className="text-aqua-400 shrink-0" size={20} />
          <p className="text-sm text-slate-300">
            Попереду <span className="text-aqua-400 font-semibold">{upcomingCount}</span>{' '}
            {upcomingCount === 1 ? 'запланований запис' : 'запланованих записів'} — перевір вкладку «Запис».
          </p>
        </Card>
      )}

      {goalModalOpen && (
        <GoalModal
          storeId={storeId}
          currentGoal={dailyGoal}
          onClose={() => setGoalModalOpen(false)}
          onSaved={loadGoalProgress}
        />
      )}
    </div>
  )
}

function GoalGauge({ current, target, onEditGoal }) {
  const hasGoal = target && Number(target) > 0
  const pct = hasGoal ? Math.min(current / Number(target), 1) : 0
  const exceeded = hasGoal && current > Number(target)
  const r = 32
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - pct)
  const gradientId = 'goalGaugeGradient'

  return (
    <Card className="col-span-2 flex items-center gap-4">
      <div className="relative w-20 h-20 shrink-0">
        <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22D3EE" />
              <stop offset="55%" stopColor="#34D399" />
              <stop offset="100%" stopColor={exceeded ? '#FBBF24' : '#34D399'} />
            </linearGradient>
          </defs>
          <circle cx="40" cy="40" r={r} fill="none" stroke="#1A2438" strokeWidth="9" />
          {hasGoal && (
            <circle
              cx="40" cy="40" r={r} fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-mono font-bold text-white">
            {hasGoal ? `${Math.round(pct * 100)}%` : '—'}
          </span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-400">Ціль на сьогодні</p>
        {hasGoal ? (
          <>
            <p className="text-lg font-mono font-bold text-white">{current} / {target} авто</p>
            <p className={`text-xs mt-0.5 ${exceeded ? 'text-amber-400' : 'text-slate-500'}`}>
              {exceeded
                ? `Ціль перевиконано на ${current - target}! 🎉`
                : current === Number(target)
                ? 'Ціль досягнута сьогодні! 🎉'
                : `Залишилось ${target - current}`}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-500 mt-1">Ціль ще не задана</p>
        )}
        <button onClick={onEditGoal} className="text-xs text-aqua-400 hover:text-aqua-300 mt-2 font-medium">
          {hasGoal ? 'Змінити ціль' : 'Задати ціль'}
        </button>
      </div>
    </Card>
  )
}

function GoalModal({ storeId, currentGoal, onClose, onSaved }) {
  const [value, setValue] = useState(currentGoal ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase
      .from('stores')
      .update({ daily_car_goal: value === '' ? null : Number(value) })
      .eq('id', storeId)
    setSaving(false)
    if (!error) {
      onSaved()
      onClose()
    } else {
      alert('Помилка збереження цілі: ' + error.message)
    }
  }

  return (
    <Modal title="Ціль на день" onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <Input
          label="Скільки авто мити за день"
          type="number"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Наприклад, 5"
        />
        <p className="text-xs text-slate-500">
          Прогрес рахується автоматично з кількості авто, доданих сьогодні у вкладці "Робочий день".
          Залиш поле порожнім, щоб прибрати ціль.
        </p>
        <Button type="submit" disabled={saving} className="w-full">
          {saving ? 'Збереження...' : 'Зберегти ціль'}
        </Button>
      </form>
    </Modal>
  )
}
