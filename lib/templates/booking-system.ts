export const bookingSystemTemplate = {
  id: "booking-system",
  name: "Booking System",
  description: "Personal meeting scheduler (Calendly clone)",
  category: "booking",
  files: {
    "package.json": JSON.stringify(
      {
        name: "booking-system",
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
          "date-fns": "^3.6.0"
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
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <title>Meeting Scheduler</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,

    "vite.config.js": `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,

    "src/main.jsx": `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,

    // --- DATA ---
    "src/data/host.js": `export const HOST_INFO = {
  name: "Sarah Jenkins",
  role: "Senior Product Designer",
  avatar: "https://i.pravatar.cc/150?u=sarahj",
  company: "DesignCo",
  meetingTypes: [
    { id: '15min', duration: 15, title: "15 Min Quick Sync", color: "var(--blue)" },
    { id: '30min', duration: 30, title: "30 Min Introduction", color: "var(--emerald)" },
    { id: '60min', duration: 60, title: "60 Min Deep Dive", color: "var(--purple)" }
  ]
};

// Generate fake available slots for a given day
export const generateSlots = (date) => {
  const slots = [];
  let currentHour = 9;

  for (let i = 0; i < 6; i++) {
    const isHalf = Math.random() > 0.5 ? '30' : '00';
    const ampm = currentHour < 12 ? 'am' : 'pm';
    const displayHour = currentHour > 12 ? currentHour - 12 : currentHour;
    slots.push(\`\${displayHour}:\${isHalf} \${ampm}\`);
    currentHour++;
  }
  return slots;
};`,

    // --- LAYOUT COMPONENTS ---
    "src/components/layout/Header.jsx": `export default function Header() {
  return (
    <header className="site-header">
      <div className="logo">
        <span className="logo-icon">M</span>
        <span className="logo-text">MeetSync</span>
      </div>
      <div className="nav-links">
        <a href="#">Solutions</a>
        <a href="#">Features</a>
        <a href="#">Pricing</a>
      </div>
    </header>
  );
}`,

    "src/components/layout/Footer.jsx": `export default function Footer() {
  return (
    <footer className="site-footer">
      Powered by MeetSync
    </footer>
  );
}`,

    // --- UI COMPONENTS ---
    "src/components/ui/BackButton.jsx": `import { ChevronLeft } from 'lucide-react';

export default function BackButton({ onClick }) {
  return (
    <button className="back-btn" onClick={onClick}>
      <ChevronLeft size={20} />
    </button>
  );
}`,

    "src/components/ui/MetaRow.jsx": `export default function MetaRow({ icon: Icon, children, highlight = false }) {
  return (
    <div className={\`meta-row \${highlight ? 'highlight' : ''}\`}>
      <Icon size={16} />
      <span>{children}</span>
    </div>
  );
}`,

    // --- BOOKING COMPONENTS ---
    "src/components/booking/HostProfile.jsx": `import { HOST_INFO } from '../../data/host';

export default function HostProfile() {
  return (
    <div className="host-profile">
      <img src={HOST_INFO.avatar} alt="Profile" className="avatar" />
      <h2>{HOST_INFO.name}</h2>
      <p>{HOST_INFO.role} @ {HOST_INFO.company}</p>
      <p className="description">
        Welcome to my scheduling page. Please follow the instructions to add an event to my calendar.
      </p>
    </div>
  );
}`,

    "src/components/booking/MeetingTypeCard.jsx": `import { Clock, ChevronRight } from 'lucide-react';

export default function MeetingTypeCard({ type, onClick }) {
  return (
    <button className="meeting-type-card" onClick={onClick}>
      <div className="type-color-bar" style={{ backgroundColor: type.color }} />
      <div className="type-content">
        <h3>{type.title}</h3>
        <div className="type-meta">
          <Clock size={16} />
          <span>{type.duration} min</span>
        </div>
      </div>
      <ChevronRight className="type-arrow" />
    </button>
  );
}`,

    "src/components/booking/MeetingTypeList.jsx": `import { HOST_INFO } from '../../data/host';
import MeetingTypeCard from './MeetingTypeCard';

export default function MeetingTypeList({ onSelectType }) {
  return (
    <div className="meeting-list">
      {HOST_INFO.meetingTypes.map(type => (
        <MeetingTypeCard
          key={type.id}
          type={type}
          onClick={() => onSelectType(type)}
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
  isToday
} from 'date-fns';

export default function Calendar({
  currentMonth,
  selectedDate,
  onMonthChange,
  onDateSelect
}) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => onMonthChange(addMonths(currentMonth, 1));
  const prevMonth = () => onMonthChange(subMonths(currentMonth, 1));

  return (
    <div className="calendar-panel">
      <h3 className="panel-title">Select a Date & Time</h3>

      <div className="calendar-header">
        <button className="icon-btn" onClick={prevMonth}>
          <ChevronLeft size={20} />
        </button>
        <span className="current-month">{format(currentMonth, 'MMMM yyyy')}</span>
        <button className="icon-btn" onClick={nextMonth}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="day-name">{day}</div>
        ))}

        {calendarDays.map((day, idx) => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

          let classes = "day-cell";
          if (!isCurrentMonth) classes += " outside-month";
          if (isSelected) classes += " selected";
          if (isToday(day)) classes += " today";
          if (isPast) classes += " past";

          return (
            <button
              key={idx}
              className={classes}
              onClick={() => !isPast && onDateSelect(day)}
              disabled={isPast || !isCurrentMonth}
            >
              <span className="day-number">{format(day, 'd')}</span>
              {isCurrentMonth && !isPast && <span className="availability-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}`,

    "src/components/booking/TimeSlots.jsx": `import { format } from 'date-fns';

export default function TimeSlots({
  selectedDate,
  availableSlots,
  selectedSlot,
  onSlotSelect,
  onConfirm
}) {
  if (!selectedDate) return null;

  return (
    <div className="slots-panel">
      <p className="slots-date">{format(selectedDate, 'EEEE, MMMM d')}</p>
      <div className="slots-list">
        {availableSlots.map((slot, idx) => (
          <div key={idx} className="slot-container">
            <button
              className={\`slot-btn \${selectedSlot === slot ? 'active' : ''}\`}
              onClick={() => onSlotSelect(slot)}
            >
              {slot}
            </button>
            {selectedSlot === slot && (
              <button className="confirm-btn slide-in" onClick={onConfirm}>
                Confirm
              </button>
            )}
          </div>
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
    <form onSubmit={onSubmit} className="booking-form">
      <div className="form-group">
        <label>Name *</label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={handleChange('name')}
        />
      </div>

      <div className="form-group">
        <label>Email *</label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={handleChange('email')}
        />
      </div>

      <button type="button" className="add-guests-btn">
        Add Guests
      </button>

      <div className="form-group mt-4">
        <label>Please share anything that will help prepare for our meeting.</label>
        <textarea
          rows={4}
          value={formData.notes}
          onChange={handleChange('notes')}
        />
      </div>

      <button type="submit" className="submit-btn">
        Schedule Event
      </button>
    </form>
  );
}`,

    "src/components/booking/SuccessView.jsx": `import { CheckCircle2, Calendar, Video, User } from 'lucide-react';
import { format } from 'date-fns';
import { HOST_INFO } from '../../data/host';

export default function SuccessView({ meetingType, selectedDate }) {
  return (
    <div className="view-container success-view">
      <div className="success-content">
        <div className="success-icon">
          <CheckCircle2 size={64} color="var(--emerald)" />
        </div>
        <h2>You are scheduled</h2>
        <p>A calendar invitation has been sent to your email address.</p>

        <div className="success-details-card">
          <h3>{meetingType.title}</h3>
          <div className="meta-row">
            <User size={18} />
            <span>{HOST_INFO.name}</span>
          </div>
          <div className="meta-row highlight">
            <Calendar size={18} />
            <span>{format(selectedDate, 'h:mma')} - {format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
          </div>
          <div className="meta-row">
            <Video size={18} />
            <span>Web conferencing details to follow.</span>
          </div>
        </div>
      </div>
    </div>
  );
}`,

    // --- VIEWS ---
    "src/views/SelectTypeView.jsx": `import HostProfile from '../components/booking/HostProfile';
import MeetingTypeList from '../components/booking/MeetingTypeList';

export default function SelectTypeView({ onSelectType }) {
  return (
    <div className="view-container types-view">
      <HostProfile />
      <MeetingTypeList onSelectType={onSelectType} />
    </div>
  );
}`,

    "src/views/SelectTimeView.jsx": `import { Clock, Video } from 'lucide-react';
import BackButton from '../components/ui/BackButton';
import MetaRow from '../components/ui/MetaRow';
import Calendar from '../components/booking/Calendar';
import TimeSlots from '../components/booking/TimeSlots';
import { HOST_INFO, generateSlots } from '../data/host';

export default function SelectTimeView({
  meetingType,
  currentMonth,
  selectedDate,
  selectedSlot,
  onBack,
  onMonthChange,
  onDateSelect,
  onSlotSelect,
  onConfirm
}) {
  const availableSlots = generateSlots(selectedDate);

  return (
    <div className="view-container schedule-view">
      <div className="schedule-sidebar">
        <BackButton onClick={onBack} />
        <div className="sidebar-details">
          <p className="subtitle">{HOST_INFO.name}</p>
          <h2 className="title">{meetingType.title}</h2>
          <MetaRow icon={Clock}>{meetingType.duration} min</MetaRow>
          <MetaRow icon={Video}>Google Meet or Zoom</MetaRow>
        </div>
      </div>

      <div className="schedule-main">
        <Calendar
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          onMonthChange={onMonthChange}
          onDateSelect={onDateSelect}
        />
        <TimeSlots
          selectedDate={selectedDate}
          availableSlots={availableSlots}
          selectedSlot={selectedSlot}
          onSlotSelect={onSlotSelect}
          onConfirm={onConfirm}
        />
      </div>
    </div>
  );
}`,

    "src/views/EnterDetailsView.jsx": `import { Clock, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import BackButton from '../components/ui/BackButton';
import MetaRow from '../components/ui/MetaRow';
import BookingForm from '../components/booking/BookingForm';
import { HOST_INFO } from '../data/host';

export default function EnterDetailsView({
  meetingType,
  selectedDate,
  formData,
  onBack,
  onFormChange,
  onSubmit
}) {
  return (
    <div className="view-container details-view">
      <div className="schedule-sidebar">
        <BackButton onClick={onBack} />
        <div className="sidebar-details">
          <p className="subtitle">{HOST_INFO.name}</p>
          <h2 className="title">{meetingType.title}</h2>
          <MetaRow icon={Clock}>{meetingType.duration} min</MetaRow>
          <MetaRow icon={Calendar} highlight>
            {format(selectedDate, 'h:mma')} - {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </MetaRow>
          <MetaRow icon={MapPin}>
            Web conferencing details provided upon confirmation.
          </MetaRow>
        </div>
      </div>

      <div className="schedule-main form-main">
        <h3 className="panel-title">Enter Details</h3>
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
import Footer from './components/layout/Footer';
import SelectTypeView from './views/SelectTypeView';
import SelectTimeView from './views/SelectTimeView';
import EnterDetailsView from './views/EnterDetailsView';
import SuccessView from './components/booking/SuccessView';
import './App.css';

function App() {
  const [currentStep, setCurrentStep] = useState('select-type');
  const [selectedMeetingType, setSelectedMeetingType] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', notes: '' });

  const handleSelectType = (type) => {
    setSelectedMeetingType(type);
    setCurrentStep('select-time');
  };

  const handleSelectDate = (day) => {
    setSelectedDate(day);
    setSelectedSlot(null);
  };

  const handleConfirmTime = () => {
    if (selectedSlot) setCurrentStep('enter-details');
  };

  const handleBookMeeting = (e) => {
    e.preventDefault();
    setCurrentStep('success');
  };

  return (
    <div className="app-wrapper">
      <Header />

      <main className="main-stage">
        <div className="booking-card">
          {currentStep === 'select-type' && (
            <SelectTypeView onSelectType={handleSelectType} />
          )}

          {currentStep === 'select-time' && (
            <SelectTimeView
              meetingType={selectedMeetingType}
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              onBack={() => setCurrentStep('select-type')}
              onMonthChange={setCurrentMonth}
              onDateSelect={handleSelectDate}
              onSlotSelect={setSelectedSlot}
              onConfirm={handleConfirmTime}
            />
          )}

          {currentStep === 'enter-details' && (
            <EnterDetailsView
              meetingType={selectedMeetingType}
              selectedDate={selectedDate}
              formData={formData}
              onBack={() => setCurrentStep('select-time')}
              onFormChange={setFormData}
              onSubmit={handleBookMeeting}
            />
          )}

          {currentStep === 'success' && (
            <SuccessView
              meetingType={selectedMeetingType}
              selectedDate={selectedDate}
            />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App`,

    // --- STYLES ---
    "src/App.css": `
:root {
  --blue: #006BFF;
  --blue-hover: #0056CC;
  --emerald: #10B981;
  --purple: #8B5CF6;

  --bg-color: #F8F9FA;
  --surface: #FFFFFF;
  --text-main: #1A1A1A;
  --text-muted: #666666;
  --text-light: #999999;
  --border: #E5E5E5;
  --border-light: #F2F2F2;
  --border-focus: #B3D4FF;

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.05);
  --shadow-lg: 0 8px 30px rgba(0,0,0,0.08);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', system-ui, sans-serif; background-color: var(--bg-color); color: var(--text-main); line-height: 1.5; -webkit-font-smoothing: antialiased; }

/* Base Layout */
.app-wrapper { min-height: 100vh; display: flex; flex-direction: column; }

.site-header { height: 64px; display: flex; align-items: center; justify-content: space-between; padding: 0 2rem; background: var(--surface); border-bottom: 1px solid var(--border); }
.logo { display: flex; align-items: center; gap: 0.5rem; }
.logo-icon { background: var(--blue); color: white; width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
.logo-text { font-weight: 700; font-size: 1.125rem; }
.nav-links { display: flex; gap: 1.5rem; }
.nav-links a { text-decoration: none; color: var(--text-muted); font-weight: 500; font-size: 0.875rem; }
.nav-links a:hover { color: var(--text-main); }

.site-footer { text-align: center; padding: 2rem; color: var(--text-light); font-size: 0.875rem; }

/* Main Container */
.main-stage { flex: 1; display: flex; align-items: center; justify-content: center; padding: 2rem; }
.booking-card { background: var(--surface); border-radius: 12px; box-shadow: var(--shadow-lg); border: 1px solid var(--border); width: 100%; max-width: 1000px; min-height: 500px; overflow: hidden; }
.view-container { display: flex; height: 100%; min-height: 500px; }

/* Shared Typography */
.meta-row { display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-weight: 500; font-size: 0.875rem; margin-bottom: 0.75rem; line-height: 1.4; }
.meta-row.highlight { color: var(--blue); }
.subtitle { color: var(--text-muted); font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem; }
.title { font-size: 1.5rem; font-weight: 700; margin-bottom: 1.25rem; color: var(--text-main); }
.panel-title { font-size: 1.125rem; font-weight: 700; margin-bottom: 1.5rem; }

/* Select Type View */
.types-view { flex-direction: column; }
.host-profile { text-align: center; padding: 3rem 2rem 2rem; border-bottom: 1px solid var(--border); }
.avatar { width: 80px; height: 80px; border-radius: 50%; margin-bottom: 1rem; }
.host-profile h2 { font-size: 1.25rem; margin-bottom: 0.25rem; }
.host-profile p { color: var(--text-muted); font-size: 0.875rem; }
.host-profile .description { max-width: 500px; margin: 1rem auto 0; color: var(--text-main); }

.meeting-list { padding: 0; display: flex; flex-direction: column; }
.meeting-type-card { display: flex; align-items: center; background: transparent; border: none; border-bottom: 1px solid var(--border); padding: 1.5rem 2rem; cursor: pointer; text-align: left; transition: background 0.2s; position: relative; }
.meeting-type-card:hover { background: var(--bg-color); }
.meeting-type-card:last-child { border-bottom: none; }
.type-color-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 6px; }
.type-content { flex: 1; padding-left: 1rem; }
.type-content h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem; }
.type-meta { display: flex; align-items: center; gap: 0.25rem; color: var(--text-muted); font-size: 0.875rem; font-weight: 500; }
.type-arrow { color: var(--text-light); }

/* Split Layout */
.schedule-sidebar { width: 320px; border-right: 1px solid var(--border); padding: 2rem; background: var(--surface); }
.back-btn { background: transparent; border: 1px solid var(--border); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; margin-bottom: 1.5rem; color: var(--blue); transition: all 0.2s; }
.back-btn:hover { background: var(--blue); border-color: var(--blue); color: white; }
.schedule-main { flex: 1; display: flex; background: var(--surface); }

/* Calendar Panel */
.calendar-panel { flex: 1; padding: 2rem; border-right: 1px solid var(--border); }
.calendar-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
.current-month { font-weight: 600; font-size: 1rem; }
.icon-btn { background: transparent; border: none; color: var(--blue); cursor: pointer; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.icon-btn:hover { background: var(--bg-color); }

.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.day-name { text-align: center; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; padding-bottom: 0.5rem; }
.day-cell { aspect-ratio: 1; border: none; background: transparent; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; cursor: pointer; font-family: inherit; font-size: 0.875rem; font-weight: 600; color: var(--blue); transition: all 0.2s; }
.day-cell:hover:not(:disabled) { background: #EBF4FF; }
.day-cell.selected { background: var(--blue); color: white; }
.day-cell.today::after { content: ''; position: absolute; bottom: 4px; width: 4px; height: 4px; background: currentColor; border-radius: 50%; }
.day-cell:disabled { color: var(--text-light); cursor: default; font-weight: 400; }
.day-cell.outside-month { opacity: 0; pointer-events: none; }
.availability-dot { width: 4px; height: 4px; background: var(--border); border-radius: 50%; margin-top: 2px; }
.day-cell.selected .availability-dot { background: rgba(255,255,255,0.5); }

/* Slots Panel */
.slots-panel { width: 250px; padding: 2rem; background: var(--bg-color); }
.slots-date { font-size: 1rem; font-weight: 600; margin-bottom: 1.5rem; }
.slots-list { display: flex; flex-direction: column; gap: 0.5rem; height: 380px; overflow-y: auto; padding-right: 0.5rem; }
.slots-list::-webkit-scrollbar { width: 4px; }
.slots-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
.slot-container { display: flex; gap: 0.5rem; }
.slot-btn { flex: 1; padding: 0.875rem; background: var(--surface); border: 1px solid var(--blue); color: var(--blue); border-radius: 4px; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; font-family: inherit; }
.slot-btn:hover { border-width: 2px; padding: calc(0.875rem - 1px); }
.slot-btn.active { background: var(--text-muted); border-color: var(--text-muted); color: white; }
.confirm-btn { flex: 1; background: var(--blue); color: white; border: none; border-radius: 4px; font-weight: 600; font-size: 0.875rem; cursor: pointer; font-family: inherit; transition: background 0.2s; }
.confirm-btn:hover { background: var(--blue-hover); }

@keyframes slideIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
.slide-in { animation: slideIn 0.2s ease forwards; }

/* Form View */
.form-main { flex-direction: column; padding: 2rem; max-width: 500px; }
.form-group { margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; }
.form-group label { font-size: 0.875rem; font-weight: 600; color: var(--text-main); }
.form-group input, .form-group textarea { padding: 0.75rem 1rem; border: 1px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 0.875rem; outline: none; transition: border 0.2s, box-shadow 0.2s; }
.form-group input:focus, .form-group textarea:focus { border-color: var(--blue); box-shadow: 0 0 0 3px var(--border-focus); }
.add-guests-btn { background: transparent; border: 1px solid currentColor; color: var(--blue); padding: 0.5rem 1rem; border-radius: 20px; font-weight: 600; font-size: 0.875rem; cursor: pointer; align-self: flex-start; margin-bottom: 1rem; transition: all 0.2s; }
.add-guests-btn:hover { background: var(--bg-color); }
.mt-4 { margin-top: 1rem; }
.submit-btn { background: var(--blue); color: white; border: none; padding: 0.875rem 1.5rem; border-radius: 8px; font-weight: 600; font-size: 0.875rem; cursor: pointer; margin-top: 1rem; transition: background 0.2s; }
.submit-btn:hover { background: var(--blue-hover); }

/* Success View */
.success-view { align-items: center; justify-content: center; text-align: center; padding: 2rem; }
.success-content { max-width: 400px; width: 100%; }
.success-icon { display: flex; justify-content: center; margin-bottom: 1.5rem; }
.success-content h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
.success-content p { color: var(--text-muted); margin-bottom: 2rem; }
.success-details-card { text-align: left; border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; }
.success-details-card h3 { font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem; }

/* Responsive */
@media (max-width: 800px) {
  .view-container { flex-direction: column; height: auto; }
  .schedule-sidebar { width: 100%; border-right: none; border-bottom: 1px solid var(--border); padding: 1.5rem; }
  .schedule-main { flex-direction: column; }
  .calendar-panel { border-right: none; border-bottom: 1px solid var(--border); }
  .slots-panel { width: 100%; }
  .slots-list { height: auto; max-height: 300px; }
}
`,

    "src/index.css": `:root {
  font-family: 'Inter', system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light;
  background-color: #F8F9FA;
  text-rendering: optimizeLegibility;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

#root {
  width: 100%;
}`
  }
};
