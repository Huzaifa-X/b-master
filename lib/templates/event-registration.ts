export const eventRegistrationTemplate = {
  id: "event-registration",
  name: "Event Registration",
  description: "Event sign-up with attendee list & confirmation ticket",
  category: "booking",
  files: {
    "package.json": JSON.stringify({
      name: "event-registration", private: true, version: "0.0.0", type: "module",
      scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
      dependencies: { react: "^18.2.0", "react-dom": "^18.2.0", "lucide-react": "^0.344.0" },
      devDependencies: { "@vitejs/plugin-react": "^4.2.1", vite: "^5.0.8" },
    }, null, 2),

    "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Event Registration</title>
  </head>
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
body{font-family:system-ui,-apple-system,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;padding:2rem 1rem}
#root{width:100%;max-width:860px;margin:0 auto}`,

    "src/App.jsx": `import { useState } from 'react'
import { Calendar, MapPin, Users, Clock, CheckCircle2, Ticket, User } from 'lucide-react'
import './App.css'

const EVENT = {
  title: 'TechConnect Summit 2025',
  date: 'Saturday, April 12, 2025',
  time: '9:00 AM – 6:00 PM PST',
  location: 'Moscone Center, San Francisco, CA',
  description: 'Join 2,000+ tech professionals for a day of keynotes, workshops, and networking.',
  tickets: [
    { id: 'general', label: 'General Admission', price: 0, desc: 'Keynotes & expo floor', icon: '🎟️' },
    { id: 'vip', label: 'VIP All-Access', price: 299, desc: 'Front row + speaker dinners', icon: '⭐' },
    { id: 'workshop', label: 'Workshop Pass', price: 149, desc: '3 hands-on workshops', icon: '🛠️' },
  ]
}

export default function App() {
  const [step, setStep] = useState('event')
  const [ticketType, setTicketType] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', company:'' })
  const [attendees, setAttendees] = useState([])
  const [confirmId] = useState(() => 'EVT-' + Math.random().toString(36).slice(2,8).toUpperCase())

  const ticket = EVENT.tickets.find(t => t.id === ticketType)
  const total = ticket ? ticket.price * quantity : 0

  const handleRegister = (e) => {
    e.preventDefault()
    setAttendees(prev => [...prev, { ...form, ticket: ticketType, id: Date.now() }])
    setStep('success')
  }

  const handleReset = () => {
    setStep('event'); setTicketType(null); setQuantity(1)
    setForm({ firstName:'', lastName:'', email:'', company:'' })
  }

  return (
    <div className="app-wrap">
      <div className="event-banner">
        <div className="banner-badge">Upcoming Event</div>
        <h1 className="event-title">{EVENT.title}</h1>
        <div className="event-meta-row">
          <span><Calendar size={13} /> {EVENT.date}</span>
          <span><Clock size={13} /> {EVENT.time}</span>
          <span><MapPin size={13} /> {EVENT.location}</span>
        </div>
        <p className="event-desc">{EVENT.description}</p>
        <div className="attendee-count"><Users size={13} /> {attendees.length} registered so far</div>
      </div>

      {step === 'event' && (
        <div className="card">
          <h2 className="card-title">Choose Your Ticket</h2>
          <div className="ticket-list">
            {EVENT.tickets.map(t => (
              <button key={t.id} className={\`ticket-option \${ticketType === t.id ? 'selected' : ''}\`} onClick={() => setTicketType(t.id)}>
                <span className="ticket-icon">{t.icon}</span>
                <div className="ticket-info">
                  <span className="ticket-label">{t.label}</span>
                  <span className="ticket-desc">{t.desc}</span>
                </div>
                <span className="ticket-price">{t.price === 0 ? 'Free' : '$'+t.price}</span>
                {ticketType === t.id && <CheckCircle2 size={18} className="check-icon" />}
              </button>
            ))}
          </div>
          {ticketType && (
            <div className="qty-row">
              <span className="qty-label">Quantity</span>
              <div className="qty-ctrl">
                <button onClick={() => setQuantity(q => Math.max(1, q-1))}>−</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(q => Math.min(10, q+1))}>+</button>
              </div>
              {total > 0 && <span className="qty-total">Total: <strong>\${total}</strong></span>}
            </div>
          )}
          <button className="primary-btn" disabled={!ticketType} onClick={() => setStep('details')}>
            Continue to Details
          </button>
        </div>
      )}

      {step === 'details' && (
        <div className="card">
          <button className="back-link" onClick={() => setStep('event')}>← Back</button>
          <h2 className="card-title">Attendee Information</h2>
          <div className="summary-row"><Ticket size={14} /> {ticket?.icon} {ticket?.label} × {quantity} = <strong>{total === 0 ? 'Free' : '$'+total}</strong></div>
          <form className="reg-form" onSubmit={handleRegister}>
            <div className="two-col">
              <div className="field"><label>First Name *</label><input required value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} placeholder="Jane" /></div>
              <div className="field"><label>Last Name *</label><input required value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} placeholder="Smith" /></div>
            </div>
            <div className="field"><label>Email *</label><input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="jane@company.com" /></div>
            <div className="field"><label>Company</label><input value={form.company} onChange={e=>setForm({...form,company:e.target.value})} placeholder="Acme Corp" /></div>
            <button type="submit" className="primary-btn">Complete Registration</button>
          </form>
        </div>
      )}

      {step === 'success' && (
        <div className="card success-wrap">
          <CheckCircle2 size={56} color="#10b981" />
          <h2>You're Registered!</h2>
          <p>Confirmation sent to <strong>{form.email}</strong></p>
          <div className="e-ticket">
            <div className="e-ticket-top">
              <div>
                <div className="ticket-event-name">{EVENT.title}</div>
                <div className="ticket-meta"><Calendar size={12}/> {EVENT.date}</div>
                <div className="ticket-meta"><MapPin size={12}/> {EVENT.location}</div>
              </div>
              <span style={{fontSize:'2rem'}}>{ticket?.icon}</span>
            </div>
            <div className="ticket-divider"/>
            <div className="e-ticket-bottom">
              <div><div className="ticket-holder">{form.firstName} {form.lastName}</div><div className="ticket-type">{ticket?.label}</div></div>
              <code className="ticket-id">{confirmId}</code>
            </div>
          </div>
          <button className="primary-btn" onClick={handleReset}>Register Another</button>
        </div>
      )}

      {attendees.length > 0 && (
        <div className="attendees-panel">
          <h3><Users size={15}/> Registered Attendees ({attendees.length})</h3>
          {attendees.map(a => (
            <div key={a.id} className="attendee-row">
              <User size={13}/><span>{a.firstName} {a.lastName}</span>
              <span className="atag">{EVENT.tickets.find(t=>t.id===a.ticket)?.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}`,

    "src/App.css": `:root{--blue:#667eea;--blue2:#764ba2;--green:#10b981;--surface:#fff;--border:#e2e8f0;--muted:#64748b}
.app-wrap{display:flex;flex-direction:column;gap:1rem}
.event-banner{background:rgba(255,255,255,.14);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.3);border-radius:14px;padding:1.75rem;color:#fff}
.banner-badge{display:inline-block;background:rgba(255,255,255,.22);border-radius:20px;padding:.2rem .75rem;font-size:.72rem;font-weight:700;margin-bottom:.6rem;letter-spacing:.05em;text-transform:uppercase}
.event-title{font-size:1.6rem;font-weight:800;margin-bottom:.6rem}
.event-meta-row{display:flex;flex-wrap:wrap;gap:.6rem;font-size:.78rem;margin-bottom:.6rem;opacity:.9}
.event-meta-row span{display:flex;align-items:center;gap:.3rem}
.event-desc{font-size:.84rem;opacity:.85;margin-bottom:.75rem;line-height:1.55}
.attendee-count{display:flex;align-items:center;gap:.35rem;font-size:.78rem;opacity:.8}
.card{background:var(--surface);border-radius:14px;box-shadow:0 4px 24px rgba(0,0,0,.12);padding:1.75rem}
.card-title{font-size:1.05rem;font-weight:700;margin-bottom:1rem}
.ticket-list{display:flex;flex-direction:column;gap:.6rem;margin-bottom:1rem}
.ticket-option{display:flex;align-items:center;gap:.75rem;padding:.9rem 1rem;border:2px solid var(--border);border-radius:10px;background:var(--surface);cursor:pointer;text-align:left;transition:all .2s;position:relative}
.ticket-option:hover{border-color:var(--blue)}
.ticket-option.selected{border-color:var(--blue);background:#f5f3ff}
.ticket-icon{font-size:1.35rem}
.ticket-info{flex:1;display:flex;flex-direction:column;gap:2px}
.ticket-label{font-weight:700;font-size:.875rem}
.ticket-desc{font-size:.76rem;color:var(--muted)}
.ticket-price{font-weight:700;font-size:.9rem;color:var(--blue);flex-shrink:0}
.check-icon{color:var(--green);flex-shrink:0}
.qty-row{display:flex;align-items:center;gap:.75rem;padding:.75rem;background:#f8faff;border-radius:8px;margin-bottom:.75rem;font-size:.85rem}
.qty-label{font-weight:600}
.qty-ctrl{display:flex;align-items:center;gap:.5rem}
.qty-ctrl button{width:28px;height:28px;border-radius:50%;border:1.5px solid var(--border);background:var(--surface);font-size:.95rem;cursor:pointer;font-weight:700;display:flex;align-items:center;justify-content:center}
.qty-ctrl button:hover{border-color:var(--blue)}
.qty-ctrl span{font-weight:700;min-width:18px;text-align:center}
.qty-total{margin-left:auto}
.primary-btn{width:100%;padding:.85rem;background:linear-gradient(135deg,var(--blue),var(--blue2));color:#fff;border:none;border-radius:10px;font-weight:700;font-size:.9rem;cursor:pointer;transition:opacity .2s;margin-top:.5rem}
.primary-btn:disabled{opacity:.45;cursor:not-allowed}
.primary-btn:hover:not(:disabled){opacity:.9}
.back-link{background:none;border:none;color:var(--muted);font-size:.82rem;cursor:pointer;margin-bottom:.85rem;padding:0}
.back-link:hover{color:var(--blue)}
.summary-row{display:flex;align-items:center;gap:.4rem;font-size:.82rem;background:#f8faff;padding:.6rem .85rem;border-radius:8px;margin-bottom:1rem}
.reg-form{display:flex;flex-direction:column;gap:.85rem}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}
@media(max-width:480px){.two-col{grid-template-columns:1fr}}
.field{display:flex;flex-direction:column;gap:.3rem}
.field label{font-size:.8rem;font-weight:600}
.field input{padding:.6rem .8rem;border:1.5px solid var(--border);border-radius:8px;font-size:.875rem;font-family:inherit;outline:none}
.field input:focus{border-color:var(--blue)}
.success-wrap{display:flex;flex-direction:column;align-items:center;text-align:center;gap:.85rem}
.success-wrap h2{font-size:1.4rem;font-weight:800}
.success-wrap p{color:var(--muted);font-size:.875rem}
.e-ticket{width:100%;max-width:400px;border:2px dashed #c4b5fd;border-radius:12px}
.e-ticket-top{display:flex;align-items:flex-start;justify-content:space-between;padding:1.1rem;background:#f5f3ff}
.ticket-event-name{font-weight:800;font-size:.92rem;margin-bottom:.3rem}
.ticket-meta{display:flex;align-items:center;gap:.3rem;font-size:.76rem;color:var(--muted);margin-top:.2rem}
.ticket-divider{height:1px;background:repeating-linear-gradient(90deg,#c4b5fd 0,#c4b5fd 8px,transparent 8px,transparent 14px)}
.e-ticket-bottom{display:flex;justify-content:space-between;align-items:center;padding:.9rem 1.1rem}
.ticket-holder{font-weight:700;font-size:.88rem}
.ticket-type{font-size:.76rem;color:var(--muted)}
.ticket-id{font-size:.82rem;font-weight:700;color:var(--blue)}
.attendees-panel{background:var(--surface);border-radius:12px;padding:1.25rem;box-shadow:0 2px 12px rgba(0,0,0,.08)}
.attendees-panel h3{display:flex;align-items:center;gap:.4rem;font-size:.875rem;font-weight:700;margin-bottom:.75rem}
.attendee-row{display:flex;align-items:center;gap:.4rem;font-size:.8rem;padding:.35rem 0;border-bottom:1px solid var(--border)}
.attendee-row:last-child{border:none}
.atag{margin-left:auto;font-size:.76rem;color:var(--muted)}
`,
  },
}
