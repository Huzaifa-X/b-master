import type { FileSystemTree } from "@webcontainer/api"

/**
 * WebContainer File System Definition
 * 
 * This defines the virtual file system that will be mounted into the WebContainer.
 * It represents a complete Vite + React + TypeScript project.
 */
export const webcontainerFiles: FileSystemTree = {
  // Vite configuration
  "vite.config.ts": {
    file: {
      contents: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3111,
  },
})
`,
    },
  },

  // TypeScript configuration
  "tsconfig.json": {
    file: {
      contents: `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
`,
    },
  },

  // Package.json with all dependencies
  "package.json": {
    file: {
      contents: `{
  "name": "b-coder-app",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.3",
    "vite": "^6.0.3"
  }
}
`,
    },
  },

  // HTML entry point
  "index.html": {
    file: {
      contents: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>B-Coder App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    },
  },

  // Source directory
  src: {
    directory: {
      // Main entry point
      "main.tsx": {
        file: {
          contents: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`,
        },
      },

      // App component (the counter example)
      "App.tsx": {
        file: {
          contents: `import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <header className="app-header">
        <h1>Welcome to B-Coder! 🚀</h1>
        <p>Your AI-powered code generation platform</p>
      </header>
      
      <main className="app-main">
        <div className="counter-card">
          <h2>Interactive Counter</h2>
          <div className="counter-display">{count}</div>
          <div className="button-group">
            <button onClick={() => setCount(count - 1)} className="btn btn-secondary">
              Decrease
            </button>
            <button onClick={() => setCount(0)} className="btn">
              Reset
            </button>
            <button onClick={() => setCount(count + 1)} className="btn btn-primary">
              Increase
            </button>
          </div>
        </div>
        
        <div className="info-card">
          <h3>Features</h3>
          <ul>
            <li>✨ AI-Powered Code Generation</li>
            <li>🎨 Modern React Components</li>
            <li>⚡ Fast Development</li>
            <li>🔥 Hot Reload Support</li>
          </ul>
        </div>
      </main>
    </div>
  )
}

export default App
`,
        },
      },

      // App styles
      "App.css": {
        file: {
          contents: `.app {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.app-header {
  text-align: center;
  margin-bottom: 3rem;
}

.app-header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.app-header p {
  font-size: 1.2rem;
  color: #666;
}

.app-main {
  display: grid;
  gap: 2rem;
}

.counter-card,
.info-card {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e0e0e0;
}

.counter-card h2 {
  text-align: center;
  color: #667eea;
  margin-bottom: 1.5rem;
}

.counter-display {
  font-size: 4rem;
  font-weight: bold;
  text-align: center;
  color: #764ba2;
  margin: 2rem 0;
}

.button-group {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  background: #e0e0e0;
  color: #333;
  font-weight: 500;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-secondary {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.info-card h3 {
  color: #667eea;
  margin-bottom: 1rem;
}

.info-card ul {
  list-style: none;
  padding: 0;
}

.info-card li {
  padding: 0.5rem 0;
  font-size: 1.1rem;
  color: #555;
}
`,
        },
      },

      // Global styles
      "index.css": {
        file: {
          contents: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

#root {
  width: 100%;
}
`,
        },
      },
    },
  },
}
