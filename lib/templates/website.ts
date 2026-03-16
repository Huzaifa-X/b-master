import { TemplateDefinition } from './index';

export const websiteTemplate: TemplateDefinition = {
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

    "src/App.jsx": `import { useState } from 'react'
import {
  Menu, X, ArrowRight, Zap, Shield, BarChart3,
  Star, ChevronRight, Sparkles
} from 'lucide-react'
import './App.css'

// Navigation
function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-content">
          {/* Logo */}
          <div className="brand">
            <div className="brand-icon">
              <Sparkles className="icon-sm" />
            </div>
            <span className="brand-name">Brand</span>
          </div>

          {/* Desktop Nav */}
          <div className="nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#testimonials" className="nav-link">Testimonials</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <button className="nav-btn">Get Started</button>
          </div>

          {/* Mobile Menu Button */}
          <button onClick={() => setIsOpen(!isOpen)} className="mobile-menu-btn">
            {isOpen ? <X className="icon-md" /> : <Menu className="icon-md" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
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
}

// Hero Section
function Hero() {
  return (
    <section className="hero">
      <div className="hero-container">
        {/* Badge */}
        <div className="hero-badge">
          <span className="badge-dot" />
          <span className="badge-text">New: Version 2.0 is here</span>
        </div>

        {/* Headline */}
        <h1 className="hero-title">
          Build something
          <span className="gradient-text"> amazing</span>
          <br />with our platform
        </h1>

        <p className="hero-subtitle">
          The all-in-one solution for modern businesses. Streamline your workflow,
          boost productivity, and scale with confidence.
        </p>

        {/* CTAs */}
        <div className="hero-ctas">
          <button className="btn-primary">
            Start Free Trial
            <ArrowRight className="icon-sm" />
          </button>
          <button className="btn-secondary">Watch Demo</button>
        </div>

        {/* Social Proof */}
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
}

// Features Section
function Features() {
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
}

// Testimonials Section
function Testimonials() {
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
}

// CTA Section
function CTA() {
  return (
    <section className="cta-section">
      <div className="cta-container">
        <div className="cta-card">
          <div className="cta-bg">
            <div className="cta-blob cta-blob-1" />
            <div className="cta-blob cta-blob-2" />
          </div>
          <div className="cta-content">
            <h2 className="cta-title">Ready to get started?</h2>
            <p className="cta-subtitle">
              Join thousands of satisfied customers and take your business to the next level.
            </p>
            <div className="cta-buttons">
              <button className="cta-btn-primary">
                Start Free Trial
                <ChevronRight className="icon-sm" />
              </button>
              <button className="cta-btn-secondary">Talk to Sales</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Footer
function Footer() {
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
}

// Main App
export default function App() {
  return (
    <div className="app">
      <Navbar />
      <Hero />
      <Features />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  )
}`,

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
  box-shadow: var(--shadow-sm);
}

.testimonial-stars {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
}

.testimonial-quote {
  color: var(--text);
  line-height: 1.6;
  margin-bottom: 24px;
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-light) 0%, var(--purple) 100%);
}

.author-name {
  font-weight: 600;
  color: var(--text);
}

.author-role {
  font-size: 0.875rem;
  color: var(--text-muted);
}

/* CTA */
.cta-section {
  padding: 80px 1rem;
}

.cta-container {
  max-width: 896px;
  margin: 0 auto;
}

.cta-card {
  position: relative;
  padding: 32px;
  border-radius: 24px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--purple) 100%);
  overflow: hidden;
}

@media (min-width: 640px) {
  .cta-card { padding: 48px; }
}

.cta-bg {
  position: absolute;
  inset: 0;
  opacity: 0.1;
}

.cta-blob {
  position: absolute;
  background: white;
  border-radius: 50%;
  filter: blur(48px);
}

.cta-blob-1 {
  top: 0;
  left: 0;
  width: 160px;
  height: 160px;
}

.cta-blob-2 {
  bottom: 0;
  right: 0;
  width: 240px;
  height: 240px;
}

.cta-content {
  position: relative;
  text-align: center;
}

.cta-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: white;
  margin-bottom: 16px;
}

@media (min-width: 640px) {
  .cta-title { font-size: 2.25rem; }
}

.cta-subtitle {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.8);
  max-width: 576px;
  margin: 0 auto 32px;
}

.cta-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
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
  color: var(--primary);
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

@media (min-width: 640px) {
  .cta-btn-primary { width: auto; }
}

.cta-btn-primary:hover {
  background: var(--primary-bg);
}

.cta-btn-secondary {
  width: 100%;
  padding: 12px 24px;
  background: transparent;
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  font-family: inherit;
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
  padding: 48px 1rem;
  border-top: 1px solid var(--border);
}

.footer-container {
  max-width: 1280px;
  margin: 0 auto;
}

.footer-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

@media (min-width: 768px) {
  .footer-content {
    flex-direction: row;
    justify-content: space-between;
  }
}

.footer-links {
  display: flex;
  gap: 24px;
}

.footer-link {
  font-size: 0.875rem;
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.2s;
}

.footer-link:hover {
  color: var(--text);
}

.footer-copy {
  font-size: 0.875rem;
  color: var(--text-muted);
}
`,

    "src/index.css": `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: 'DM Sans', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#root {
  min-height: 100vh;
}`
  }
};
