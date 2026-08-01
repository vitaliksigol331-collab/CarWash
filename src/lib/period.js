export const PERIODS = [
  { key: 'day', label: 'День' },
  { key: 'week', label: 'Тиждень' },
  { key: 'month', label: 'Місяць' },
  { key: 'year', label: 'Рік' },
  { key: 'all', label: 'Весь час' },
]

const ROLLING_DAYS = { day: 1, week: 7, month: 30, year: 365 }

// Повертає ISO-дату (YYYY-MM-DD), від якої треба фільтрувати, або null для "Весь час"
export function periodStartDate(periodKey) {
  const days = ROLLING_DAYS[periodKey]
  if (!days) return null
  const d = new Date()
  d.setDate(d.getDate() - (days - 1))
  return d.toISOString().slice(0, 10)
}

function toISO(date) {
  return date.toISOString().slice(0, 10)
}

function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay() // 0 = нд, 1 = пн ...
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const MONTH_NAMES = [
  'січень', 'лютий', 'березень', 'квітень', 'травень', 'червень',
  'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень',
]

// Повертає календарний діапазон { from, to, label } для вкладки "Огляд",
// з можливістю гортати назад через offset (0 = поточний період, 1 = минулий, ...)
export function getPeriodRange(periodKey, offset = 0) {
  const now = new Date()

  if (periodKey === 'all') {
    return { from: null, to: null, label: 'Весь час' }
  }

  if (periodKey === 'day') {
    const d = new Date(now)
    d.setDate(d.getDate() - offset)
    const iso = toISO(d)
    const label = d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
    return { from: iso, to: iso, label }
  }

  if (periodKey === 'week') {
    const monday = startOfWeek(now)
    monday.setDate(monday.getDate() - offset * 7)
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)
    const label = `${monday.getDate()}–${sunday.getDate()} ${MONTH_NAMES[sunday.getMonth()]} ${sunday.getFullYear()}`
    return { from: toISO(monday), to: toISO(sunday), label }
  }

  if (periodKey === 'month') {
    const base = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const from = new Date(base.getFullYear(), base.getMonth(), 1)
    const to = new Date(base.getFullYear(), base.getMonth() + 1, 0)
    const label = `${MONTH_NAMES[base.getMonth()]} ${base.getFullYear()}`
    return { from: toISO(from), to: toISO(to), label: label[0].toUpperCase() + label.slice(1) }
  }

  if (periodKey === 'year') {
    const year = now.getFullYear() - offset
    const from = new Date(year, 0, 1)
    const to = new Date(year, 11, 31)
    return { from: toISO(from), to: toISO(to), label: String(year) }
  }

  return { from: null, to: null, label: '' }
}
