export const officeBookingTemplate = {
  id: "office-booking",
  name: "Office Space Booking",
  description: "Reserve desks, rooms, and office resources",
  category: "booking",
  files: {
    "package.json": JSON.stringify({
      name: "office-booking", private: true, version: "0.0.0", type: "module",
      scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
      dependencies: { react: "^18.2.0", "react-dom": "^18.2.0", "lucide-react": "^0.344.0" },
      devDependencies: { "@vitejs/plugin-react": "^4.2.1", vite: "^5.0.8" },
    }, null, 2),

    "index.html": `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Office Space Booking</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>
</html>`,

    "vite.config.js": `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()] })`,

    "src/main.jsx": `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)`,

    "src/index.css": `*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#f1f5f9;min-height:100vh;color:#1e293b}
#root{max-width:1000px;margin:0 auto;padding:2rem 1rem}`,

    "src/App.jsx": `import { useState } from 'react'
import { Monitor, Users, Coffee, Wifi, Check, X, Calendar, Clock, User } from 'lucide-react'
import './App.css'

const FLOOR = [
  { id:'d1', type:'desk', label:'Desk A-1', floor:1, capacity:1, amenities:['Monitor','Wifi'], status:'available' },
  { id:'d2', type:'desk', label:'Desk A-2', floor:1, capacity:1, amenities:['Monitor','Wifi'], status:'available' },
  { id:'d3', type:'desk', label:'Desk A-3', floor:1, capacity:1, amenities:['Monitor'], status:'occupied' },
  { id:'d4', type:'desk', label:'Desk B-1', floor:1, capacity:1, amenities:['Monitor','Wifi'], status:'available' },
  { id:'d5', type:'desk', label:'Desk B-2', floor:1, capacity:1, amenities:['Wifi'], status:'available' },
  { id:'d6', type:'desk', label:'Desk B-3', floor:1, capacity:1, amenities:['Monitor','Wifi'], status:'available' },
  { id:'r1', type:'room', label:'Boardroom', floor:1, capacity:12, amenities:['Monitor','Wifi','Coffee'], status:'available' },
  { id:'r2', type:'room', label:'Meeting Rm A', floor:1, capacity:6, amenities:['Monitor','Wifi'], status:'occupied' },
  { id:'r3', type:'room', label:'Meeting Rm B', floor:1, capacity:4, amenities:['Wifi'], status:'available' },
  { id:'r4', type:'room', label:'Focus Pod', floor:1, capacity:2, amenities:['Wifi'], status:'available' },
  { id:'ph1', type:'phone', label:'Phone Booth 1', floor:1, capacity:1, amenities:['Wifi'], status:'available' },
  { id:'ph2', type:'phone', label:'Phone Booth 2', floor:1, capacity:1, amenities:['Wifi'], status:'available' },
]

const ICON_MAP = { Monitor, Wifi, Coffee }
const DATES = ['Today, Mar 21','Tomorrow, Mar 22','Wed, Mar 23','Thu, Mar 24','Fri, Mar 25']
const TIMES = ['8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM']

export default function App() {
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [date, setDate] = useState(DATES[0])
  const [startTime, setStartTime] = useState(TIMES[2])
  const [endTime, setEndTime] = useState(TIMES[4])
  const [name, setName] = useState('')
  const [booked, setBooked] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [resources, setResources] = useState(FLOOR)

  const filtered = filter === 'all' ? resources : resources.filter(r => r.type === filter)

  const handleBook = (e) => {
    e.preventDefault()
    if (!selected) return
    const booking = { id: Date.now(), resource: selected, date, startTime, endTime, name }
    setBooked(prev => [booking, ...prev])
    setResources(prev => prev.map(r => r.id === selected.id ? {...r, status:'occupied'} : r))
    setShowForm(false)
    setSelected(null)
    setName('')
  }

  const cancelBooking = (id) => {
    const b = booked.find(b => b.id === id)
    if (b) {
      setResources(prev => prev.map(r => r.id === b.resource.id ? {...r, status:'available'} : r))
      setBooked(prev => prev.filter(x => x.id !== id))
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Office Space Booking</h1>
        <p>Reserve desks, meeting rooms, and office resources</p>
      </div>

      <div className="layout">
        <div className="main-col">
          {/* Filters */}
          <div className="filter-bar">
            {['all','desk','room','phone'].map(f => (
              <button key={f} className={\`filter-btn \${filter===f?'active':''}\`} onClick={()=>setFilter(f)}>
                {f === 'all' ? 'All Spaces' : f === 'desk' ? 'Desks' : f === 'room' ? 'Meeting Rooms' : 'Phone Booths'}
              </button>
            ))}
          </div>

          {/* Floor Plan Grid */}
          <div className="floor-grid">
            {filtered.map(space => (
              <button
                key={space.id}
                className={\`space-card \${space.status} \${selected?.id===space.id?'chosen':''}\`}
                onClick={() => { if (space.status === 'available') { setSelected(space); setShowForm(true) } }}
                disabled={space.status === 'occupied'}
              >
                <div className="space-type-badge">{space.type}</div>
                <div className="space-label">{space.label}</div>
                <div className="space-cap"><Users size={12}/> {space.capacity} person{space.capacity>1?'s':''}</div>
                <div className="space-amenities">
                  {space.amenities.map(a => {
                    const Icon = ICON_MAP[a]
                    return Icon ? <span key={a} className="amenity"><Icon size={11}/></span> : null
                  })}
                </div>
                <div className={\`space-status-dot \${space.status}\`}/>
              </button>
            ))}
          </div>

          {/* Booking Form */}
          {showForm && selected && (
            <div className="booking-panel">
              <div className="booking-panel-header">
                <h3>Book: {selected.label}</h3>
                <button className="close-btn" onClick={()=>{ setShowForm(false); setSelected(null) }}><X size={16}/></button>
              </div>
              <form className="booking-form" onSubmit={handleBook}>
                <div className="two-col">
                  <div className="field"><label><Calendar size={12}/> Date</label>
                    <select value={date} onChange={e=>setDate(e.target.value)}>
                      {DATES.map(d=><option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="field"><label><User size={12}/> Your Name</label>
                    <input required value={name} onChange={e=>setName(e.target.value)} placeholder="Jane Smith" />
                  </div>
                </div>
                <div className="two-col">
                  <div className="field"><label><Clock size={12}/> Start Time</label>
                    <select value={startTime} onChange={e=>setStartTime(e.target.value)}>
                      {TIMES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="field"><label><Clock size={12}/> End Time</label>
                    <select value={endTime} onChange={e=>setEndTime(e.target.value)}>
                      {TIMES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" className="primary-btn">Confirm Booking</button>
              </form>
            </div>
          )}
        </div>

        {/* Bookings Sidebar */}
        <div className="sidebar">
          <h3 className="sidebar-title">My Bookings ({booked.length})</h3>
          {booked.length === 0
            ? <p className="empty-state">Select an available space to book it.</p>
            : booked.map(b => (
              <div key={b.id} className="booking-card">
                <div className="bc-top">
                  <span className="bc-name">{b.resource.label}</span>
                  <button className="cancel-btn" onClick={()=>cancelBooking(b.id)}><X size={12}/></button>
                </div>
                <div className="bc-meta"><User size={11}/> {b.name}</div>
                <div className="bc-meta"><Calendar size={11}/> {b.date}</div>
                <div className="bc-meta"><Clock size={11}/> {b.startTime} – {b.endTime}</div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}`,

    "src/App.css": `:root{--blue:#3b82f6;--green:#10b981;--red:#ef4444;--amber:#f59e0b;--surface:#fff;--border:#e2e8f0;--muted:#64748b;--bg:#f1f5f9}
.page-header{margin-bottom:1.5rem}
.page-header h1{font-size:1.5rem;font-weight:800}
.page-header p{color:var(--muted);font-size:.875rem;margin-top:.2rem}
.layout{display:grid;grid-template-columns:1fr 260px;gap:1.25rem}
@media(max-width:700px){.layout{grid-template-columns:1fr}}
.main-col{display:flex;flex-direction:column;gap:1rem}
.filter-bar{display:flex;gap:.5rem;flex-wrap:wrap}
.filter-btn{padding:.45rem .9rem;border:1.5px solid var(--border);border-radius:20px;font-size:.8rem;font-weight:500;cursor:pointer;background:var(--surface);transition:all .2s}
.filter-btn.active{border-color:var(--blue);background:#eff6ff;color:var(--blue);font-weight:700}
.floor-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:.75rem}
.space-card{display:flex;flex-direction:column;gap:.3rem;padding:1rem;border:2px solid var(--border);border-radius:10px;background:var(--surface);cursor:pointer;text-align:left;position:relative;transition:all .2s}
.space-card.available:hover{border-color:var(--blue);box-shadow:0 2px 10px rgba(59,130,246,.15)}
.space-card.occupied{opacity:.55;cursor:not-allowed;background:#fafafa}
.space-card.chosen{border-color:var(--blue);background:#eff6ff}
.space-type-badge{font-size:.65rem;text-transform:uppercase;font-weight:700;letter-spacing:.05em;color:var(--muted)}
.space-label{font-size:.88rem;font-weight:700}
.space-cap{display:flex;align-items:center;gap:.25rem;font-size:.75rem;color:var(--muted)}
.space-amenities{display:flex;gap:.25rem;margin-top:.2rem}
.amenity{display:flex;align-items:center;background:#f1f5f9;border-radius:4px;padding:2px 5px;color:var(--muted)}
.space-status-dot{position:absolute;top:.75rem;right:.75rem;width:8px;height:8px;border-radius:50%}
.space-status-dot.available{background:var(--green)}
.space-status-dot.occupied{background:var(--red)}
.booking-panel{background:var(--surface);border-radius:12px;border:2px solid var(--blue);padding:1.25rem}
.booking-panel-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem}
.booking-panel-header h3{font-size:.95rem;font-weight:700}
.close-btn{background:none;border:none;cursor:pointer;color:var(--muted)}
.close-btn:hover{color:var(--red)}
.booking-form{display:flex;flex-direction:column;gap:.75rem}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}
@media(max-width:500px){.two-col{grid-template-columns:1fr}}
.field{display:flex;flex-direction:column;gap:.3rem}
.field label{display:flex;align-items:center;gap:.3rem;font-size:.78rem;font-weight:600}
.field input,.field select{padding:.6rem .8rem;border:1.5px solid var(--border);border-radius:8px;font-size:.85rem;font-family:inherit;outline:none;background:var(--surface)}
.field input:focus,.field select:focus{border-color:var(--blue)}
.primary-btn{padding:.8rem;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;border-radius:10px;font-weight:700;font-size:.875rem;cursor:pointer}
.primary-btn:hover{opacity:.9}
.sidebar{display:flex;flex-direction:column;gap:.75rem;align-self:start;position:sticky;top:1rem}
.sidebar-title{font-size:.875rem;font-weight:700}
.empty-state{font-size:.8rem;color:var(--muted);background:var(--surface);border-radius:10px;padding:1rem;text-align:center}
.booking-card{background:var(--surface);border-radius:10px;padding:.9rem;box-shadow:0 2px 10px rgba(0,0,0,.07);display:flex;flex-direction:column;gap:.3rem}
.bc-top{display:flex;justify-content:space-between;align-items:center}
.bc-name{font-size:.875rem;font-weight:700}
.cancel-btn{background:none;border:none;cursor:pointer;color:var(--muted);display:flex;align-items:center}
.cancel-btn:hover{color:var(--red)}
.bc-meta{display:flex;align-items:center;gap:.35rem;font-size:.77rem;color:var(--muted)}
`,
  },
}
