export const meetingSchedulerTemplate = {
  id: "meeting-scheduler",
  name: "Meeting Scheduler",
  description: "Team meeting planner with time slots, agenda & timezone",
  category: "booking",
  files: {
    "package.json": JSON.stringify({
      name: "meeting-scheduler", private: true, version: "0.0.0", type: "module",
      scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
      dependencies: { react: "^18.2.0", "react-dom": "^18.2.0", "lucide-react": "^0.344.0" },
      devDependencies: { "@vitejs/plugin-react": "^4.2.1", vite: "^5.0.8" },
    }, null, 2),

    "index.html": `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Meeting Scheduler</title></head>
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
#root{max-width:960px;margin:0 auto;padding:2rem 1rem}`,

    "src/App.jsx": `import { useState } from 'react'
import { Clock, Users, Plus, X, Check, Calendar, Globe, AlignLeft, Video } from 'lucide-react'
import './App.css'

const TIME_SLOTS = [
  '8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM',
  '11:00 AM','11:30 AM','12:00 PM','1:00 PM','1:30 PM','2:00 PM',
  '2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM'
]

const DURATIONS = ['15 min','30 min','45 min','1 hour','1.5 hours','2 hours']

const TIMEZONES = [
  { label:'EST (New York)', offset:'-5' },
  { label:'CST (Chicago)', offset:'-6' },
  { label:'MST (Denver)', offset:'-7' },
  { label:'PST (Los Angeles)', offset:'-8' },
  { label:'UTC', offset:'+0' },
  { label:'CET (Paris)', offset:'+1' },
]

export default function App() {
  const [step, setStep] = useState('setup')
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState('30 min')
  const [timezone, setTimezone] = useState(TIMEZONES[0].label)
  const [selectedSlots, setSelectedSlots] = useState([])
  const [attendeeInput, setAttendeeInput] = useState('')
  const [attendees, setAttendees] = useState([])
  const [agenda, setAgenda] = useState('')
  const [platform, setPlatform] = useState('Google Meet')
  const [finalSlot, setFinalSlot] = useState('')
  const [scheduled, setScheduled] = useState(false)
  const [meetings, setMeetings] = useState([])

  const toggleSlot = (slot) => {
    setSelectedSlots(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    )
  }

  const addAttendee = () => {
    const email = attendeeInput.trim()
    if (email && !attendees.includes(email)) {
      setAttendees(prev => [...prev, email])
      setAttendeeInput('')
    }
  }

  const handleSchedule = () => {
    if (!title || !finalSlot || attendees.length === 0) return
    setMeetings(prev => [{
      id: Date.now(), title, duration, timezone, slot: finalSlot,
      attendees: [...attendees], agenda, platform
    }, ...prev])
    setScheduled(true)
  }

  const handleReset = () => {
    setStep('setup'); setTitle(''); setDuration('30 min'); setTimezone(TIMEZONES[0].label)
    setSelectedSlots([]); setAttendees([]); setAttendeeInput('')
    setAgenda(''); setPlatform('Google Meet'); setFinalSlot(''); setScheduled(false)
  }

  return (
    <div>
      <div className="page-header">
        <h1>Meeting Scheduler</h1>
        <p>Set up a meeting and invite your team in seconds.</p>
      </div>

      <div className="layout">
        <div className="main-col">
          {/* Step 1: Meeting Details */}
          {step === 'setup' && !scheduled && (
            <div className="card">
              <h2 className="card-title"><Calendar size={18}/> Meeting Details</h2>
              <div className="field"><label>Meeting Title *</label>
                <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Q1 Planning Session" />
              </div>
              <div className="two-col">
                <div className="field"><label><Clock size={13}/> Duration</label>
                  <select value={duration} onChange={e=>setDuration(e.target.value)}>
                    {DURATIONS.map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="field"><label><Globe size={13}/> Timezone</label>
                  <select value={timezone} onChange={e=>setTimezone(e.target.value)}>
                    {TIMEZONES.map(tz=><option key={tz.label}>{tz.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="field"><label><Video size={13}/> Platform</label>
                <div className="platform-row">
                  {['Google Meet','Zoom','Teams','In-Person'].map(p=>(
                    <button key={p} className={\`platform-btn \${platform===p?'active':''}\`} onClick={()=>setPlatform(p)}>{p}</button>
                  ))}
                </div>
              </div>
              <div className="field"><label><Users size={13}/> Invite Attendees</label>
                <div className="attendee-input-row">
                  <input value={attendeeInput} onChange={e=>setAttendeeInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addAttendee()} placeholder="name@company.com" />
                  <button className="add-btn" onClick={addAttendee}><Plus size={16}/></button>
                </div>
                <div className="chip-list">
                  {attendees.map(a=>(
                    <span key={a} className="chip">{a}<button onClick={()=>setAttendees(prev=>prev.filter(x=>x!==a))}><X size={12}/></button></span>
                  ))}
                </div>
              </div>
              <div className="field"><label><AlignLeft size={13}/> Agenda (optional)</label>
                <textarea rows={3} value={agenda} onChange={e=>setAgenda(e.target.value)} placeholder="1. Introductions&#10;2. Q1 goals review&#10;3. Action items" />
              </div>
              <button className="primary-btn" onClick={()=>setStep('slots')} disabled={!title || attendees.length===0}>
                Choose Time Slots →
              </button>
            </div>
          )}

          {/* Step 2: Pick Slots */}
          {step === 'slots' && !scheduled && (
            <div className="card">
              <button className="back-link" onClick={()=>setStep('setup')}>← Back</button>
              <h2 className="card-title"><Clock size={18}/> Select Available Time Slots</h2>
              <p className="helper-text">Select all time slots that could work, then confirm one.</p>
              <div className="slots-grid">
                {TIME_SLOTS.map(slot=>(
                  <button key={slot} className={\`slot \${selectedSlots.includes(slot)?'active':''}\`} onClick={()=>toggleSlot(slot)}>
                    {slot}
                    {selectedSlots.includes(slot) && <Check size={12}/>}
                  </button>
                ))}
              </div>
              {selectedSlots.length > 0 && (
                <div className="confirm-section">
                  <h3>Confirm Final Time</h3>
                  <select value={finalSlot} onChange={e=>setFinalSlot(e.target.value)}>
                    <option value="">Choose a slot…</option>
                    {selectedSlots.map(s=><option key={s}>{s}</option>)}
                  </select>
                  <button className="primary-btn" onClick={handleSchedule} disabled={!finalSlot}>
                    Schedule Meeting
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Success */}
          {scheduled && (
            <div className="card success-wrap">
              <Check size={52} color="#10b981" strokeWidth={2.5}/>
              <h2>Meeting Scheduled!</h2>
              <p>Invites sent to {attendees.length} attendee{attendees.length>1?'s':''}</p>
              <div className="meeting-summary">
                <div className="ms-title">{title}</div>
                <div className="ms-row"><Clock size={13}/> {finalSlot} · {duration}</div>
                <div className="ms-row"><Globe size={13}/> {timezone}</div>
                <div className="ms-row"><Video size={13}/> {platform}</div>
                <div className="ms-row"><Users size={13}/> {attendees.join(', ')}</div>
                {agenda && <div className="ms-agenda"><AlignLeft size={13}/><span>{agenda}</span></div>}
              </div>
              <button className="primary-btn" onClick={handleReset}>Schedule Another</button>
            </div>
          )}
        </div>

        {/* Sidebar: Upcoming Meetings */}
        <div className="sidebar">
          <h3 className="sidebar-title"><Calendar size={15}/> Scheduled Meetings</h3>
          {meetings.length === 0
            ? <p className="empty-state">No meetings yet. Schedule your first one!</p>
            : meetings.map(m=>(
              <div key={m.id} className="meeting-card">
                <div className="mc-title">{m.title}</div>
                <div className="mc-meta"><Clock size={12}/> {m.slot} · {m.duration}</div>
                <div className="mc-meta"><Users size={12}/> {m.attendees.length} attendee{m.attendees.length>1?'s':''}</div>
                <div className="mc-meta"><Video size={12}/> {m.platform}</div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}`,

    "src/App.css": `:root{--blue:#3b82f6;--blue-dark:#2563eb;--green:#10b981;--surface:#fff;--border:#e2e8f0;--muted:#64748b;--bg:#f1f5f9}
.page-header{margin-bottom:1.5rem}
.page-header h1{font-size:1.6rem;font-weight:800}
.page-header p{color:var(--muted);font-size:.875rem;margin-top:.25rem}
.layout{display:grid;grid-template-columns:1fr 280px;gap:1.25rem}
@media(max-width:700px){.layout{grid-template-columns:1fr}}
.main-col{display:flex;flex-direction:column;gap:1rem}
.card{background:var(--surface);border-radius:14px;box-shadow:0 2px 16px rgba(0,0,0,.08);padding:1.75rem;display:flex;flex-direction:column;gap:1rem}
.card-title{display:flex;align-items:center;gap:.5rem;font-size:1rem;font-weight:700}
.field{display:flex;flex-direction:column;gap:.35rem}
.field label{display:flex;align-items:center;gap:.3rem;font-size:.8rem;font-weight:600}
.field input,.field select,.field textarea{padding:.65rem .85rem;border:1.5px solid var(--border);border-radius:8px;font-size:.875rem;font-family:inherit;outline:none;background:var(--surface)}
.field input:focus,.field select:focus,.field textarea:focus{border-color:var(--blue)}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}
@media(max-width:480px){.two-col{grid-template-columns:1fr}}
.platform-row{display:flex;flex-wrap:wrap;gap:.5rem}
.platform-btn{padding:.45rem .85rem;border:1.5px solid var(--border);border-radius:20px;font-size:.8rem;font-weight:500;cursor:pointer;background:var(--surface);transition:all .2s}
.platform-btn.active{border-color:var(--blue);background:#eff6ff;color:var(--blue);font-weight:700}
.attendee-input-row{display:flex;gap:.4rem}
.attendee-input-row input{flex:1}
.add-btn{padding:.65rem .85rem;background:var(--blue);color:#fff;border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center}
.chip-list{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.35rem}
.chip{display:flex;align-items:center;gap:.3rem;background:#eff6ff;color:var(--blue);border-radius:20px;padding:.25rem .65rem;font-size:.78rem;font-weight:600}
.chip button{background:none;border:none;cursor:pointer;color:var(--blue);display:flex;align-items:center;padding:0}
.helper-text{font-size:.8rem;color:var(--muted)}
.slots-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem}
@media(max-width:480px){.slots-grid{grid-template-columns:repeat(2,1fr)}}
.slot{display:flex;align-items:center;justify-content:space-between;padding:.55rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-size:.82rem;font-weight:500;cursor:pointer;background:var(--surface);transition:all .2s}
.slot:hover{border-color:var(--blue)}
.slot.active{border-color:var(--blue);background:#eff6ff;color:var(--blue)}
.confirm-section{border-top:1px solid var(--border);padding-top:1rem;display:flex;flex-direction:column;gap:.75rem}
.confirm-section h3{font-size:.9rem;font-weight:700}
.confirm-section select{padding:.65rem .85rem;border:1.5px solid var(--border);border-radius:8px;font-size:.875rem;font-family:inherit;outline:none}
.back-link{background:none;border:none;color:var(--muted);font-size:.82rem;cursor:pointer;padding:0;align-self:flex-start}
.back-link:hover{color:var(--blue)}
.primary-btn{padding:.85rem;background:linear-gradient(135deg,var(--blue),var(--blue-dark));color:#fff;border:none;border-radius:10px;font-weight:700;font-size:.9rem;cursor:pointer;transition:opacity .2s}
.primary-btn:disabled{opacity:.4;cursor:not-allowed}
.primary-btn:hover:not(:disabled){opacity:.9}
.success-wrap{align-items:center;text-align:center;gap:.85rem}
.success-wrap h2{font-size:1.4rem;font-weight:800}
.success-wrap p{color:var(--muted);font-size:.875rem}
.meeting-summary{width:100%;max-width:400px;border:1.5px solid var(--border);border-radius:10px;padding:1.1rem;text-align:left;display:flex;flex-direction:column;gap:.5rem}
.ms-title{font-size:1rem;font-weight:700;margin-bottom:.25rem}
.ms-row{display:flex;align-items:center;gap:.4rem;font-size:.8rem;color:var(--muted)}
.ms-agenda{display:flex;align-items:flex-start;gap:.4rem;font-size:.78rem;color:var(--muted)}
.ms-agenda span{white-space:pre-line;line-height:1.5}
.sidebar{display:flex;flex-direction:column;gap:.75rem;align-self:start;position:sticky;top:1rem}
.sidebar-title{display:flex;align-items:center;gap:.4rem;font-size:.875rem;font-weight:700}
.empty-state{font-size:.8rem;color:var(--muted);background:var(--surface);border-radius:10px;padding:1rem;text-align:center}
.meeting-card{background:var(--surface);border-radius:10px;padding:1rem;box-shadow:0 2px 10px rgba(0,0,0,.07);display:flex;flex-direction:column;gap:.4rem}
.mc-title{font-size:.875rem;font-weight:700}
.mc-meta{display:flex;align-items:center;gap:.35rem;font-size:.78rem;color:var(--muted)}
`,
  },
}
