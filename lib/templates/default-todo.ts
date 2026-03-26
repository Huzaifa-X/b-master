/**
 * Default Template: Todo App (JSX Version)
 * A beautiful, functional todo application built with React + Vite
 * Using JSX instead of TSX to avoid Monaco editor errors
 */

import { TemplateDefinition } from './index';

export const defaultTodoTemplate: TemplateDefinition = {
  id: "default-todo",
  name: "Todo App",
  description: "A beautiful, modern todo application with Tailwind CSS",
  category: "default",
  files: {
    "package.json": JSON.stringify(
      {
        name: "todo-app",
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
          "lucide-react": "^0.344.0"
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
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <title>Tasks App</title>
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

    "tailwind.config.js": `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
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

    "src/index.css": `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    @apply bg-slate-100 text-slate-900;
  }
}`,

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
    "src/data/todos.js": `export const INITIAL_TODOS = [
  { id: 1, text: "Review Q4 design mocks", completed: false, category: "Work" },
  { id: 2, text: "Book flights for conference", completed: false, category: "Personal" },
  { id: 3, text: "Update subscription billing", completed: true, category: "Finance" },
];`,

    // --- LAYOUT COMPONENTS ---
    "src/components/layout/Sidebar.jsx": `import { CheckCircle2, ListTodo, Calendar } from 'lucide-react';
import ProgressCard from '../ui/ProgressCard';

export default function Sidebar({ activeTab, setActiveTab, totalCount, activeCount, progressPercentage }) {
  return (
    <aside className="w-[280px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0 h-screen">
      <div className="h-[72px] flex items-center px-6 gap-3 border-b border-slate-50">
        <div className="bg-blue-600 rounded-[10px] w-9 h-9 flex items-center justify-center">
          <CheckCircle2 size={24} color="white" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight">TaskMaster</h2>
      </div>

      <nav className="p-6 pt-4 flex flex-col gap-2 flex-1">
        <button
          className={\`flex items-center gap-3 p-3 rounded-xl font-semibold text-[15px] transition-all \${activeTab === 'all' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'}\`}
          onClick={() => setActiveTab('all')}
        >
          <ListTodo size={18} />
          <span className="flex-1 text-left">All Tasks</span>
          <span className="bg-slate-200 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full">{totalCount}</span>
        </button>
        <button
          className={\`flex items-center gap-3 p-3 rounded-xl font-semibold text-[15px] transition-all \${activeTab === 'active' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'}\`}
          onClick={() => setActiveTab('active')}
        >
          <Calendar size={18} />
          <span className="flex-1 text-left">Active</span>
          <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{activeCount}</span>
        </button>
        <button
          className={\`flex items-center gap-3 p-3 rounded-xl font-semibold text-[15px] transition-all \${activeTab === 'completed' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'}\`}
          onClick={() => setActiveTab('completed')}
        >
          <CheckCircle2 size={18} />
          <span className="flex-1 text-left">Completed</span>
        </button>
      </nav>

      <div className="p-6 border-t border-slate-50">
        <ProgressCard percentage={progressPercentage} showComplete={totalCount > 0} />
      </div>
    </aside>
  );
}`,

    "src/components/layout/PageHeader.jsx": `export default function PageHeader({ activeTab, activeCount }) {
  const getTitle = () => {
    if (activeTab === 'all') return 'Good Morning';
    if (activeTab === 'active') return "Let's Get Done";
    return 'Completed Tasks';
  };

  const getSubtitle = () => {
    if (activeTab === 'completed') return "You've crushed these tasks.";
    return \`You have \${activeCount} tasks to complete today.\`;
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="flex justify-between items-end mb-10">
      <div>
        <h1 className="text-[36px] font-extrabold tracking-tight leading-tight mb-1 text-slate-900">{getTitle()}</h1>
        <p className="text-slate-500 text-lg">{getSubtitle()}</p>
      </div>

      <div className="hidden sm:block">
        <span className="bg-white border border-slate-200 px-4 py-2 rounded-[20px] text-sm font-semibold text-slate-500 shadow-sm">{formattedDate}</span>
      </div>
    </header>
  );
}`,

    // --- UI COMPONENTS ---
    "src/components/ui/ProgressCard.jsx": `import { Sparkles } from 'lucide-react';

export default function ProgressCard({ percentage, showComplete }) {
  return (
    <div className="bg-slate-100 p-4 rounded-xl">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Daily Progress</span>
        <span className="text-sm font-bold text-blue-600">{percentage}%</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out" 
          style={{ width: \`\${percentage}%\` }}
        ></div>
      </div>
      {percentage === 100 && showComplete && (
        <p className="flex items-center gap-1 text-[10px] font-semibold text-slate-900 mt-3">
          <Sparkles size={14} className="text-amber-400" /> All caught up!
        </p>
      )}
    </div>
  );
}`,

    // --- TODO COMPONENTS ---
    "src/components/todo/TodoForm.jsx": `import { Plus } from 'lucide-react';

export default function TodoForm({ input, setInput, onSubmit }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form className="flex gap-4 mb-10 sticky top-0 z-10 bg-slate-100 py-4" onSubmit={handleSubmit}>
      <div className="flex-1 relative flex items-center">
        <Plus size={20} className="absolute left-4 text-slate-400" />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What needs to be done? Press Enter to add."
          className="w-full pl-12 pr-4 py-4 border border-white rounded-[16px] text-base font-medium bg-white shadow-sm transition-all outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 placeholder:font-normal"
        />
      </div>
      <button 
        type="submit" 
        className="bg-slate-900 text-white px-6 rounded-xl font-semibold text-[15px] transition-all active:translate-y-px disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed shadow-sm" 
        disabled={!input.trim()}
      >
        Add Task
      </button>
    </form>
  );
}`,

    "src/components/todo/TodoItem.jsx": `import { CheckCircle2, Circle, Trash2 } from 'lucide-react';

export default function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <div className={\`group flex items-center gap-4 p-5 bg-white rounded-[16px] shadow-sm border border-transparent transition-all hover:shadow-md hover:border-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-300 \${todo.completed ? 'opacity-60 bg-transparent border-slate-200 border-dashed shadow-none' : ''}\`}>
      <button
        className="bg-transparent border-none cursor-pointer flex items-center justify-center text-slate-200 transition-colors hover:text-blue-500 flex-shrink-0"
        onClick={() => onToggle(todo.id)}
        aria-label="Toggle completion"
      >
        {todo.completed ? (
          <CheckCircle2 size={24} className="text-emerald-500 stroke-[2.5]" />
        ) : (
          <Circle size={24} className="stroke-[2.5]" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1 overflow-hidden">
        <span className={\`text-[17px] font-semibold text-slate-900 whitespace-nowrap overflow-hidden text-overflow-ellipsis transition-all \${todo.completed ? 'line-through text-slate-400' : ''}\`}>
          {todo.text}
        </span>
        {todo.category && (
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full self-start">
            {todo.category}
          </span>
        )}
      </div>

      <button
        className="bg-transparent border-none text-slate-200 w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-all flex-shrink-0 group-hover:text-slate-400 hover:bg-rose-50 hover:text-rose-500"
        onClick={() => onDelete(todo.id)}
        aria-label="Delete task"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}`,

    "src/components/todo/EmptyState.jsx": `import { CheckCircle2 } from 'lucide-react';

export default function EmptyState({ activeTab }) {
  const getMessage = () => {
    if (activeTab === 'completed') {
      return "You haven't completed any tasks yet.";
    }
    return "You're all caught up! Enjoy your day or add a new task.";
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4">
        <CheckCircle2 size={48} className="text-slate-400 opacity-50" />
      </div>
      <h3 className="text-lg font-bold text-slate-900">No tasks found</h3>
      <p className="text-slate-500 max-w-[200px] mt-1">{getMessage()}</p>
    </div>
  );
}`,

    "src/components/todo/TodoList.jsx": `import TodoItem from './TodoItem';
import EmptyState from './EmptyState';

export default function TodoList({ todos, activeTab, onToggle, onDelete }) {
  if (todos.length === 0) {
    return <EmptyState activeTab={activeTab} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}`,

    "src/components/todo/ListFooter.jsx": `export default function ListFooter({ hasCompleted, onClearCompleted }) {
  if (!hasCompleted) return null;

  return (
    <div className="mt-8 pt-4 border-t border-slate-200 flex justify-center">
      <button 
        className="bg-transparent text-slate-400 font-semibold text-sm border-none cursor-pointer hover:text-rose-500 transition-colors" 
        onClick={onClearCompleted}
      >
        Clear completed tasks
      </button>
    </div>
  );
}`,

    // --- MAIN APP ---
    "src/App.jsx": `import { useState } from 'react';
import { INITIAL_TODOS } from './data/todos';
import Sidebar from './components/layout/Sidebar';
import PageHeader from './components/layout/PageHeader';
import TodoForm from './components/todo/TodoForm';
import TodoList from './components/todo/TodoList';
import ListFooter from './components/todo/ListFooter';

function App() {
  const [todos, setTodos] = useState(INITIAL_TODOS);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const addTodo = () => {
    if (input.trim()) {
      setTodos([{ id: Date.now(), text: input, completed: false, category: "Inbox" }, ...todos]);
      setInput('');
    }
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const clearCompleted = () => {
    setTodos(todos.filter(todo => !todo.completed));
  };

  const filteredTodos = todos.filter(todo => {
    if (activeTab === 'active') return !todo.completed;
    if (activeTab === 'completed') return todo.completed;
    return true;
  });

  const activeCount = todos.filter(t => !t.completed).length;
  const completedCount = todos.filter(t => t.completed).length;
  const progressPercentage = todos.length === 0 ? 0 : Math.round((completedCount / todos.length) * 100);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalCount={todos.length}
        activeCount={activeCount}
        progressPercentage={progressPercentage}
      />

      <main className="flex-1 overflow-y-auto flex justify-center">
        <div className="w-full max-w-[800px] px-8 py-12">
          <PageHeader activeTab={activeTab} activeCount={activeCount} />

          <TodoForm input={input} setInput={setInput} onSubmit={addTodo} />

          <div className="mt-4">
            <TodoList
              todos={filteredTodos}
              activeTab={activeTab}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
            />
          </div>

          <ListFooter hasCompleted={completedCount > 0} onClearCompleted={clearCompleted} />
        </div>
      </main>
    </div>
  );
}

export default App`,
  }
};
