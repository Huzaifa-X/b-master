export const websiteTemplate = {
  id: "website",
  name: "Website",
  description: "Modern landing page with hero, features, testimonials, and CTA sections",
  category: "Marketing",
  icon: "Globe",
  files: {
    "package.json": JSON.stringify(
      {
        name: "website-landing",
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

    "index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <title>Starter Website</title>
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

    "src/index.css": `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
`,

    // --- COMPONENTS ---
    "src/components/layout/Navbar.jsx": `import { useState } from 'react'
import { Menu, X, Sparkles } from 'lucide-react'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-content">
          <div className="brand">
            <div className="brand-icon">
              <Sparkles className="icon-sm" />
            </div>
            <span className="brand-name">Brand</span>
          </div>

          <div className="nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#testimonials" className="nav-link">Testimonials</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <button className="nav-btn">Get Started</button>
          </div>

          <button onClick={() => setIsOpen(!isOpen)} className="mobile-menu-btn">
            {isOpen ? <X className="icon-md" /> : <Menu className="icon-md" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mobile-menu">
          <a href="#features" className="mobile-link">Features</a>
          <a href="#testimonials" className="mobile-link">Testimonials</a>
          <a href="#pricing" className="mobile-link">Pricing</a>
          <button className="mobile-cta">Get Started</button>
        </div>
      )}
    </nav>
  )
}`,

    "src/components/layout/Footer.jsx": `import { Sparkles } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="brand">
            <div className="brand-icon">
              <Sparkles className="icon-sm" />
            </div>
            <span className="brand-name">Brand</span>
          </div>
          <div className="footer-links">
            <a href="#" className="footer-link">Privacy</a>
            <a href="#" className="footer-link">Terms</a>
            <a href="#" className="footer-link">Contact</a>
          </div>
          <p className="footer-copy">© 2024 Brand. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}`,

    "src/components/sections/Hero.jsx": `import { ArrowRight, Star } from 'lucide-react'

export default function Hero({ onGetStarted }) {
  return (
    <section className="hero">
      <div className="hero-container">
        <div className="hero-badge">
          <span className="badge-dot" />
          <span className="badge-text">New: Version 2.0 is here</span>
        </div>

        <h1 className="hero-title">
          Build something
          <span className="gradient-text"> amazing</span>
          <br />with our platform
        </h1>

        <p className="hero-subtitle">
          The all-in-one solution for modern businesses. Streamline your workflow,
          boost productivity, and scale with confidence.
        </p>

        <div className="hero-ctas">
          <button onClick={onGetStarted} className="btn-primary">
            Start Free Trial
            <ArrowRight className="icon-sm" />
          </button>
          <button className="btn-secondary" onClick={() => alert('Demo video would play here!')}>Watch Demo</button>
        </div>

        <div className="social-proof">
          <div className="avatars">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="avatar" />
            ))}
          </div>
          <div className="rating">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className="star-icon" />
            ))}
            <span className="rating-text">Trusted by 10,000+ users</span>
          </div>
        </div>
      </div>
    </section>
  )
}`,

    "src/components/sections/Features.jsx": `import { Zap, Shield, BarChart3 } from 'lucide-react'

export default function Features() {
  const features = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized for speed. Get results in milliseconds, not seconds."
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-grade encryption and compliance with industry standards."
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Deep insights into your data with beautiful visualizations."
    }
  ]

  return (
    <section id="features" className="features">
      <div className="section-container">
        <div className="section-header">
          <h2 className="section-title">Everything you need</h2>
          <p className="section-subtitle">
            Powerful features to help you manage, grow, and scale your business.
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">
                <feature.icon className="icon-md" />
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-desc">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}`,

    "src/components/sections/Testimonials.jsx": `import { Star } from 'lucide-react'

export default function Testimonials() {
  const testimonials = [
    {
      quote: "This platform transformed how we work. We've seen a 40% increase in productivity.",
      author: "Sarah Johnson",
      role: "CEO, TechCorp",
      rating: 5
    },
    {
      quote: "The best investment we've made this year. Customer support is incredible.",
      author: "Michael Chen",
      role: "Founder, StartupXYZ",
      rating: 5
    },
    {
      quote: "Simple, powerful, and reliable. Everything we needed and more.",
      author: "Emily Davis",
      role: "Product Manager, InnovateCo",
      rating: 5
    }
  ]

  return (
    <section id="testimonials" className="testimonials">
      <div className="section-container">
        <div className="section-header">
          <h2 className="section-title">Loved by thousands</h2>
          <p className="section-subtitle">See what our customers are saying about us.</p>
        </div>

        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="testimonial-card">
              <div className="testimonial-stars">
                {Array(testimonial.rating).fill(0).map((_, i) => (
                  <Star key={i} className="star-icon" />
                ))}
              </div>
              <p className="testimonial-quote">"{testimonial.quote}"</p>
              <div className="testimonial-author">
                <div className="author-avatar" />
                <div>
                  <div className="author-name">{testimonial.author}</div>
                  <div className="author-role">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}`,

    "src/components/sections/CTA.jsx": `import { ArrowRight } from 'lucide-react'

export default function CTA({ onGetStarted }) {
  return (
    <section className="cta">
      <div className="cta-container">
        <div className="cta-card">
          <div className="cta-line" />
          <h2 className="cta-title">Ready to scale your business?</h2>
          <p className="cta-subtitle">
            Join 10,000+ businesses growing with our platform. 
            No credit card required. Cancel anytime.
          </p>
          <div className="cta-actions">
            <button onClick={onGetStarted} className="cta-btn-primary">
              Get Started for Free
              <ArrowRight className="icon-sm" />
            </button>
            <button className="cta-btn-secondary" onClick={() => alert('Talk to Sales started!')}>Talk to Sales</button>
          </div>
        </div>
      </div>
    </section>
  )
}`,

    "src/App.jsx": `import React, { useState } from 'react'
import Navbar from './components/layout/Navbar'
import Hero from './components/sections/Hero'
import Features from './components/sections/Features'
import Testimonials from './components/sections/Testimonials'
import CTA from './components/sections/CTA'
import Footer from './components/layout/Footer'
import LeadForm from './components/LeadForm'
import './App.css'

export default function App() {
  const [showLead, setShowLead] = useState(false)

  const openModal = () => {
    setShowLead(true)
    document.body.style.overflow = 'hidden'
  }

  const closeModal = () => {
    setShowLead(false)
    document.body.style.overflow = 'auto'
  }

  return (
    <div className="app">
      <Navbar onGetStarted={openModal} />
      <Hero onGetStarted={openModal} />
      <Features />
      <Testimonials />
      <CTA onGetStarted={openModal} />
      <Footer />

      {showLead && <LeadForm onClose={closeModal} />}
    </div>
  )
}
`,

    "src/App.css": `
:root {
  --primary: #6366F1;
  --primary-dark: #4F46E5;
  --primary-light: #818CF8;
  --primary-bg: #EEF2FF;
  --purple: #9333EA;
  --amber: #F59E0B;

  --bg: #FFFFFF;
  --bg-light: #F8FAFC;
  --surface: #FFFFFF;
  --text: #0F172A;
  --text-muted: #64748B;
  --text-light: #94A3B8;
  --border: #E2E8F0;

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: 'DM Sans', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

/* Icons */
.icon-sm { width: 16px; height: 16px; }
.icon-md { width: 24px; height: 24px; }

/* App */
.app {
  min-height: 100vh;
  background: var(--bg);
}

/* Lead Modal */
.lead-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.lead-modal {
  background: white;
  width: 100%;
  max-width: 480px;
  border-radius: 24px;
  padding: 2.5rem;
  position: relative;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
  animation: modalSlide 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalSlide {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.close-btn {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  padding: 8px;
  border: none;
  background: var(--bg-light);
  border-radius: 50%;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--border);
  color: var(--text);
  transform: rotate(90deg);
}

.lead-header { margin-bottom: 2rem; }
.lead-header h2 { font-size: 1.75rem; font-weight: 700; color: var(--text); margin-bottom: 0.5rem; }
.lead-header p { color: var(--text-muted); font-size: 0.9375rem; }

.lead-form { display: flex; flex-direction: column; gap: 1.25rem; }
.form-group { display: flex; flex-direction: column; gap: 0.5rem; }
.form-group label { font-size: 0.8125rem; font-weight: 600; color: var(--text); text-transform: uppercase; letter-spacing: 0.05em; }
.form-group input { 
  padding: 0.75rem 1rem; 
  border: 1px solid var(--border); 
  border-radius: 12px; 
  font-family: inherit; 
  font-size: 0.9375rem;
  transition: all 0.2s;
}
.form-group input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px var(--primary-bg); }

.lead-success {
  text-align: center;
  padding: 1rem 0;
}

.lead-success h3 { font-size: 1.5rem; margin: 1rem 0 0.5rem; }
.lead-success p { color: var(--text-muted); }

/* Navbar */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
}

.nav-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 640px) {
  .nav-container { padding: 0 1.5rem; }
}

@media (min-width: 1024px) {
  .nav-container { padding: 0 2rem; }
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--purple) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.brand-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);
}

.nav-links {
  display: none;
  align-items: center;
  gap: 2rem;
}

@media (min-width: 768px) {
  .nav-links { display: flex; }
}

.nav-link {
  color: var(--text-muted);
  font-weight: 500;
  text-decoration: none;
  transition: color 0.2s;
}

.nav-link:hover {
  color: var(--text);
}

.nav-btn {
  padding: 8px 16px;
  background: var(--text);
  color: white;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.nav-btn:hover {
  background: #1E293B;
}

.mobile-menu-btn {
  display: flex;
  padding: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
}

@media (min-width: 768px) {
  .mobile-menu-btn { display: none; }
}

.mobile-menu {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 12px;
  background: var(--bg);
  border-top: 1px solid var(--border);
}

@media (min-width: 768px) {
  .mobile-menu { display: none; }
}

.mobile-link {
  padding: 8px 0;
  color: var(--text-muted);
  font-weight: 500;
  text-decoration: none;
}

.mobile-cta {
  width: 100%;
  padding: 10px;
  background: var(--text);
  color: white;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
}

/* Hero */
.hero {
  padding: 128px 1rem 80px;
  background: linear-gradient(180deg, var(--bg-light) 0%, var(--bg) 100%);
}

.hero-container {
  max-width: 1280px;
  margin: 0 auto;
  text-align: center;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: var(--primary-bg);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 100px;
  margin-bottom: 24px;
}

.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.badge-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--primary-dark);
}

.hero-title {
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 24px;
  line-height: 1.2;
}

@media (min-width: 640px) {
  .hero-title { font-size: 3rem; }
}

@media (min-width: 1024px) {
  .hero-title { font-size: 3.75rem; }
}

.gradient-text {
  background: linear-gradient(135deg, var(--primary) 0%, var(--purple) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.125rem;
  color: var(--text-muted);
  max-width: 640px;
  margin: 0 auto 40px;
  line-height: 1.6;
}

@media (min-width: 640px) {
  .hero-subtitle { font-size: 1.25rem; }
}

.hero-ctas {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

@media (min-width: 640px) {
  .hero-ctas { flex-direction: row; justify-content: center; }
}

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 24px;
  background: var(--text);
  color: white;
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 14px 0 rgba(15, 23, 42, 0.2);
  transition: all 0.2s;
}

@media (min-width: 640px) {
  .btn-primary { width: auto; }
}

.btn-primary:hover {
  background: #1E293B;
}

.btn-secondary {
  width: 100%;
  padding: 12px 24px;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 12px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s;
}

@media (min-width: 640px) {
  .btn-secondary { width: auto; }
}

.btn-secondary:hover {
  border-color: var(--text-light);
}

.social-proof {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-top: 48px;
}

@media (min-width: 640px) {
  .social-proof { flex-direction: row; justify-content: center; }
}

.avatars {
  display: flex;
  margin-left: 8px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #CBD5E1 0%, #94A3B8 100%);
  border: 2px solid white;
  margin-left: -8px;
}

.rating {
  display: flex;
  align-items: center;
  gap: 4px;
}

.star-icon {
  width: 16px;
  height: 16px;
  fill: var(--amber);
  color: var(--amber);
}

.rating-text {
  margin-left: 8px;
  font-size: 0.875rem;
  color: var(--text-muted);
}

/* Features */
.features {
  padding: 80px 1rem;
}

.section-container {
  max-width: 1280px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 64px;
}

.section-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 16px;
}

@media (min-width: 640px) {
  .section-title { font-size: 2.25rem; }
}

.section-subtitle {
  font-size: 1.125rem;
  color: var(--text-muted);
  max-width: 640px;
  margin: 0 auto;
}

.features-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 768px) {
  .features-grid { grid-template-columns: repeat(3, 1fr); }
}

.feature-card {
  padding: 24px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  transition: all 0.2s;
}

.feature-card:hover {
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: var(--shadow-lg);
}

.feature-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--purple) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-bottom: 16px;
  transition: transform 0.2s;
}

.feature-card:hover .feature-icon {
  transform: scale(1.1);
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
}

.feature-desc {
  color: var(--text-muted);
  line-height: 1.5;
}

/* Testimonials */
.testimonials {
  padding: 80px 1rem;
  background: var(--bg-light);
}

.testimonials-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 768px) {
  .testimonials-grid { grid-template-columns: repeat(3, 1fr); }
}

.testimonial-card {
  padding: 24px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 16px;
}

.testimonial-stars {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
}

.testimonial-quote {
  font-size: 1.125rem;
  line-height: 1.6;
  color: var(--text);
  margin-bottom: 24px;
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #CBD5E1 0%, #94A3B8 100%);
}

.author-name {
  font-weight: 600;
  color: var(--text);
}

.author-role {
  font-size: 0.875rem;
  color: var(--text-muted);
}

/* CTA Section */
.cta-section {
  padding: 80px 1rem;
}

.cta-container {
  max-width: 1024px;
  margin: 0 auto;
}

.cta-card {
  position: relative;
  border-radius: 24px;
  background: var(--text);
  padding: 64px 24px;
  text-align: center;
  overflow: hidden;
}

@media (min-width: 640px) {
  .cta-card { padding: 80px 48px; }
}

.cta-bg {
  position: absolute;
  inset: 0;
  opacity: 0.2;
}

.cta-blob {
  position: absolute;
  width: 384px;
  height: 384px;
  border-radius: 50%;
  filter: blur(64px);
}

.cta-blob-1 {
  top: -192px;
  left: -192px;
  background: var(--primary);
}

.cta-blob-2 {
  bottom: -192px;
  right: -192px;
  background: var(--purple);
}

.cta-content {
  position: relative;
  max-width: 640px;
  margin: 0 auto;
}

.cta-title {
  font-size: 2.25rem;
  font-weight: 700;
  color: white;
  margin-bottom: 16px;
}

@media (min-width: 640px) {
  .cta-title { font-size: 3rem; }
}

.cta-subtitle {
  font-size: 1.125rem;
  color: #94A3B8;
  margin-bottom: 32px;
}

.cta-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (min-width: 640px) {
  .cta-buttons { flex-direction: row; justify-content: center; }
}

.cta-btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 24px;
  background: white;
  color: var(--text);
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

@media (min-width: 640px) {
  .cta-btn-primary { width: auto; }
}

.cta-btn-primary:hover {
  transform: translateY(-2px);
}

.cta-btn-secondary {
  width: 100%;
  padding: 12px 24px;
  background: transparent;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

@media (min-width: 640px) {
  .cta-btn-secondary { width: auto; }
}

.cta-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Footer */
.footer {
  background: var(--bg);
  border-top: 1px solid var(--border);
  padding: 48px 1rem;
}

.footer-container {
  max-width: 1280px;
  margin: 0 auto;
}

.footer-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

@media (min-width: 640px) {
  .footer-content {
    flex-direction: row;
    justify-content: space-between;
  }
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 24px;
}

.footer-link {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.2s;
}

.footer-link:hover {
  color: var(--text);
}

.footer-copy {
  color: var(--text-muted);
  font-size: 0.875rem;
}
`
  }
};
