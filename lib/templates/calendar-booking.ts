export const calendarBookingTemplate = {
  id: "calendar-booking",
  name: "Calendar Booking",
  description: "Appointment scheduling with calendar & time slots",
  category: "booking",
  files: {
    "package.json": JSON.stringify(
      {
        name: "calendar-booking",
        private: true,
        version: "0.0.0",
        type: "module",
        scripts: {
          dev: "vite",
          build: "vite build",
          preview: "vite preview",
        },
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          "lucide-react": "^0.344.0",
          "date-fns": "^3.6.0",
        },
        devDependencies: {
          "@vitejs/plugin-react": "^4.2.1",
          vite: "^5.0.8",
        },
      },
      null,
      2
    ),

    "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Book an Appointment</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
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
body{font-family:system-ui,-apple-system,sans-serif;background:#f0f4f8;min-height:100vh;color:#1a202c}
#root{width:100%;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem}`,

    "src/App.jsx": `import { useState } from 'react'
import {
  format, addMonths, subMonths, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, isToday, isBefore, startOfDay
} from 'date-fns'
import { ChevronLeft, ChevronRight, Clock, Calendar, CheckCircle2, Video, User } from 'lucide-react'
import './App.css'

const SERVICES = [
  { id: '15min', label: '15-Min Quick Sync', duration: 15, color: '#3b82f6', desc: 'A quick chat to align on a topic' },
  { id: '30min', label: '30-Min Introduction', duration: 30, color: '#10b981', desc: 'Get to know each other and discuss goals' },
  { id: '60min', label: '60-Min Deep Dive', duration: 60, color: '#8b5cf6', desc: 'In-depth session with full agenda' },
]

const generateSlots = () => {
  const times = []
  for (let h = 9; h < 17; h++) {
    times.push(\`\${h > 12 ? h - 12 : h}:00 \${h < 12 ? 'AM' : 'PM'}\`)
    times.push(\`\${h > 12 ? h - 12 : h}:30 \${h < 12 ? 'AM' : 'PM'}\`)
  }
  return times.filter((_, i) => Math.random() > 0.3)
}

export default function App() {
  const [step, setStep] = useState('service')
  const [service, setService] = useState(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', notes: '' })

  const today = startOfDay(new Date())

  const calStart = startOfWeek(startOfMonth(currentMonth))
  const calEnd = endOfWeek(endOfMonth(currentMonth))
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const handleSelectDate = (day) => {
    if (isBefore(day, today)) return
    if (!isSameMonth(day, currentMonth)) return
    setSelectedDate(day)
    setSelectedSlot(null)
    setSlots(generateSlots())
  }

  const handleSelectService = (svc) => {
    setService(svc)
    setStep('datetime')
  }

  const handleSelectSlot = (slot) => setSelectedSlot(slot)

  const handleContinue = () => {
    if (selectedDate && selectedSlot) setStep('details')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setStep('success')
  }

  return (
    <div className="page-wrapper">
      <div className="card">
        {/* Header */}
        <div className="card-header">
          <div className="avatar-wrap">
            <img src="https://i.pravatar.cc/80?u=alex" alt="Host" className="avatar" />
          </div>
          <div>
            <h1 className="host-name">Alex Johnson</h1>
            <p className="host-title">Product Designer · BookMe</p>
          </div>
        </div>

        {/* Step: Choose Service */}
        {step === 'service' && (
          <div className="step-content">
            <h2 className="step-title">Select a Meeting Type</h2>
            <div className="service-list">
              {SERVICES.map(svc => (
                <button key={svc.id} className="service-card" onClick={() => handleSelectService(svc)}>
                  <div className="service-color-bar" style={{ background: svc.color }} />
                  <div className="service-info">
                    <span className="service-label">{svc.label}</span>
                    <span className="service-desc">{svc.desc}</span>
                    <span className="service-duration"><Clock size={12} /> {svc.duration} min · Google Meet</span>
                  </div>
                  <ChevronRight size={18} className="service-arrow" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Choose Date & Time */}
        {step === 'datetime' && (
          <div className="step-content">
            <button className="back-btn" onClick={() => setStep('service')}>
              <ChevronLeft size={16} /> Back
            </button>
            <div className="datetime-grid">
              {/* Calendar */}
              <div className="calendar-section">
                <div className="cal-nav">
                  <button className="icon-btn" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft size={18} />
                  </button>
                  <span className="cal-month">{format(currentMonth, 'MMMM yyyy')}</span>
                  <button className="icon-btn" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight size={18} />
                  </button>
                </div>
                <div className="cal-grid">
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                    <div key={d} className="cal-day-name">{d}</div>
                  ))}
                  {days.map((day, i) => {
                    const isPast = isBefore(day, today)
                    const isOtherMonth = !isSameMonth(day, currentMonth)
                    const isSelected = selectedDate && isSameDay(day, selectedDate)
                    const isTodayDay = isToday(day)
                    return (
                      <button
                        key={i}
                        className={\`cal-day \${isOtherMonth ? 'other-month' : ''} \${isPast ? 'past' : ''} \${isSelected ? 'selected' : ''} \${isTodayDay ? 'today' : ''}\`}
                        onClick={() => handleSelectDate(day)}
                        disabled={isPast || isOtherMonth}
                      >
                        {format(day, 'd')}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <div className="slots-section">
                  <p className="slots-date-label">{format(selectedDate, 'EEEE, MMMM d')}</p>
                  <div className="slots-list">
                    {slots.map((slot, i) => (
                      <div key={i} className="slot-row">
                        <button
                          className={\`slot-btn \${selectedSlot === slot ? 'slot-active' : ''}\`}
                          onClick={() => handleSelectSlot(slot)}
                        >
                          {slot}
                        </button>
                        {selectedSlot === slot && (
                          <button className="confirm-slot-btn" onClick={handleContinue}>
                            Confirm
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step: Enter Details */}
        {step === 'details' && (
          <div className="step-content">
            <button className="back-btn" onClick={() => setStep('datetime')}>
              <ChevronLeft size={16} /> Back
            </button>
            <div className="details-grid">
              <div className="details-summary">
                <h3 className="summary-title">{service?.label}</h3>
                <div className="summary-row"><Clock size={14} /> {service?.duration} min</div>
                <div className="summary-row highlight"><Calendar size={14} />
                  {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')} · {selectedSlot}
                </div>
                <div className="summary-row"><Video size={14} /> Google Meet (link sent via email)</div>
              </div>
              <form className="booking-form" onSubmit={handleSubmit}>
                <h3 className="form-title">Enter Your Details</h3>
                <div className="field">
                  <label>Full Name *</label>
                  <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Jane Smith" />
                </div>
                <div className="field">
                  <label>Email Address *</label>
                  <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="jane@example.com" />
                </div>
                <div className="field">
                  <label>Anything to share? (optional)</label>
                  <textarea rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Topics you'd like to cover..." />
                </div>
                <button type="submit" className="submit-btn">Schedule Event</button>
              </form>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="step-content success-step">
            <CheckCircle2 size={64} color="#10b981" />
            <h2>You're Scheduled!</h2>
            <p>A calendar invitation has been sent to <strong>{form.email}</strong></p>
            <div className="success-card">
              <h3>{service?.label}</h3>
              <div className="summary-row"><User size={14} /> Alex Johnson</div>
              <div className="summary-row highlight"><Calendar size={14} />
                {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')} · {selectedSlot}
              </div>
              <div className="summary-row"><Video size={14} /> Web conferencing details in the invite</div>
            </div>
            <button className="submit-btn" onClick={() => { setStep('service'); setService(null); setSelectedDate(null); setSelectedSlot(null); setForm({ name:'', email:'', notes:'' }) }}>
              Book Another
            </button>
          </div>
        )}
      </div>
    </div>
  )
}`,

    "src/App.css": `:root{--blue:#3b82f6;--blue-dark:#2563eb;--green:#10b981;--purple:#8b5cf6;--surface:#fff;--bg:#f0f4f8;--border:#e2e8f0;--text:#1a202c;--muted:#64748b;--light:#94a3b8}
.page-wrapper{width:100%;max-width:1000px;margin:0 auto}
.card{background:var(--surface);border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.10);overflow:hidden}
.card-header{display:flex;align-items:center;gap:1rem;padding:1.5rem 2rem;border-bottom:1px solid var(--border);background:linear-gradient(135deg,#f8faff 0%,#f0f4f8 100%)}
.avatar-wrap{flex-shrink:0}.avatar{width:56px;height:56px;border-radius:50%;border:2px solid var(--blue)}
.host-name{font-size:1.125rem;font-weight:700;margin-bottom:2px}.host-title{font-size:.8rem;color:var(--muted)}
.step-content{padding:2rem}
.step-title{font-size:1.125rem;font-weight:700;margin-bottom:1.25rem}
.service-list{display:flex;flex-direction:column;gap:.75rem}
.service-card{display:flex;align-items:center;gap:1rem;padding:1.25rem;border:1.5px solid var(--border);border-radius:10px;background:var(--surface);cursor:pointer;text-align:left;transition:all .2s;position:relative;overflow:hidden}
.service-card:hover{border-color:var(--blue);box-shadow:0 2px 12px rgba(59,130,246,.12);transform:translateY(-1px)}
.service-color-bar{position:absolute;left:0;top:0;bottom:0;width:5px}
.service-info{flex:1;padding-left:.5rem;display:flex;flex-direction:column;gap:3px}
.service-label{font-weight:600;font-size:.95rem}.service-desc{font-size:.8rem;color:var(--muted)}
.service-duration{display:flex;align-items:center;gap:4px;font-size:.78rem;color:var(--light)}
.service-arrow{color:var(--light);flex-shrink:0}
.back-btn{display:flex;align-items:center;gap:4px;background:none;border:1px solid var(--border);padding:.4rem .9rem;border-radius:20px;font-size:.8rem;cursor:pointer;color:var(--muted);margin-bottom:1.25rem;transition:all .2s}
.back-btn:hover{border-color:var(--blue);color:var(--blue)}
.datetime-grid{display:grid;grid-template-columns:1fr 200px;gap:1.5rem}
@media(max-width:640px){.datetime-grid{grid-template-columns:1fr}.card-header{flex-direction:column;text-align:center}}
.cal-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem}
.cal-month{font-weight:700;font-size:.95rem}
.icon-btn{background:none;border:1px solid var(--border);width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--blue)}
.icon-btn:hover{background:var(--bg)}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.cal-day-name{text-align:center;font-size:.7rem;font-weight:600;color:var(--muted);padding:.4rem 0;text-transform:uppercase}
.cal-day{aspect-ratio:1;border:none;background:none;border-radius:50%;font-size:.82rem;font-weight:500;color:var(--blue);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
.cal-day:hover:not(:disabled){background:#dbeafe}
.cal-day.selected{background:var(--blue);color:#fff}
.cal-day.today{font-weight:800;outline:2px solid var(--blue)}
.cal-day.past{color:var(--light);cursor:default}
.cal-day.other-month{opacity:0;pointer-events:none}
.slots-section{border-left:1px solid var(--border);padding-left:1rem}
.slots-date-label{font-size:.85rem;font-weight:700;margin-bottom:.75rem}
.slots-list{display:flex;flex-direction:column;gap:.5rem;max-height:340px;overflow-y:auto;padding-right:.25rem}
.slot-row{display:flex;gap:.35rem}
.slot-btn{flex:1;padding:.6rem .5rem;border:1.5px solid var(--blue);border-radius:6px;color:var(--blue);font-weight:600;font-size:.8rem;background:var(--surface);cursor:pointer;transition:all .2s}
.slot-btn:hover{background:#eff6ff}
.slot-btn.slot-active{background:var(--muted);border-color:var(--muted);color:#fff}
.confirm-slot-btn{flex:1;background:var(--blue);color:#fff;border:none;border-radius:6px;font-weight:700;font-size:.8rem;cursor:pointer;animation:fadeIn .2s}
@keyframes fadeIn{from{opacity:0;transform:translateX(6px)}to{opacity:1;transform:none}}
.details-grid{display:grid;grid-template-columns:240px 1fr;gap:2rem}
@media(max-width:640px){.details-grid{grid-template-columns:1fr}}
.details-summary{border:1px solid var(--border);border-radius:10px;padding:1.25rem;display:flex;flex-direction:column;gap:.6rem;align-self:start}
.summary-title{font-size:.95rem;font-weight:700;margin-bottom:.25rem}
.summary-row{display:flex;align-items:center;gap:.5rem;font-size:.8rem;color:var(--muted)}
.summary-row.highlight{color:var(--blue);font-weight:600}
.form-title{font-size:1rem;font-weight:700;margin-bottom:1rem}
.field{display:flex;flex-direction:column;gap:.35rem;margin-bottom:.85rem}
.field label{font-size:.8rem;font-weight:600}
.field input,.field textarea{padding:.6rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-size:.875rem;font-family:inherit;outline:none;transition:border .2s}
.field input:focus,.field textarea:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(59,130,246,.15)}
.submit-btn{width:100%;padding:.875rem;background:var(--blue);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:.95rem;cursor:pointer;transition:background .2s;margin-top:.5rem}
.submit-btn:hover{background:var(--blue-dark)}
.booking-form{display:flex;flex-direction:column}
.success-step{display:flex;flex-direction:column;align-items:center;text-align:center;gap:1rem;padding:3rem 2rem}
.success-step h2{font-size:1.5rem;font-weight:800}
.success-step p{color:var(--muted);font-size:.9rem}
.success-card{width:100%;max-width:360px;border:1.5px solid var(--border);border-radius:10px;padding:1.25rem;text-align:left;display:flex;flex-direction:column;gap:.6rem}
.success-card h3{font-size:.95rem;font-weight:700}
`,
  },
}
