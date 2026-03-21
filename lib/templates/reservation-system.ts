export const reservationSystemTemplate = {
  id: "reservation-system",
  name: "Reservation System",
  description: "General-purpose reservations for any service or venue",
  category: "booking",
  files: {
    "package.json": JSON.stringify({
      name: "reservation-system", private: true, version: "0.0.0", type: "module",
      scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
      dependencies: { react: "^18.2.0", "react-dom": "^18.2.0", "lucide-react": "^0.344.0" },
      devDependencies: { "@vitejs/plugin-react": "^4.2.1", vite: "^5.0.8" },
    }, null, 2),

    "index.html": `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Reservation System</title></head>
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
body{font-family:system-ui,-apple-system,sans-serif;background:#fafafa;min-height:100vh;color:#1e293b}
#root{max-width:960px;margin:0 auto;padding:2rem 1rem}`,

    "src/App.jsx": `import { useState } from 'react'
import { Utensils, CalendarDays, Clock, Users, CheckCircle2, X } from 'lucide-react'
import './App.css'

const SERVICES = [
  { id:'s1', name:'Table for 2', icon:'🍽️', capacity:2, desc:'Intimate dining for two', price:0 },
  { id:'s2', name:'Table for 4', icon:'🥂', capacity:4, desc:'Perfect for a family dinner', price:0 },
  { id:'s3', name:'Private Dining Room', icon:'✨', capacity:12, desc:'Exclusive private room for events', price:150 },
  { id:'s4', name:'Bar Seating', icon:'🍺', capacity:1, desc:'Cozy bar counter seats', price:0 },
]

const DATES = (() => {
  const dates = []
  const now = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    dates.push(d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }))
  }
  return dates
})()

const TIMES = ['11:30 AM','12:00 PM','12:30 PM','1:00 PM','5:30 PM','6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM']

const SPECIALS = [
  'None','Birthday','Anniversary','Business Dinner','Date Night','Baby Shower'
]

export default function App() {
  const [step, setStep] = useState('select')
  const [service, setService] = useState(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [guests, setGuests] = useState(2)
  const [form, setForm] = useState({ name:'', email:'', phone:'', special:'None', notes:'' })
  const [reservations, setReservations] = useState([])
  const [confirmId] = useState(() => 'RES-' + Math.floor(Math.random()*900000+100000))

  const handleBook = (e) => {
    e.preventDefault()
    setReservations(prev => [{
      id: Date.now(), service, date, time, guests,
      name: form.name, email: form.email, special: form.special, confirmId
    }, ...prev])
    setStep('success')
  }

  const handleReset = () => {
    setStep('select'); setService(null); setDate(''); setTime(''); setGuests(2)
    setForm({ name:'', email:'', phone:'', special:'None', notes:'' })
  }

  const cancelReservation = (id) => setReservations(prev => prev.filter(r => r.id !== id))

  return (
    <div className="app-wrap">
      {/* Hero */}
      <div className="hero">
        <div className="hero-icon"><Utensils size={26} color="#fff"/></div>
        <div>
          <h1>Bella Vista Restaurant</h1>
          <p>Reserve your table online — quick & easy</p>
        </div>
      </div>

      <div className="layout">
        <div className="main-col">
          {/* Step 1: Choose Service */}
          {step === 'select' && (
            <div className="card">
              <h2 className="card-title">Select Seating Option</h2>
              <div className="service-grid">
                {SERVICES.map(s => (
                  <button key={s.id} className={\`svc-card \${service?.id===s.id?'chosen':''}\`} onClick={()=>setService(s)}>
                    <span className="svc-icon">{s.icon}</span>
                    <span className="svc-name">{s.name}</span>
                    <span className="svc-desc">{s.desc}</span>
                    {s.price > 0 && <span className="svc-price">\${s.price} deposit</span>}
                    {service?.id===s.id && <CheckCircle2 size={16} className="svc-check"/>}
                  </button>
                ))}
              </div>

              {service && (
                <>
                  <div className="two-col">
                    <div className="field">
                      <label><CalendarDays size={13}/> Date</label>
                      <select value={date} onChange={e=>setDate(e.target.value)}>
                        <option value="">Pick a date…</option>
                        {DATES.map(d=><option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label><Clock size={13}/> Time</label>
                      <select value={time} onChange={e=>setTime(e.target.value)}>
                        <option value="">Pick a time…</option>
                        {TIMES.map(t=><option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label><Users size={13}/> Party Size</label>
                    <div className="qty-row">
                      <button onClick={()=>setGuests(g=>Math.max(1,g-1))}>−</button>
                      <span>{guests} guest{guests>1?'s':''}</span>
                      <button onClick={()=>setGuests(g=>Math.min(service.capacity,g+1))}>+</button>
                      <span className="cap-note">max {service.capacity}</span>
                    </div>
                  </div>
                </>
              )}

              <button className="primary-btn" disabled={!service||!date||!time} onClick={()=>setStep('details')}>
                Continue to Details →
              </button>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 'details' && (
            <div className="card">
              <button className="back-link" onClick={()=>setStep('select')}>← Back</button>
              <h2 className="card-title">Your Information</h2>
              <div className="res-summary">
                <span>{service?.icon} {service?.name}</span>
                <span><CalendarDays size={12}/> {date}</span>
                <span><Clock size={12}/> {time}</span>
                <span><Users size={12}/> {guests} guests</span>
              </div>
              <form className="res-form" onSubmit={handleBook}>
                <div className="two-col">
                  <div className="field"><label>Full Name *</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Jane Smith"/></div>
                  <div className="field"><label>Email *</label><input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="jane@email.com"/></div>
                </div>
                <div className="two-col">
                  <div className="field"><label>Phone</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+1 (555) 000-0000"/></div>
                  <div className="field"><label>Special Occasion</label>
                    <select value={form.special} onChange={e=>setForm({...form,special:e.target.value})}>
                      {SPECIALS.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field"><label>Additional Requests</label>
                  <textarea rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Allergies, seating preferences, accessibility needs…"/>
                </div>
                <button type="submit" className="primary-btn">Confirm Reservation</button>
              </form>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 'success' && (
            <div className="card success-wrap">
              <CheckCircle2 size={56} color="#10b981"/>
              <h2>Reservation Confirmed!</h2>
              <p>We'll send a confirmation to <strong>{form.email}</strong></p>
              <div className="res-ticket">
                <div className="rt-head">
                  <span className="rt-icon">{service?.icon}</span>
                  <div>
                    <div className="rt-name">{service?.name}</div>
                    <div className="rt-id">{confirmId}</div>
                  </div>
                </div>
                <div className="rt-rows">
                  <div className="rt-row"><CalendarDays size={13}/> {date}</div>
                  <div className="rt-row"><Clock size={13}/> {time}</div>
                  <div className="rt-row"><Users size={13}/> {guests} guest{guests>1?'s':''}</div>
                  {form.special !== 'None' && <div className="rt-row">🎉 {form.special}</div>}
                </div>
              </div>
              <button className="primary-btn" onClick={handleReset}>Make Another Reservation</button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="sidebar">
          <h3 className="sidebar-title">Upcoming Reservations</h3>
          {reservations.length === 0
            ? <p className="empty-state">No reservations yet.</p>
            : reservations.map(r => (
              <div key={r.id} className="res-card">
                <div className="rc-top">
                  <span className="rc-title">{r.service?.icon} {r.service?.name}</span>
                  <button className="cancel-btn" onClick={()=>cancelReservation(r.id)}><X size={12}/></button>
                </div>
                <div className="rc-meta">{r.name}</div>
                <div className="rc-meta">{r.date} · {r.time}</div>
                <div className="rc-meta">{r.guests} guest{r.guests>1?'s':''}</div>
                <code className="rc-id">{r.confirmId}</code>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}`,

    "src/App.css": `:root{--blue:#4f46e5;--blue-dark:#4338ca;--green:#10b981;--surface:#fff;--border:#e2e8f0;--muted:#64748b;--bg:#fafafa}
.app-wrap{display:flex;flex-direction:column;gap:1.25rem}
.hero{display:flex;align-items:center;gap:1rem;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border-radius:14px;padding:1.5rem 1.75rem}
.hero-icon{background:rgba(255,255,255,.2);border-radius:50%;width:52px;height:52px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.hero h1{font-size:1.4rem;font-weight:800}
.hero p{font-size:.82rem;opacity:.85;margin-top:.2rem}
.layout{display:grid;grid-template-columns:1fr 260px;gap:1.25rem}
@media(max-width:700px){.layout{grid-template-columns:1fr}}
.main-col{display:flex;flex-direction:column;gap:1rem}
.card{background:var(--surface);border-radius:14px;box-shadow:0 2px 16px rgba(0,0,0,.08);padding:1.75rem;display:flex;flex-direction:column;gap:1rem}
.card-title{font-size:1rem;font-weight:700}
.service-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.75rem}
.svc-card{display:flex;flex-direction:column;align-items:flex-start;gap:.3rem;padding:1rem;border:2px solid var(--border);border-radius:10px;background:var(--surface);cursor:pointer;text-align:left;transition:all .2s;position:relative}
.svc-card:hover{border-color:var(--blue)}
.svc-card.chosen{border-color:var(--blue);background:#eef2ff}
.svc-icon{font-size:1.5rem}
.svc-name{font-size:.875rem;font-weight:700}
.svc-desc{font-size:.76rem;color:var(--muted);line-height:1.4}
.svc-price{font-size:.76rem;font-weight:700;color:var(--blue)}
.svc-check{position:absolute;top:.75rem;right:.75rem;color:var(--green)}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}
@media(max-width:500px){.two-col{grid-template-columns:1fr}}
.field{display:flex;flex-direction:column;gap:.35rem}
.field label{display:flex;align-items:center;gap:.3rem;font-size:.8rem;font-weight:600}
.field input,.field select,.field textarea{padding:.6rem .8rem;border:1.5px solid var(--border);border-radius:8px;font-size:.85rem;font-family:inherit;outline:none;background:var(--surface)}
.field input:focus,.field select:focus,.field textarea:focus{border-color:var(--blue)}
.qty-row{display:flex;align-items:center;gap:.6rem}
.qty-row button{width:30px;height:30px;border-radius:50%;border:1.5px solid var(--border);background:var(--surface);font-size:1rem;cursor:pointer;font-weight:700;display:flex;align-items:center;justify-content:center}
.qty-row button:hover{border-color:var(--blue)}
.qty-row span{font-size:.875rem;font-weight:600}
.cap-note{font-size:.75rem;color:var(--muted);margin-left:.25rem}
.primary-btn{padding:.875rem;background:linear-gradient(135deg,var(--blue),var(--blue-dark));color:#fff;border:none;border-radius:10px;font-weight:700;font-size:.9rem;cursor:pointer;transition:opacity .2s}
.primary-btn:disabled{opacity:.4;cursor:not-allowed}
.primary-btn:hover:not(:disabled){opacity:.9}
.back-link{background:none;border:none;color:var(--muted);font-size:.82rem;cursor:pointer;padding:0;align-self:flex-start}
.back-link:hover{color:var(--blue)}
.res-summary{display:flex;flex-wrap:wrap;gap:.5rem;background:#f8f9ff;border-radius:8px;padding:.75rem}
.res-summary span{display:flex;align-items:center;gap:.3rem;font-size:.8rem;background:#eef2ff;border-radius:20px;padding:.25rem .65rem;font-weight:600;color:var(--blue)}
.res-form{display:flex;flex-direction:column;gap:.85rem}
.success-wrap{align-items:center;text-align:center;gap:.85rem}
.success-wrap h2{font-size:1.4rem;font-weight:800}
.success-wrap p{color:var(--muted);font-size:.875rem}
.res-ticket{width:100%;max-width:380px;border:2px solid var(--border);border-radius:12px;overflow:hidden}
.rt-head{display:flex;align-items:center;gap:1rem;padding:1rem 1.25rem;background:#eef2ff;border-bottom:1px solid var(--border)}
.rt-icon{font-size:1.75rem}
.rt-name{font-weight:700;font-size:.95rem}
.rt-id{font-size:.75rem;color:var(--muted);font-family:monospace}
.rt-rows{padding:.85rem 1.25rem;display:flex;flex-direction:column;gap:.4rem}
.rt-row{display:flex;align-items:center;gap:.4rem;font-size:.82rem;color:var(--muted)}
.sidebar{display:flex;flex-direction:column;gap:.75rem;align-self:start;position:sticky;top:1rem}
.sidebar-title{font-size:.875rem;font-weight:700}
.empty-state{font-size:.8rem;color:var(--muted);background:var(--surface);border-radius:10px;padding:1rem;text-align:center}
.res-card{background:var(--surface);border-radius:10px;padding:.9rem;box-shadow:0 2px 10px rgba(0,0,0,.07);display:flex;flex-direction:column;gap:.3rem}
.rc-top{display:flex;justify-content:space-between;align-items:center}
.rc-title{font-size:.875rem;font-weight:700}
.cancel-btn{background:none;border:none;cursor:pointer;color:var(--muted)}
.cancel-btn:hover{color:#ef4444}
.rc-meta{font-size:.78rem;color:var(--muted)}
.rc-id{font-size:.72rem;font-weight:700;color:var(--blue);margin-top:.1rem}
`,
  },
}
