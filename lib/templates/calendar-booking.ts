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
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`,

    // --- DATA ---
    "src/data/services.js": `export const HOST_INFO = {
  name: "Alex Johnson",
  role: "Product Designer",
  company: "BookMe",
  avatar: "https://i.pravatar.cc/80?u=alex"
};

export const SERVICES = [
  { id: '15min', label: '15-Min Quick Sync', duration: 15, color: '#3b82f6', desc: 'A quick chat to align on a topic' },
  { id: '30min', label: '30-Min Introduction', duration: 30, color: '#10b981', desc: 'Get to know each other and discuss goals' },
  { id: '60min', label: '60-Min Deep Dive', duration: 60, color: '#8b5cf6', desc: 'In-depth session with full agenda' },
];

export const generateSlots = () => {
  const times = [];
  for (let h = 9; h < 17; h++) {
    times.push(\`\${h > 12 ? h - 12 : h}:00 \${h < 12 ? 'AM' : 'PM'}\`);
    times.push(\`\${h > 12 ? h - 12 : h}:30 \${h < 12 ? 'AM' : 'PM'}\`);
  }
  return times.filter((_, i) => Math.random() > 0.3);
};`,

    // --- LAYOUT COMPONENTS ---
    "src/components/layout/Header.jsx": `import { HOST_INFO } from '../../data/services';

export default function Header() {
  return (
    <div className="card-header">
      <div className="avatar-wrap">
        <img src={HOST_INFO.avatar} alt="Host" className="avatar" />
      </div>
      <div>
        <h1 className="host-name">{HOST_INFO.name}</h1>
        <p className="host-title">{HOST_INFO.role} · {HOST_INFO.company}</p>
      </div>
    </div>
  );
}`,

    // --- UI COMPONENTS ---
    "src/components/ui/BackButton.jsx": `import { ChevronLeft } from 'lucide-react';

export default function BackButton({ onClick }) {
  return (
    <button className="back-btn" onClick={onClick}>
      <ChevronLeft size={16} /> Back
    </button>
  );
}`,

    "src/components/ui/SlotButton.jsx": `export default function SlotButton({ slot, isActive, onSelect, onConfirm }) {
  return (
    <div className="slot-row">
      <button
        className={\`slot-btn \${isActive ? 'slot-active' : ''}\`}
        onClick={onSelect}
      >
        {slot}
      </button>
      {isActive && (
        <button className="confirm-slot-btn" onClick={onConfirm}>
          Confirm
        </button>
      )}
    </div>
  );
}`,

    // --- BOOKING COMPONENTS ---
    "src/components/booking/ServiceCard.jsx": `import { ChevronRight, Clock } from 'lucide-react';

export default function ServiceCard({ service, onClick }) {
  return (
    <button className="service-card" onClick={onClick}>
      <div className="service-color-bar" style={{ background: service.color }} />
      <div className="service-info">
        <span className="service-label">{service.label}</span>
        <span className="service-desc">{service.desc}</span>
        <span className="service-duration">
          <Clock size={12} /> {service.duration} min · Google Meet
        </span>
      </div>
      <ChevronRight size={18} className="service-arrow" />
    </button>
  );
}`,

    "src/components/booking/ServiceList.jsx": `import { SERVICES } from '../../data/services';
import ServiceCard from './ServiceCard';

export default function ServiceList({ onSelectService }) {
  return (
    <div className="service-list">
      {SERVICES.map(svc => (
        <ServiceCard
          key={svc.id}
          service={svc}
          onClick={() => onSelectService(svc)}
        />
      ))}
    </div>
  );
}`,

    "src/components/booking/Calendar.jsx": `import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  startOfDay
} from 'date-fns';

export default function Calendar({
  currentMonth,
  selectedDate,
  onMonthChange,
  onDateSelect
}) {
  const today = startOfDay(new Date());
  const calStart = startOfWeek(startOfMonth(currentMonth));
  const calEnd = endOfWeek(endOfMonth(currentMonth));
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const handleDateClick = (day) => {
    if (isBefore(day, today)) return;
    if (!isSameMonth(day, currentMonth)) return;
    onDateSelect(day);
  };

  return (
    <div className="calendar-section">
      <div className="cal-nav">
        <button className="icon-btn" onClick={() => onMonthChange(subMonths(currentMonth, 1))}>
          <ChevronLeft size={18} />
        </button>
        <span className="cal-month">{format(currentMonth, 'MMMM yyyy')}</span>
        <button className="icon-btn" onClick={() => onMonthChange(addMonths(currentMonth, 1))}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="cal-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="cal-day-name">{d}</div>
        ))}
        {days.map((day, i) => {
          const isPast = isBefore(day, today);
          const isOtherMonth = !isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isTodayDay = isToday(day);

          return (
            <button
              key={i}
              className={\`cal-day \${isOtherMonth ? 'other-month' : ''} \${isPast ? 'past' : ''} \${isSelected ? 'selected' : ''} \${isTodayDay ? 'today' : ''}\`}
              onClick={() => handleDateClick(day)}
              disabled={isPast || isOtherMonth}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}`,

    "src/components/booking/TimeSlots.jsx": `import { format } from 'date-fns';
import SlotButton from '../ui/SlotButton';

export default function TimeSlots({
  selectedDate,
  availableSlots,
  selectedSlot,
  onSlotSelect,
  onConfirm
}) {
  if (!selectedDate) return null;

  return (
    <div className="slots-section">
      <p className="slots-date-label">{format(selectedDate, 'EEEE, MMMM d')}</p>
      <div className="slots-list">
        {availableSlots.map((slot, i) => (
          <SlotButton
            key={i}
            slot={slot}
            isActive={selectedSlot === slot}
            onSelect={() => onSlotSelect(slot)}
            onConfirm={onConfirm}
          />
        ))}
      </div>
    </div>
  );
}`,

    "src/components/booking/BookingForm.jsx": `export default function BookingForm({ formData, onChange, onSubmit }) {
  const handleChange = (field) => (e) => {
    onChange({ ...formData, [field]: e.target.value });
  };

  return (
    <form className="booking-form" onSubmit={onSubmit}>
      <h3 className="form-title">Enter Your Details</h3>

      <div className="two-col">
        <div className="field">
          <label>Full Name *</label>
          <input
            required
            value={formData.name}
            onChange={handleChange('name')}
            placeholder="Jane Smith"
          />
        </div>
        <div className="field">
          <label>Email Address *</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={handleChange('email')}
            placeholder="jane@example.com"
          />
        </div>
      </div>

      <div className="field">
        <label>Anything to share? (optional)</label>
        <textarea
          rows={3}
          value={formData.notes}
          onChange={handleChange('notes')}
          placeholder="Topics you'd like to cover..."
        />
      </div>

      <button type="submit" className="submit-btn">Schedule Event</button>
    </form>
  );
}`,

    "src/components/booking/SuccessView.jsx": `import { CheckCircle2, Calendar, Video, User } from 'lucide-react';
import { format } from 'date-fns';
import { HOST_INFO } from '../../data/services';

export default function SuccessView({ service, selectedDate, selectedSlot, email, onReset }) {
  return (
    <div className="step-content success-step">
      <CheckCircle2 size={64} color="#10b981" />
      <h2>You're Scheduled!</h2>
      <p>A calendar invitation has been sent to <strong>{email}</strong></p>

      <div className="success-card">
        <h3>{service?.label}</h3>
        <div className="summary-row">
          <User size={14} /> {HOST_INFO.name}
        </div>
        <div className="summary-row highlight">
          <Calendar size={14} />
          {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')} · {selectedSlot}
        </div>
        <div className="summary-row">
          <Video size={14} /> Web conferencing details in the invite
        </div>
      </div>

      <button className="submit-btn" onClick={onReset}>
        Book Another
      </button>
    </div>
  );
}`,

    // --- VIEWS ---
    "src/views/ServiceSelectView.jsx": `import ServiceList from '../components/booking/ServiceList';

export default function ServiceSelectView({ onSelectService }) {
  return (
    <div className="step-content">
      <h2 className="step-title">Select a Meeting Type</h2>
      <ServiceList onSelectService={onSelectService} />
    </div>
  );
}`,

    "src/views/DateTimeSelectView.jsx": `import { useState, useEffect } from 'react';
import BackButton from '../components/ui/BackButton';
import Calendar from '../components/booking/Calendar';
import TimeSlots from '../components/booking/TimeSlots';
import { generateSlots } from '../data/services';

export default function DateTimeSelectView({
  onBack,
  currentMonth,
  selectedDate,
  selectedSlot,
  onMonthChange,
  onDateSelect,
  onSlotSelect,
  onConfirm
}) {
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    if (selectedDate) {
      setSlots(generateSlots());
    }
  }, [selectedDate]);

  return (
    <div className="step-content">
      <BackButton onClick={onBack} />
      <div className="datetime-grid">
        <Calendar
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          onMonthChange={onMonthChange}
          onDateSelect={onDateSelect}
        />
        <TimeSlots
          selectedDate={selectedDate}
          availableSlots={slots}
          selectedSlot={selectedSlot}
          onSlotSelect={onSlotSelect}
          onConfirm={onConfirm}
        />
      </div>
    </div>
  );
}`,

    "src/views/DetailsView.jsx": `import { format } from 'date-fns';
import { Clock, Calendar, Video } from 'lucide-react';
import BackButton from '../components/ui/BackButton';
import BookingForm from '../components/booking/BookingForm';

export default function DetailsView({
  service,
  selectedDate,
  selectedSlot,
  formData,
  onBack,
  onFormChange,
  onSubmit
}) {
  return (
    <div className="step-content">
      <BackButton onClick={onBack} />
      <div className="details-grid">
        <div className="details-summary">
          <h3 className="summary-title">{service?.label}</h3>
          <div className="summary-row">
            <Clock size={14} /> {service?.duration} min
          </div>
          <div className="summary-row highlight">
            <Calendar size={14} />
            {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')} · {selectedSlot}
          </div>
          <div className="summary-row">
            <Video size={14} /> Google Meet (link sent via email)
          </div>
        </div>
        <BookingForm
          formData={formData}
          onChange={onFormChange}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}`,

    // --- MAIN APP ---
    "src/App.jsx": `import { useState } from 'react';
import Header from './components/layout/Header';
import ServiceSelectView from './views/ServiceSelectView';
import DateTimeSelectView from './views/DateTimeSelectView';
import DetailsView from './views/DetailsView';
import SuccessView from './components/booking/SuccessView';
import './App.css';

function App() {
  const [step, setStep] = useState('service');
  const [service, setService] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', notes: '' });

  const handleSelectService = (svc) => {
    setService(svc);
    setStep('datetime');
  };

  const handleSelectDate = (day) => {
    setSelectedDate(day);
    setSelectedSlot(null);
  };

  const handleConfirmTime = () => {
    if (selectedSlot) setStep('details');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStep('success');
  };

  const handleReset = () => {
    setStep('service');
    setService(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setForm({ name: '', email: '', notes: '' });
  };

  return (
    <div className="page-wrapper">
      <div className="card">
        <Header />

        {step === 'service' && (
          <ServiceSelectView onSelectService={handleSelectService} />
        )}

        {step === 'datetime' && (
          <DateTimeSelectView
            onBack={() => setStep('service')}
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            onMonthChange={setCurrentMonth}
            onDateSelect={handleSelectDate}
            onSlotSelect={setSelectedSlot}
            onConfirm={handleConfirmTime}
          />
        )}

        {step === 'details' && (
          <DetailsView
            service={service}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            formData={form}
            onBack={() => setStep('datetime')}
            onFormChange={setForm}
            onSubmit={handleSubmit}
          />
        )}

        {step === 'success' && (
          <SuccessView
            service={service}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            email={form.email}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}

export default App;`,

    // --- STYLES ---
    "src/App.css": `:root {
  --blue: #3b82f6;
  --blue-dark: #2563eb;
  --green: #10b981;
  --purple: #8b5cf6;
  --surface: #fff;
  --bg: #f0f4f8;
  --border: #e2e8f0;
  --text: #1a202c;
  --muted: #64748b;
  --light: #94a3b8;
}

.page-wrapper {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
}

.card {
  background: var(--surface);
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.10);
  overflow: hidden;
}

/* Header */
.card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg, #f8faff 0%, #f0f4f8 100%);
}

.avatar-wrap {
  flex-shrink: 0;
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid var(--blue);
}

.host-name {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 2px;
}

.host-title {
  font-size: 0.8rem;
  color: var(--muted);
}

/* Step Content */
.step-content {
  padding: 2rem;
}

.step-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 1.25rem;
}

/* Service Cards */
.service-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.service-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.service-card:hover {
  border-color: var(--blue);
  box-shadow: 0 2px 12px rgba(59, 130, 246, 0.12);
  transform: translateY(-1px);
}

.service-color-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
}

.service-info {
  flex: 1;
  padding-left: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.service-label {
  font-weight: 600;
  font-size: 0.95rem;
}

.service-desc {
  font-size: 0.8rem;
  color: var(--muted);
}

.service-duration {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  color: var(--light);
}

.service-arrow {
  color: var(--light);
  flex-shrink: 0;
}

/* Back Button */
.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px solid var(--border);
  padding: 0.4rem 0.9rem;
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  color: var(--muted);
  margin-bottom: 1.25rem;
  transition: all 0.2s;
}

.back-btn:hover {
  border-color: var(--blue);
  color: var(--blue);
}

/* DateTime Grid */
.datetime-grid {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 1.5rem;
}

@media (max-width: 640px) {
  .datetime-grid {
    grid-template-columns: 1fr;
  }
  .card-header {
    flex-direction: column;
    text-align: center;
  }
}

/* Calendar */
.cal-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.cal-month {
  font-weight: 700;
  font-size: 0.95rem;
}

.icon-btn {
  background: none;
  border: 1px solid var(--border);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--blue);
}

.icon-btn:hover {
  background: var(--bg);
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.cal-day-name {
  text-align: center;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--muted);
  padding: 0.4rem 0;
  text-transform: uppercase;
}

.cal-day {
  aspect-ratio: 1;
  border: none;
  background: none;
  border-radius: 50%;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--blue);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.cal-day:hover:not(:disabled) {
  background: #dbeafe;
}

.cal-day.selected {
  background: var(--blue);
  color: #fff;
}

.cal-day.today {
  font-weight: 800;
  outline: 2px solid var(--blue);
}

.cal-day.past {
  color: var(--light);
  cursor: default;
}

.cal-day.other-month {
  opacity: 0;
  pointer-events: none;
}

/* Time Slots */
.slots-section {
  border-left: 1px solid var(--border);
  padding-left: 1rem;
}

.slots-date-label {
  font-size: 0.85rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.slots-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 340px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.slot-row {
  display: flex;
  gap: 0.35rem;
}

.slot-btn {
  flex: 1;
  padding: 0.6rem 0.5rem;
  border: 1.5px solid var(--blue);
  border-radius: 6px;
  color: var(--blue);
  font-weight: 600;
  font-size: 0.8rem;
  background: var(--surface);
  cursor: pointer;
  transition: all 0.2s;
}

.slot-btn:hover {
  background: #eff6ff;
}

.slot-btn.slot-active {
  background: var(--muted);
  border-color: var(--muted);
  color: #fff;
}

.confirm-slot-btn {
  flex: 1;
  background: var(--blue);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateX(6px); }
  to { opacity: 1; transform: none; }
}

/* Details View */
.details-grid {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 2rem;
}

@media (max-width: 640px) {
  .details-grid {
    grid-template-columns: 1fr;
  }
}

.details-summary {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  align-self: start;
}

.summary-title {
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.summary-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--muted);
}

.summary-row.highlight {
  color: var(--blue);
  font-weight: 600;
}

/* Booking Form */
.booking-form {
  display: flex;
  flex-direction: column;
}

.form-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  margin-bottom: 0.85rem;
}

@media (max-width: 480px) {
  .two-col {
    grid-template-columns: 1fr;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
}

.field label {
  font-size: 0.8rem;
  font-weight: 600;
}

.field input,
.field textarea {
  padding: 0.6rem 0.75rem;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: inherit;
  outline: none;
  transition: border 0.2s;
}

.field input:focus,
.field textarea:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.submit-btn {
  width: 100%;
  padding: 0.875rem;
  background: var(--blue);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 0.5rem;
}

.submit-btn:hover {
  background: var(--blue-dark);
}

/* Success View */
.success-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
  padding: 3rem 2rem;
}

.success-step h2 {
  font-size: 1.5rem;
  font-weight: 800;
}

.success-step p {
  color: var(--muted);
  font-size: 0.9rem;
}

.success-card {
  width: 100%;
  max-width: 360px;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 1.25rem;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.success-card h3 {
  font-size: 0.95rem;
  font-weight: 700;
}`,

    "src/index.css": `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #f0f4f8;
  min-height: 100vh;
  color: #1a202c;
}

#root {
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}`,
  },
};
