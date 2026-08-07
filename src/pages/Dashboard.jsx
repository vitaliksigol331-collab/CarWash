import { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar, { TABS } from '../components/Sidebar'
import Overview from '../components/tabs/Overview'
import WorkDay from '../components/tabs/WorkDay'
import Employees from '../components/tabs/Employees'
import Expenses from '../components/tabs/Expenses'
import Cashbox from '../components/tabs/Cashbox'
import Warehouse from '../components/tabs/Warehouse'
import Clients from '../components/tabs/Clients'
import Booking from '../components/tabs/Booking'

const VIEWS = {
  overview: Overview,
  workday: WorkDay,
  employees: Employees,
  expenses: Expenses,
  cashbox: Cashbox,
  warehouse: Warehouse,
  clients: Clients,
  booking: Booking,
}

export default function Dashboard() {
  const [active, setActive] = useState('overview')
  const [mobileOpen, setMobileOpen] = useState(false)

  const ActiveView = VIEWS[active]
  const activeLabel = TABS.find((t) => t.key === active)?.label

  return (
    <div className="min-h-screen flex bg-ink-950">
      <Sidebar
        active={active}
        onChange={setActive}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex-1 min-w-0">
        <header className="md:hidden safe-top sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-ink-900/90 backdrop-blur border-b border-ink-700">
          <button onClick={() => setMobileOpen(true)} className="text-slate-300">
            <Menu size={22} />
          </button>
          <span className="font-display font-bold text-white">{activeLabel}</span>
        </header>

        <main className="p-4 md:p-8 safe-bottom max-w-6xl mx-auto animate-drop-in" key={active}>
          <ActiveView onNavigate={setActive} />
        </main>
      </div>
    </div>
  )
}
