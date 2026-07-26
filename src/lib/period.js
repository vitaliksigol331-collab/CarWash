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
