/**
 * Default Template: Todo App (JSX Version)
 * A beautiful, functional todo application built with React + Vite
 * Using JSX instead of TSX to avoid Monaco editor errors
 */

export const defaultTodoTemplate = {
  id: "default-todo",
  name: "Todo App",
  description: "A beautiful, modern todo application with React and Vite",
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

    "src/main.jsx": `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,

    "src/App.jsx": `import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Plus, 
  Calendar, 
  ListTodo,
  Sparkles
} from 'lucide-react';
import './App.css';

const INITIAL_TODOS = [
  { id: 1, text: "Review Q4 design mocks", completed: false, category: "Work" },
  { id: 2, text: "Book flights for conference", completed: false, category: "Personal" },
  { id: 3, text: "Update subscription billing", completed: true, category: "Finance" },
];

function App() {
  const [todos, setTodos] = useState(INITIAL_TODOS);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, active, completed

  const addTodo = (e) => {
    e.preventDefault();
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
  const progressPercentage = todos.length === 0 ? 0 : Math.round((todos.filter(t => t.completed).length / todos.length) * 100);

  return (
    <div className="app-layout">
      {/* Sidebar Layout */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><CheckCircle2 size={24} color="white" /></div>
          <h2>TaskMaster</h2>
        </div>
        
        <nav className="nav-menu">
          <button className={\`nav-item \${activeTab === 'all' ? 'active' : ''}\`} onClick={() => setActiveTab('all')}>
            <ListTodo size={18} />
            <span>All Tasks</span>
            <span className="badge">{todos.length}</span>
          </button>
          <button className={\`nav-item \${activeTab === 'active' ? 'active' : ''}\`} onClick={() => setActiveTab('active')}>
            <Calendar size={18} />
            <span>Active</span>
            <span className="badge blue">{activeCount}</span>
          </button>
          <button className={\`nav-item \${activeTab === 'completed' ? 'active' : ''}\`} onClick={() => setActiveTab('completed')}>
            <CheckCircle2 size={18} />
            <span>Completed</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="progress-card">
            <div className="progress-header">
              <span className="progress-title">Daily Progress</span>
              <span className="progress-percent">{progressPercentage}%</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: \`\${progressPercentage}%\` }}></div>
            </div>
            {progressPercentage === 100 && todos.length > 0 && (
              <p className="progress-cheer"><Sparkles size={14} className="text-yellow" /> All caught up!</p>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-wrapper">
          
          <header className="page-header">
            <div>
              <h1 className="page-title">
                {activeTab === 'all' ? 'Good Morning' : activeTab === 'active' ? "Let's Get Done" : 'Completed Tasks'}
              </h1>
              <p className="page-subtitle">
                {activeTab === 'completed' ? "You've crushed these tasks." : \`You have \${activeCount} tasks to complete today.\`}
              </p>
            </div>
            
            <div className="header-actions">
              <span className="date-chip">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            </div>
          </header>

          {/* Add Todo Form */}
          <form className="add-todo-form" onSubmit={addTodo}>
            <div className="input-wrapper">
              <Plus size={20} className="input-icon" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="What needs to be done? Press Enter to add."
                className="todo-input"
              />
            </div>
            <button type="submit" className="btn-primary" disabled={!input.trim()}>
              Add Task
            </button>
          </form>

          {/* Todo List */}
          <div className="todo-list">
            {filteredTodos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon-wrapper">
                  <CheckCircle2 size={48} className="text-muted opacity-50" />
                </div>
                <h3>No tasks found</h3>
                <p className="text-muted">
                  {activeTab === 'completed' 
                    ? "You haven't completed any tasks yet." 
                    : "You're all caught up! Enjoy your day or add a new task."}
                </p>
              </div>
            ) : (
              <div className="task-group animate-stagger">
                {filteredTodos.map(todo => (
                  <div key={todo.id} className={\`todo-item \${todo.completed ? 'is-completed' : ''}\`}>
                    <button 
                      className="checkbox-btn" 
                      onClick={() => toggleTodo(todo.id)}
                      aria-label="Toggle completion"
                    >
                      {todo.completed ? (
                        <CheckCircle2 size={24} className="icon-checked" />
                      ) : (
                        <Circle size={24} className="icon-unchecked" />
                      )}
                    </button>
                    
                    <div className="todo-content">
                      <span className="todo-text">{todo.text}</span>
                      {todo.category && (
                        <span className="todo-category">{todo.category}</span>
                      )}
                    </div>

                    <button 
                      className="delete-btn" 
                      onClick={() => deleteTodo(todo.id)}
                      aria-label="Delete task"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {todos.some(t => t.completed) && (
            <div className="list-footer">
              <button className="btn-text" onClick={clearCompleted}>
                Clear completed tasks
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

export default App`,

    "src/App.css": `
:root {
  --blue-500: #3B82F6;
  --blue-600: #2563EB;
  --blue-50: #EFF6FF;
  --emerald-500: #10B981;
  --emerald-50: #ECFDF5;
  --rose-500: #F43F5E;
  --rose-50: #FFF1F2;
  --yellow-400: #FBBF24;
  
  --bg-color: #F1F5F9;
  --surface: #FFFFFF;
  --text-main: #0F172A;
  --text-muted: #64748B;
  --border: #E2E8F0;
  --border-light: #F8FAFC;
  
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { 
  font-family: 'Plus Jakarta Sans', sans-serif; 
  background-color: var(--bg-color); 
  color: var(--text-main); 
  -webkit-font-smoothing: antialiased;
}

/* Utilities */
.text-muted { color: var(--text-muted); }
.text-yellow { color: var(--yellow-400); }
.opacity-50 { opacity: 0.5; }

/* Layout */
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 280px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.brand {
  height: 72px;
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  gap: 0.75rem;
  border-bottom: 1px solid var(--border-light);
}

.brand-icon {
  background: var(--blue-600);
  border-radius: 10px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand h2 {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.025em;
}

.nav-menu {
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.9375rem;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  width: 100%;
  text-align: left;
}

.nav-item:hover {
  background: var(--blue-50);
  color: var(--blue-600);
}

.nav-item.active {
  background: var(--blue-50);
  color: var(--blue-600);
}

.nav-item span:first-of-type {
  flex: 1;
}

.badge {
  background: var(--border);
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.125rem 0.5rem;
  border-radius: 20px;
}
.badge.blue {
  background: var(--blue-600);
  color: white;
}

.sidebar-footer {
  padding: 1.5rem;
  border-top: 1px solid var(--border-light);
}

.progress-card {
  background: var(--bg-color);
  padding: 1rem;
  border-radius: 12px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.progress-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
}

.progress-percent {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--blue-600);
}

.progress-bar-bg {
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--blue-600);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.progress-cheer {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-main);
  margin-top: 0.75rem;
}

/* Main Content */
.main-content {
  flex: 1;
  overflow-y: auto;
  position: relative;
  display: flex;
  justify-content: center;
}

.content-wrapper {
  width: 100%;
  max-width: 800px;
  padding: 3rem 2rem;
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2.5rem;
}

.page-title {
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  margin-bottom: 0.25rem;
  color: var(--text-main);
}

.page-subtitle {
  color: var(--text-muted);
  font-size: 1rem;
}

.date-chip {
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-muted);
  box-shadow: var(--shadow-sm);
}

/* Add Todo Form */
.add-todo-form {
  display: flex;
  gap: 1rem;
  margin-bottom: 2.5rem;
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-color);
  padding: 1rem 0;
}

.input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 1rem;
  color: var(--text-muted);
}

.todo-input {
  width: 100%;
  padding: 1.125rem 1rem 1.125rem 3rem;
  border: 1px solid var(--surface);
  border-radius: 16px;
  font-size: 1rem;
  font-family: inherit;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s;
  outline: none;
  font-weight: 500;
}

.todo-input::placeholder {
  color: var(--text-muted);
  font-weight: 400;
}

.todo-input:focus {
  border-color: var(--blue-500);
  box-shadow: 0 0 0 4px var(--blue-50);
}

.btn-primary {
  background: var(--text-main);
  color: white;
  border: none;
  padding: 0 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);
}

.btn-primary:active {
  transform: translateY(1px);
}

.btn-primary:disabled {
  background: var(--border);
  color: var(--text-muted);
  cursor: not-allowed;
  box-shadow: none;
}

/* Todo List */
.task-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--surface);
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
  border: 1px solid transparent;
  transition: all 0.2s ease-in-out;
  animation: slideUp 0.3s ease forwards;
}

.todo-item:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--border);
}

.checkbox-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--border);
  transition: color 0.2s;
  flex-shrink: 0;
}

.checkbox-btn:hover {
  color: var(--blue-500);
}

.icon-unchecked {
  stroke-width: 2.5;
}

.icon-checked {
  color: var(--emerald-500);
  stroke-width: 2.5;
}

.todo-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow: hidden;
}

.todo-text {
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--text-main);
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.todo-category {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--blue-600);
  background: var(--blue-50);
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  align-self: flex-start;
}

.delete-btn {
  background: transparent;
  border: none;
  color: var(--border);
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.todo-item:hover .delete-btn {
  color: var(--text-muted);
}

.delete-btn:hover {
  background: var(--rose-50);
  color: var(--rose-500) !important;
}

/* Completed State */
.todo-item.is-completed {
  background: transparent;
  border: 1px dashed var(--border);
  box-shadow: none;
}

.todo-item.is-completed .todo-text {
  color: var(--text-muted);
  text-decoration: line-through;
}

.todo-item.is-completed .todo-category {
  background: var(--border-light);
  color: var(--text-muted);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  background: var(--surface);
  border-radius: 16px;
  border: 1px dashed var(--border);
}

.empty-icon-wrapper {
  width: 80px;
  height: 80px;
  background: var(--bg-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

/* Footer Actions */
.list-footer {
  margin-top: 2rem;
  display: flex;
  justify-content: flex-end;
}

.btn-text {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-text:hover {
  color: var(--rose-500);
  background: var(--rose-50);
}

/* Animations */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Responsive */
@media (max-width: 768px) {
  .app-layout {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
  
  .nav-menu {
    flex-direction: row;
    overflow-x: auto;
    padding: 1rem;
  }
  
  .nav-item {
    flex-shrink: 0;
    width: auto;
  }
  
  .sidebar-footer {
    display: none;
  }
  
  .content-wrapper {
    padding: 1.5rem;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .add-todo-form {
    flex-direction: column;
  }
  
  .btn-primary {
    padding: 1rem;
  }
}
`,

    "src/index.css": `:root {
  font-family: 'Plus Jakarta Sans', system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light;
  background-color: #F1F5F9;
  text-rendering: optimizeLegibility;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

#root {
  width: 100%;
}
`
  }
};
