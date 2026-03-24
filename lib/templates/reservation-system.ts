export const reservationSystemTemplate = {
  id: "reservation-system",
  name: "Reservation System",
  description: "General-purpose reservations for any service or venue",
  category: "booking",
  files: {
    "package.json": JSON.stringify(
      {
        name: "reservation-system",
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
    <title>Reservation System</title>
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
    "src/data/services.js": `export const SERVICES = [
  { id: 's1', name: 'Table for 2', icon: '🍽️', capacity: 2, desc: 'Intimate dining for two', price: 0 },
  { id: 's2', name: 'Table for 4', icon: '🥂', capacity: 4, desc: 'Perfect for a family dinner', price: 0 },
  { id: 's3', name: 'Private Dining Room', icon: '✨', capacity: 12, desc: 'Exclusive private room for events', price: 150 },
  { id: 's4', name: 'Bar Seating', icon: '🍺', capacity: 1, desc: 'Cozy bar counter seats', price: 0 },
];

export const generateDates = () => {
  const dates = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    dates.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
  }
  return dates;
};

export const TIMES = [
  '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM',
  '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM'
];

export const SPECIALS = ['None', 'Birthday', 'Anniversary', 'Business Dinner', 'Date Night', 'Baby Shower'];

export const generateConfirmId = () => 'RES-' + Math.floor(Math.random() * 900000 + 100000);`,

    // --- LAYOUT COMPONENTS ---
    "src/components/layout/Hero.jsx": `import { Utensils } from 'lucide-react';

export default function Hero() {
  return (
    <div className="hero">
      <div className="hero-icon">
        <Utensils size={26} color="#fff" />
      </div>
      <div>
        <h1>Bella Vista Restaurant</h1>
        <p>Reserve your table online — quick & easy</p>
      </div>
    </div>
  );
}`,

    // --- UI COMPONENTS ---
    "src/components/ui/BackLink.jsx": `export default function BackLink({ onClick }) {
  return (
    <button className="back-link" onClick={onClick}>
      ← Back
    </button>
  );
}`,

    "src/components/ui/GuestSelector.jsx": `export default function GuestSelector({ guests, maxCapacity, onChange }) {
  return (
    <div className="qty-row">
      <button onClick={() => onChange(Math.max(1, guests - 1))}>−</button>
      <span>{guests} guest{guests > 1 ? 's' : ''}</span>
      <button onClick={() => onChange(Math.min(maxCapacity, guests + 1))}>+</button>
      <span className="cap-note">max {maxCapacity}</span>
    </div>
  );
}`,

    // --- RESERVATION COMPONENTS ---
    "src/components/reservation/ServiceCard.jsx": `import { CheckCircle2 } from 'lucide-react';

export default function ServiceCard({ service, isSelected, onSelect }) {
  return (
    <button
      className={\`svc-card \${isSelected ? 'chosen' : ''}\`}
      onClick={onSelect}
    >
      <span className="svc-icon">{service.icon}</span>
      <span className="svc-name">{service.name}</span>
      <span className="svc-desc">{service.desc}</span>
      {service.price > 0 && (
        <span className="svc-price">\${service.price} deposit</span>
      )}
      {isSelected && <CheckCircle2 size={16} className="svc-check" />}
    </button>
  );
}`,

    "src/components/reservation/ServiceGrid.jsx": `import { SERVICES } from '../../data/services';
import ServiceCard from './ServiceCard';

export default function ServiceGrid({ selectedServiceId, onSelectService }) {
  return (
    <div className="service-grid">
      {SERVICES.map(s => (
        <ServiceCard
          key={s.id}
          service={s}
          isSelected={selectedServiceId === s.id}
          onSelect={() => onSelectService(s)}
        />
      ))}
    </div>
  );
}`,

    "src/components/reservation/DateTimePicker.jsx": `import { CalendarDays, Clock } from 'lucide-react';
import { TIMES, generateDates } from '../../data/services';

const DATES = generateDates();

export default function DateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange
}) {
  return (
    <div className="two-col">
      <div className="field">
        <label><CalendarDays size={13} /> Date</label>
        <select value={date} onChange={(e) => onDateChange(e.target.value)}>
          <option value="">Pick a date…</option>
          {DATES.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>
      <div className="field">
        <label><Clock size={13} /> Time</label>
        <select value={time} onChange={(e) => onTimeChange(e.target.value)}>
          <option value="">Pick a time…</option>
          {TIMES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
    </div>
  );
}`,

    "src/components/reservation/ReservationForm.jsx": `import { SPECIALS } from '../../data/services';

export default function ReservationForm({ formData, onChange, onSubmit }) {
  const handleChange = (field) => (e) => {
    onChange({ ...formData, [field]: e.target.value });
  };

  return (
    <form className="res-form" onSubmit={onSubmit}>
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
          <label>Email *</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={handleChange('email')}
            placeholder="jane@email.com"
          />
        </div>
      </div>

      <div className="two-col">
        <div className="field">
          <label>Phone</label>
          <input
            value={formData.phone}
            onChange={handleChange('phone')}
            placeholder="+1 (555) 000-0000"
          />
        </div>
        <div className="field">
          <label>Special Occasion</label>
          <select value={formData.special} onChange={handleChange('special')}>
            {SPECIALS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="field">
        <label>Additional Requests</label>
        <textarea
          rows={2}
          value={formData.notes}
          onChange={handleChange('notes')}
          placeholder="Allergies, seating preferences, accessibility needs…"
        />
      </div>

      <button type="submit" className="primary-btn">Confirm Reservation</button>
    </form>
  );
}`,

    "src/components/reservation/ReservationSummary.jsx": `import { CalendarDays, Clock, Users } from 'lucide-react';

export default function ReservationSummary({ service, date, time, guests }) {
  return (
    <div className="res-summary">
      <span>{service?.icon} {service?.name}</span>
      <span><CalendarDays size={12} /> {date}</span>
      <span><Clock size={12} /> {time}</span>
      <span><Users size={12} /> {guests} guests</span>
    </div>
  );
}`,

    "src/components/reservation/ReservationTicket.jsx": `import { CalendarDays, Clock, Users } from 'lucide-react';

export default function ReservationTicket({ service, date, time, guests, special, confirmId }) {
  return (
    <div className="res-ticket">
      <div className="rt-head">
        <span className="rt-icon">{service?.icon}</span>
        <div>
          <div className="rt-name">{service?.name}</div>
          <div className="rt-id">{confirmId}</div>
        </div>
      </div>
      <div className="rt-rows">
        <div className="rt-row">
          <CalendarDays size={13} /> {date}
        </div>
        <div className="rt-row">
          <Clock size={13} /> {time}
        </div>
        <div className="rt-row">
          <Users size={13} /> {guests} guest{guests > 1 ? 's' : ''}
        </div>
        {special !== 'None' && (
          <div className="rt-row">🎉 {special}</div>
        )}
      </div>
    </div>
  );
}`,

    "src/components/reservation/SuccessView.jsx": `import { CheckCircle2 } from 'lucide-react';
import ReservationTicket from './ReservationTicket';

export default function SuccessView({
  service,
  date,
  time,
  guests,
  email,
  special,
  confirmId,
  onReset
}) {
  return (
    <div className="card success-wrap">
      <CheckCircle2 size={56} color="#10b981" />
      <h2>Reservation Confirmed!</h2>
      <p>We'll send a confirmation to <strong>{email}</strong></p>
      <ReservationTicket
        service={service}
        date={date}
        time={time}
        guests={guests}
        special={special}
        confirmId={confirmId}
      />
      <button className="primary-btn" onClick={onReset}>
        Make Another Reservation
      </button>
    </div>
  );
}`,

    "src/components/reservation/ReservationCard.jsx": `import { X } from 'lucide-react';

export default function ReservationCard({ reservation, onCancel }) {
  return (
    <div className="res-card">
      <div className="rc-top">
        <span className="rc-title">
          {reservation.service?.icon} {reservation.service?.name}
        </span>
        <button className="cancel-btn" onClick={() => onCancel(reservation.id)}>
          <X size={12} />
        </button>
      </div>
      <div className="rc-meta">{reservation.name}</div>
      <div className="rc-meta">{reservation.date} · {reservation.time}</div>
      <div className="rc-meta">{reservation.guests} guest{reservation.guests > 1 ? 's' : ''}</div>
      <code className="rc-id">{reservation.confirmId}</code>
    </div>
  );
}`,

    "src/components/reservation/ReservationsSidebar.jsx": `import ReservationCard from './ReservationCard';

export default function ReservationsSidebar({ reservations, onCancelReservation }) {
  return (
    <div className="sidebar">
      <h3 className="sidebar-title">Upcoming Reservations</h3>
      {reservations.length === 0 ? (
        <p className="empty-state">No reservations yet.</p>
      ) : (
        reservations.map(r => (
          <ReservationCard
            key={r.id}
            reservation={r}
            onCancel={onCancelReservation}
          />
        ))
      )}
    </div>
  );
}`,

    // --- VIEWS ---
    "src/views/SelectView.jsx": `import { Users } from 'lucide-react';
import ServiceGrid from '../components/reservation/ServiceGrid';
import DateTimePicker from '../components/reservation/DateTimePicker';
import GuestSelector from '../components/ui/GuestSelector';

export default function SelectView({
  selectedService,
  date,
  time,
  guests,
  onSelectService,
  onDateChange,
  onTimeChange,
  onGuestsChange,
  onContinue
}) {
  const canContinue = selectedService && date && time;

  return (
    <div className="card">
      <h2 className="card-title">Select Seating Option</h2>
      <ServiceGrid
        selectedServiceId={selectedService?.id}
        onSelectService={onSelectService}
      />

      {selectedService && (
        <>
          <DateTimePicker
            date={date}
            time={time}
            onDateChange={onDateChange}
            onTimeChange={onTimeChange}
          />
          <div className="field">
            <label><Users size={13} /> Party Size</label>
            <GuestSelector
              guests={guests}
              maxCapacity={selectedService.capacity}
              onChange={onGuestsChange}
            />
          </div>
        </>
      )}

      <button
        className="primary-btn"
        disabled={!canContinue}
        onClick={onContinue}
      >
        Continue to Details →
      </button>
    </div>
  );
}`,

    "src/views/DetailsView.jsx": `import BackLink from '../components/ui/BackLink';
import ReservationSummary from '../components/reservation/ReservationSummary';
import ReservationForm from '../components/reservation/ReservationForm';

export default function DetailsView({
  service,
  date,
  time,
  guests,
  formData,
  onBack,
  onFormChange,
  onSubmit
}) {
  return (
    <div className="card">
      <BackLink onClick={onBack} />
      <h2 className="card-title">Your Information</h2>
      <ReservationSummary
        service={service}
        date={date}
        time={time}
        guests={guests}
      />
      <ReservationForm
        formData={formData}
        onChange={onFormChange}
        onSubmit={onSubmit}
      />
    </div>
  );
}`,

    // --- MAIN APP ---
    "src/App.jsx": `import { useState, useMemo } from 'react';
import { generateConfirmId } from './data/services';
import Hero from './components/layout/Hero';
import SelectView from './views/SelectView';
import DetailsView from './views/DetailsView';
import SuccessView from './components/reservation/SuccessView';
import ReservationsSidebar from './components/reservation/ReservationsSidebar';
import './App.css';

function App() {
  const [step, setStep] = useState('select');
  const [service, setService] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState(2);
  const [form, setForm] = useState({ name: '', email: '', phone: '', special: 'None', notes: '' });
  const [reservations, setReservations] = useState([]);
  const confirmId = useMemo(() => generateConfirmId(), []);

  const handleBook = (e) => {
    e.preventDefault();
    const reservation = {
      id: Date.now(),
      service,
      date,
      time,
      guests,
      name: form.name,
      email: form.email,
      special: form.special,
      confirmId
    };
    setReservations(prev => [reservation, ...prev]);
    setStep('success');
  };

  const handleReset = () => {
    setStep('select');
    setService(null);
    setDate('');
    setTime('');
    setGuests(2);
    setForm({ name: '', email: '', phone: '', special: 'None', notes: '' });
  };

  const cancelReservation = (id) => {
    setReservations(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="app-wrap">
      <Hero />

      <div className="layout">
        <div className="main-col">
          {step === 'select' && (
            <SelectView
              selectedService={service}
              date={date}
              time={time}
              guests={guests}
              onSelectService={setService}
              onDateChange={setDate}
              onTimeChange={setTime}
              onGuestsChange={setGuests}
              onContinue={() => setStep('details')}
            />
          )}

          {step === 'details' && (
            <DetailsView
              service={service}
              date={date}
              time={time}
              guests={guests}
              formData={form}
              onBack={() => setStep('select')}
              onFormChange={setForm}
              onSubmit={handleBook}
            />
          )}

          {step === 'success' && (
            <SuccessView
              service={service}
              date={date}
              time={time}
              guests={guests}
              email={form.email}
              special={form.special}
              confirmId={confirmId}
              onReset={handleReset}
            />
          )}
        </div>

        <ReservationsSidebar
          reservations={reservations}
          onCancelReservation={cancelReservation}
        />
      </div>
    </div>
  );
}

export default App;`,

    // --- STYLES ---
    "src/App.css": `:root {
  --blue: #4f46e5;
  --blue-dark: #4338ca;
  --green: #10b981;
  --surface: #fff;
  --border: #e2e8f0;
  --muted: #64748b;
  --bg: #fafafa;
}

.app-wrap {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Hero */
.hero {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  border-radius: 14px;
  padding: 1.5rem 1.75rem;
}

.hero-icon {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hero h1 {
  font-size: 1.4rem;
  font-weight: 800;
}

.hero p {
  font-size: 0.82rem;
  opacity: 0.85;
  margin-top: 0.2rem;
}

/* Layout */
.layout {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 1.25rem;
}

@media (max-width: 700px) {
  .layout {
    grid-template-columns: 1fr;
  }
}

.main-col {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Card */
.card {
  background: var(--surface);
  border-radius: 14px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
}

/* Service Grid */
.service-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.75rem;
}

.svc-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.3rem;
  padding: 1rem;
  border: 2px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  position: relative;
}

.svc-card:hover {
  border-color: var(--blue);
}

.svc-card.chosen {
  border-color: var(--blue);
  background: #eef2ff;
}

.svc-icon {
  font-size: 1.5rem;
}

.svc-name {
  font-size: 0.875rem;
  font-weight: 700;
}

.svc-desc {
  font-size: 0.76rem;
  color: var(--muted);
  line-height: 1.4;
}

.svc-price {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--blue);
}

.svc-check {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  color: var(--green);
}

/* Form Elements */
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

@media (max-width: 500px) {
  .two-col {
    grid-template-columns: 1fr;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.field input,
.field select,
.field textarea {
  padding: 0.6rem 0.8rem;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
  background: var(--surface);
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  border-color: var(--blue);
}

/* Guest Selector */
.qty-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.qty-row button {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  background: var(--surface);
  font-size: 1rem;
  cursor: pointer;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qty-row button:hover {
  border-color: var(--blue);
}

.qty-row span {
  font-size: 0.875rem;
  font-weight: 600;
}

.cap-note {
  font-size: 0.75rem;
  color: var(--muted);
  margin-left: 0.25rem;
}

/* Back Link */
.back-link {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 0.82rem;
  cursor: pointer;
  padding: 0;
  align-self: flex-start;
}

.back-link:hover {
  color: var(--blue);
}

/* Reservation Summary */
.res-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  background: #f8f9ff;
  border-radius: 8px;
  padding: 0.75rem;
}

.res-summary span {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  background: #eef2ff;
  border-radius: 20px;
  padding: 0.25rem 0.65rem;
  font-weight: 600;
  color: var(--blue);
}

/* Reservation Form */
.res-form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

/* Primary Button */
.primary-btn {
  padding: 0.875rem;
  background: linear-gradient(135deg, var(--blue), var(--blue-dark));
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.primary-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.primary-btn:hover:not(:disabled) {
  opacity: 0.9;
}

/* Success View */
.success-wrap {
  align-items: center;
  text-align: center;
  gap: 0.85rem;
}

.success-wrap h2 {
  font-size: 1.4rem;
  font-weight: 800;
}

.success-wrap p {
  color: var(--muted);
  font-size: 0.875rem;
}

/* Reservation Ticket */
.res-ticket {
  width: 100%;
  max-width: 380px;
  border: 2px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.rt-head {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: #eef2ff;
  border-bottom: 1px solid var(--border);
}

.rt-icon {
  font-size: 1.75rem;
}

.rt-name {
  font-weight: 700;
  font-size: 0.95rem;
}

.rt-id {
  font-size: 0.75rem;
  color: var(--muted);
  font-family: monospace;
}

.rt-rows {
  padding: 0.85rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.rt-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  color: var(--muted);
}

/* Sidebar */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-self: start;
  position: sticky;
  top: 1rem;
}

.sidebar-title {
  font-size: 0.875rem;
  font-weight: 700;
}

.empty-state {
  font-size: 0.8rem;
  color: var(--muted);
  background: var(--surface);
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
}

/* Reservation Card */
.res-card {
  background: var(--surface);
  border-radius: 10px;
  padding: 0.9rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.rc-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rc-title {
  font-size: 0.875rem;
  font-weight: 700;
}

.cancel-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--muted);
}

.cancel-btn:hover {
  color: #ef4444;
}

.rc-meta {
  font-size: 0.78rem;
  color: var(--muted);
}

.rc-id {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--blue);
  margin-top: 0.1rem;
}`,

    "src/index.css": `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #fafafa;
  min-height: 100vh;
  color: #1e293b;
}

#root {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1rem;
}`,
  },
};
