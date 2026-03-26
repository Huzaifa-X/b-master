import { TemplateDefinition } from './index';

export const meetingSchedulerTemplate: TemplateDefinition = {
  id: "meeting-scheduler",
  name: "Meeting Scheduler",
  description: "Team meeting planner with time slots, agenda & timezone using Tailwind CSS",
  category: "booking",
  files: {
    "package.json": JSON.stringify(
      {
        name: "meeting-scheduler",
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
          tailwindcss: "^3.4.1",
          postcss: "^8.4.35",
          autoprefixer: "^10.4.17",
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
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <title>Meeting Scheduler</title>
  </head>
  <body class="bg-slate-50 text-slate-900">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,

    "tailwind.config.js": `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}`,

    "postcss.config.js": `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,

    "vite.config.js": `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,

    "src/index.css": `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-slate-50 text-slate-900;
  }
}`,

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
    "src/data/constants.js": `export const TIME_SLOTS = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '1:00 PM', '1:30 PM', '2:00 PM',
  '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM'
];

export const DURATIONS = ['15 min', '30 min', '45 min', '1 hour', '1.5 hours', '2 hours'];

export const TIMEZONES = [
  { label: 'EST (New York)', offset: '-5' },
  { label: 'CST (Chicago)', offset: '-6' },
  { label: 'MST (Denver)', offset: '-7' },
  { label: 'PST (Los Angeles)', offset: '-8' },
  { label: 'UTC', offset: '+0' },
  { label: 'CET (Paris)', offset: '+1' },
];

export const PLATFORMS = ['Google Meet', 'Zoom', 'Teams', 'In-Person'];`,

    // --- LAYOUT COMPONENTS ---
    "src/components/layout/PageHeader.jsx": `export default function PageHeader() {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Meeting Scheduler</h1>
      <p className="text-slate-500 font-medium mt-1">Set up a meeting and invite your team in seconds.</p>
    </div>
  );
}`,

    // --- UI COMPONENTS ---
    "src/components/ui/BackLink.jsx": `import { ChevronLeft } from 'lucide-react';

export default function BackLink({ onClick }) {
  return (
    <button className="flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors mb-4" onClick={onClick}>
      <ChevronLeft size={16} /> Back
    </button>
  );
}`,

    "src/components/ui/PlatformSelector.jsx": `export default function PlatformSelector({ platforms, selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map(p => (
        <button
          key={p}
          className={\`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all \${selected === p ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:text-slate-700'}\`}
          onClick={() => onSelect(p)}
        >
          {p}
        </button>
      ))}
    </div>
  );
}`,

    "src/components/ui/AttendeeInput.jsx": `import { Plus, X, Mail } from 'lucide-react';

export default function AttendeeInput({
  inputValue,
  onInputChange,
  attendees,
  onAdd,
  onRemove
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAdd();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1 group">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="colleague@company.com"
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-900"
          />
        </div>
        <button className="bg-blue-600 text-white p-3 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center" onClick={onAdd}>
          <Plus size={24} />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {attendees.map(a => (
          <span key={a} className="flex items-center gap-2 bg-blue-50 text-blue-700 rounded-xl px-4 py-2 text-sm font-bold border border-blue-100 animate-in zoom-in duration-300">
            {a}
            <button onClick={() => onRemove(a)} className="hover:bg-blue-200 p-0.5 rounded-full transition-colors">
              <X size={14} strokeWidth={3} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}`,

    // --- MEETING COMPONENTS ---
    "src/components/meeting/MeetingForm.jsx": `import { Clock, Globe, Video, Users, AlignLeft, Calendar, Sparkles } from 'lucide-react';
import { DURATIONS, TIMEZONES, PLATFORMS } from '../../data/constants';
import PlatformSelector from '../ui/PlatformSelector';
import AttendeeInput from '../ui/AttendeeInput';

export default function MeetingForm({
  title,
  duration,
  timezone,
  platform,
  attendeeInput,
  attendees,
  agenda,
  onTitleChange,
  onDurationChange,
  onTimezoneChange,
  onPlatformChange,
  onAttendeeInputChange,
  onAddAttendee,
  onRemoveAttendee,
  onAgendaChange,
  onSubmit
}) {
  return (
    <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-4 border-b border-slate-50 pb-6 mb-2">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Calendar size={24} />
        </div>
        <div>
            <h2 className="text-xl font-black text-slate-900 leading-none mb-1">Meeting Parameters</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">General details & participants</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Meeting Title *</label>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="E.g., Quarterly Performance Review"
          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-900 text-lg placeholder:text-slate-300"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2 text-left">
          <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest pl-1">
            <Clock size={14} className="text-blue-500" /> Duration
          </label>
          <select value={duration} onChange={(e) => onDurationChange(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-900 appearance-none">
            {DURATIONS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="space-y-2 text-left">
          <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest pl-1">
            <Globe size={14} className="text-blue-500" /> Timezone
          </label>
          <select value={timezone} onChange={(e) => onTimezoneChange(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-900 appearance-none">
            {TIMEZONES.map(tz => <option key={tz.label}>{tz.label}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest pl-1">
            <Video size={14} className="text-blue-500" /> Meeting Platform
        </label>
        <PlatformSelector
          platforms={PLATFORMS}
          selected={platform}
          onSelect={onPlatformChange}
        />
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest pl-1">
            <Users size={14} className="text-blue-500" /> Invite Participants
        </label>
        <AttendeeInput
          inputValue={attendeeInput}
          onInputChange={onAttendeeInputChange}
          attendees={attendees}
          onAdd={onAddAttendee}
          onRemove={onRemoveAttendee}
        />
      </div>

      <div className="space-y-2 text-left">
        <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest pl-1">
            <AlignLeft size={14} className="text-blue-500" /> Agenda (optional)
        </label>
        <textarea
          rows={3}
          value={agenda}
          onChange={(e) => onAgendaChange(e.target.value)}
          placeholder="What will be discussed?"
          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-900 resize-none placeholder:text-slate-300"
        />
      </div>

      <button
        className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 hover:scale-[1.01] hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-30"
        onClick={onSubmit}
        disabled={!title || attendees.length === 0}
      >
        Choose Time Slots <Sparkles size={20} />
      </button>
    </div>
  );
}`,

    "src/components/meeting/SlotPicker.jsx": `import { Clock, Check, Sparkles } from 'lucide-react';
import { TIME_SLOTS } from '../../data/constants';
import BackLink from '../ui/BackLink';

export default function SlotPicker({
  selectedSlots,
  finalSlot,
  onToggleSlot,
  onFinalSlotChange,
  onSchedule,
  onBack
}) {
  return (
    <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-8 animate-in slide-in-from-right-10 duration-700">
      <BackLink onClick={onBack} />
      <div className="flex items-center gap-4 border-b border-slate-50 pb-6 mb-2">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Clock size={24} />
        </div>
        <div>
            <h2 className="text-xl font-black text-slate-900 leading-none mb-1">Temporal Selection</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Choose availability window</p>
        </div>
      </div>
      
      <p className="text-sm font-medium text-slate-500">Select all time slots that could work for this meeting. Your team will vote on these later.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {TIME_SLOTS.map(slot => (
          <button
            key={slot}
            className={\`px-4 py-3 rounded-2xl text-sm font-bold border-2 transition-all flex items-center justify-between \${selectedSlots.includes(slot) ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white border-slate-50 text-slate-500 hover:border-slate-200'}\`}
            onClick={() => onToggleSlot(slot)}
          >
            {slot}
            {selectedSlots.includes(slot) && <Check size={16} strokeWidth={4} />}
          </button>
        ))}
      </div>

      {selectedSlots.length > 0 && (
        <div className="pt-8 border-t border-slate-100 space-y-6 animate-in slide-in-from-bottom-5">
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Confirm Preferred Time</h3>
            <select value={finalSlot} onChange={(e) => onFinalSlotChange(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-black text-slate-900 text-lg appearance-none">
                <option value="">Select a specific slot…</option>
                {selectedSlots.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <button
            className="w-full py-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-30"
            onClick={onSchedule}
            disabled={!finalSlot}
          >
            <Sparkles size={20} /> Schedule Meeting
          </button>
        </div>
      )}
    </div>
  );
}`,

    "src/components/meeting/MeetingCard.jsx": `import { Clock, Video, Users, ChevronRight } from 'lucide-react';

export default function MeetingCard({ meeting }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all group cursor-pointer">
      <div className="font-extrabold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors flex items-center justify-between">
        {meeting.title}
        <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-all group-hover:translate-x-1" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-500">
          <Clock size={12} className="text-blue-500" /> {meeting.slot} · {meeting.duration}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-500">
          <Users size={12} className="text-blue-500" /> {meeting.attendees.length} participant{meeting.attendees.length > 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-500">
          <Video size={12} className="text-blue-500" /> {meeting.platform}
        </div>
      </div>
    </div>
  );
}`,

    "src/components/meeting/MeetingSummary.jsx": `import { Clock, Globe, Video, Users, AlignLeft } from 'lucide-react';

export default function MeetingSummary({ meeting }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8 space-y-6 text-left shadow-inner">
      <div className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-8 border-b border-slate-200 pb-4">
        {meeting.title}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-blue-500 shadow-sm border border-slate-100"><Clock size={16} /></div>
                {meeting.slot} · {meeting.duration}
            </div>
            <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-blue-500 shadow-sm border border-slate-100"><Globe size={16} /></div>
                {meeting.timezone}
            </div>
            <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-blue-500 shadow-sm border border-slate-100"><Video size={16} /></div>
                {meeting.platform}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-sm font-bold text-slate-600">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-blue-500 shadow-sm border border-slate-100 shrink-0"><Users size={16} /></div>
                <div className="flex flex-wrap gap-1">
                    {meeting.attendees.map(a => <span key={a} className="bg-white px-2 py-0.5 rounded-md border border-slate-100">{a}</span>)}
                </div>
            </div>
            {meeting.agenda && (
                <div className="flex items-start gap-3 text-sm font-bold text-slate-600">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-blue-500 shadow-sm border border-slate-100 shrink-0"><AlignLeft size={16} /></div>
                    <span className="leading-relaxed opacity-80">{meeting.agenda}</span>
                </div>
            )}
          </div>
      </div>
    </div>
  );
}`,

    "src/components/meeting/SuccessView.jsx": `import { CheckCircle2, Sparkles, Send, Calendar } from 'lucide-react';
import MeetingSummary from './MeetingSummary';

export default function SuccessView({ meeting, onReset }) {
  return (
    <div className="bg-white rounded-[3rem] p-12 shadow-2xl shadow-slate-200 border border-slate-100 text-center animate-in zoom-in-95 duration-700 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
      
      <div className="flex justify-center mb-8 relative">
        <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
        <div className="relative w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center transform hover:scale-110 transition-transform">
            <CheckCircle2 size={56} strokeWidth={2.5} />
        </div>
      </div>
      
      <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-4">Meeting Official!</h2>
      <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-12 flex items-center justify-center gap-2">
        <Send size={12} /> Invites dispatched to {meeting.attendees.length} participant{meeting.attendees.length > 1 ? 's' : ''}
      </p>

      <MeetingSummary meeting={meeting} />

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
        <button className="w-full sm:w-auto px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-lg shadow-xl hover:bg-black hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-3" onClick={onReset}>
            <Calendar size={20} /> Plan New Meeting
        </button>
        <button className="text-sm font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-all flex items-center gap-2">
            View Calendar <Sparkles size={14} />
        </button>
      </div>
    </div>
  );
}`,

    "src/components/meeting/MeetingsSidebar.jsx": `import { Calendar, Inbox } from 'lucide-react';
import MeetingCard from './MeetingCard';

export default function MeetingsSidebar({ meetings }) {
  return (
    <div className="bg-white/50 backdrop-blur-sm border border-slate-100 rounded-[2rem] p-8 h-fit shrink-0">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100/50">
        <h3 className="flex items-center gap-3 text-sm font-black text-slate-900 uppercase tracking-widest">
            <Calendar size={18} className="text-blue-500" /> 
            Active Log
        </h3>
        <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-lg text-[10px] font-black tracking-tighter">{meetings.length}</span>
      </div>
      
      <div className="flex flex-col gap-4">
        {meetings.length === 0 ? (
            <div className="py-12 px-6 text-center border-2 border-dashed border-slate-200 rounded-3xl opacity-50">
                <Inbox size={40} className="mx-auto mb-4 text-slate-300" strokeWidth={1.5} />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">System awaiting data input.</p>
            </div>
        ) : (
            meetings.map(m => <MeetingCard key={m.id} meeting={m} />)
        )}
      </div>
    </div>
  );
}`,

    // --- VIEWS ---
    "src/views/SetupView.jsx": `import MeetingForm from '../components/meeting/MeetingForm';

export default function SetupView(props) {
  return <MeetingForm {...props} />;
}`,

    "src/views/SlotsView.jsx": `import SlotPicker from '../components/meeting/SlotPicker';

export default function SlotsView(props) {
  return <SlotPicker {...props} />;
}`,

    // --- MAIN APP ---
    "src/App.jsx": `import { useState } from 'react';
import { TIMEZONES } from './data/constants';
import PageHeader from './components/layout/PageHeader';
import SetupView from './views/SetupView';
import SlotsView from './views/SlotsView';
import SuccessView from './components/meeting/SuccessView';
import MeetingsSidebar from './components/meeting/MeetingsSidebar';

function App() {
  const [step, setStep] = useState('setup');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('30 min');
  const [timezone, setTimezone] = useState(TIMEZONES[0].label);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [attendeeInput, setAttendeeInput] = useState('');
  const [attendees, setAttendees] = useState([]);
  const [agenda, setAgenda] = useState('');
  const [platform, setPlatform] = useState('Google Meet');
  const [finalSlot, setFinalSlot] = useState('');
  const [scheduled, setScheduled] = useState(false);
  const [meetings, setMeetings] = useState([]);

  const toggleSlot = (slot) => {
    setSelectedSlots(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    );
  };

  const addAttendee = () => {
    const email = attendeeInput.trim();
    if (email && !attendees.includes(email)) {
      setAttendees(prev => [...prev, email]);
      setAttendeeInput('');
    }
  };

  const removeAttendee = (email) => {
    setAttendees(prev => prev.filter(x => x !== email));
  };

  const handleSchedule = () => {
    if (!title || !finalSlot || attendees.length === 0) return;
    const meeting = {
      id: Date.now(),
      title,
      duration,
      timezone,
      slot: finalSlot,
      attendees: [...attendees],
      agenda,
      platform
    };
    setMeetings(prev => [meeting, ...prev]);
    setScheduled(true);
  };

  const handleReset = () => {
    setStep('setup');
    setTitle('');
    setDuration('30 min');
    setTimezone(TIMEZONES[0].label);
    setSelectedSlots([]);
    setAttendees([]);
    setAttendeeInput('');
    setAgenda('');
    setPlatform('Google Meet');
    setFinalSlot('');
    setScheduled(false);
  };

  const currentMeeting = {
    title,
    duration,
    timezone,
    slot: finalSlot,
    attendees,
    agenda,
    platform
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-6">
      <PageHeader />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 pt-6">
        <div className="lg:col-span-3">
          {step === 'setup' && !scheduled && (
            <SetupView
              title={title}
              duration={duration}
              timezone={timezone}
              platform={platform}
              attendeeInput={attendeeInput}
              attendees={attendees}
              agenda={agenda}
              onTitleChange={setTitle}
              onDurationChange={setDuration}
              onTimezoneChange={setTimezone}
              onPlatformChange={setPlatform}
              onAttendeeInputChange={setAttendeeInput}
              onAddAttendee={addAttendee}
              onRemoveAttendee={removeAttendee}
              onAgendaChange={setAgenda}
              onSubmit={() => setStep('slots')}
            />
          )}

          {step === 'slots' && !scheduled && (
            <SlotsView
              selectedSlots={selectedSlots}
              finalSlot={finalSlot}
              onToggleSlot={toggleSlot}
              onFinalSlotChange={setFinalSlot}
              onSchedule={handleSchedule}
              onBack={() => setStep('setup')}
            />
          )}

          {scheduled && (
            <SuccessView meeting={currentMeeting} onReset={handleReset} />
          )}
        </div>

        <div className="lg:col-span-1">
          <MeetingsSidebar meetings={meetings} />
        </div>
      </div>
    </div>
  );
}

export default App;`,
  }
};
