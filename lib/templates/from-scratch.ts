import { TemplateDefinition } from './index';

export const fromScratchTemplate: TemplateDefinition = {
  id: "from-scratch",
  name: "From Scratch",
  description: "A minimal blank starter with Tailwind CSS - build anything you want from zero",
  category: "Starter",
  icon: "Layers",
  files: {
    "package.json": JSON.stringify(
      {
        name: "from-scratch-app",
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

    "index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <title>My App</title>
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

    "src/main.jsx": `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,

    "src/App.jsx": `import { Sparkles } from 'lucide-react'

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg shadow-violet-500/40 mb-6">
          <Sparkles className="w-8 h-8 text-white" />
        </div>

        {/* Heading */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Start Building</h1>
          <p className="text-base text-slate-500 leading-relaxed">
            Your blank canvas is ready. Tell me what you want to create!
          </p>
        </div>

        {/* Suggestions */}
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {['Landing Page', 'Dashboard', 'Form', 'Gallery'].map((suggestion) => (
            <span
              key={suggestion}
              className="px-3 py-1.5 text-sm font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-full"
            >
              {suggestion}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}`,

    "src/index.css": `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}`
  }
};
