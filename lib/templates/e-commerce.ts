import { TemplateDefinition } from './index';

export const ecommerceTemplate: TemplateDefinition = {
  id: "e-commerce",
  name: "E-Commerce",
  description: "Modern online store with product grid, cart, and checkout",
  category: "Commerce",
  icon: "ShoppingBag",
  files: {
    "package.json": JSON.stringify(
      {
        name: "ecommerce-store",
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
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <title>ShopNow - Modern E-Commerce</title>
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

    "src/App.jsx": `import { useState, createContext, useContext } from 'react'
import {
  ShoppingBag, Search, User, Heart, X, Plus, Minus,
  Star, ChevronRight, Truck, Shield, RefreshCw, Menu
} from 'lucide-react'
import './App.css'

// Cart Context
const CartContext = createContext()

function CartProvider({ children }) {
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
    setIsCartOpen(true)
  }

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId))
  }

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = item.quantity + delta
        return newQty > 0 ? { ...item, quantity: newQty } : item
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <CartContext.Provider value={{
      cart, cartTotal, cartCount, isCartOpen,
      addToCart, removeFromCart, updateQuantity, setIsCartOpen
    }}>
      {children}
    </CartContext.Provider>
  )
}

const useCart = () => useContext(CartContext)

// Sample Products
const products = [
  { id: 1, name: "Premium Wireless Headphones", price: 299, rating: 4.8, reviews: 245, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop", category: "Electronics" },
  { id: 2, name: "Minimalist Watch", price: 199, rating: 4.9, reviews: 189, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop", category: "Accessories" },
  { id: 3, name: "Designer Sunglasses", price: 159, rating: 4.7, reviews: 312, image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop", category: "Accessories" },
  { id: 4, name: "Leather Backpack", price: 249, rating: 4.6, reviews: 156, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop", category: "Bags" },
  { id: 5, name: "Smart Fitness Tracker", price: 179, rating: 4.5, reviews: 423, image: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400&h=400&fit=crop", category: "Electronics" },
  { id: 6, name: "Ceramic Coffee Mug", price: 29, rating: 4.8, reviews: 89, image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop", category: "Home" },
]

// Header Component
function Header() {
  const { cartCount, setIsCartOpen } = useCart()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-content">
          {/* Logo */}
          <div className="brand">
            <div className="brand-icon">
              <ShoppingBag className="icon-md" />
            </div>
            <span className="brand-name">ShopNow</span>
          </div>

          {/* Desktop Nav */}
          <nav className="nav-links">
            <a href="#" className="nav-link active">All Products</a>
            <a href="#" className="nav-link">Electronics</a>
            <a href="#" className="nav-link">Accessories</a>
            <a href="#" className="nav-link">Sale</a>
          </nav>

          {/* Actions */}
          <div className="header-actions">
            <button className="icon-btn desktop-only">
              <Search className="icon-md" />
            </button>
            <button className="icon-btn desktop-only">
              <Heart className="icon-md" />
            </button>
            <button className="icon-btn desktop-only">
              <User className="icon-md" />
            </button>
            <button onClick={() => setIsCartOpen(true)} className="cart-btn">
              <ShoppingBag className="icon-md" />
              {cartCount > 0 && (
                <span className="cart-badge">{cartCount}</span>
              )}
            </button>
            <button onClick={() => setMobileMenuOpen(true)} className="mobile-menu-btn">
              <Menu className="icon-md" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu" onClick={e => e.stopPropagation()}>
            <button onClick={() => setMobileMenuOpen(false)} className="mobile-close">
              <X className="icon-md" />
            </button>
            <nav className="mobile-nav">
              <a href="#" className="mobile-link">All Products</a>
              <a href="#" className="mobile-link">Electronics</a>
              <a href="#" className="mobile-link">Accessories</a>
              <a href="#" className="mobile-link">Sale</a>
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}

// Product Card
function ProductCard({ product }) {
  const { addToCart } = useCart()
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="product-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="product-image-wrapper">
        <img
          src={product.image}
          alt={product.name}
          className="product-image"
        />
        <button className="wishlist-btn">
          <Heart className="icon-sm" />
        </button>
        {/* Quick Add Button */}
        <div className={\`quick-add \${isHovered ? 'visible' : ''}\`}>
          <button onClick={() => addToCart(product)} className="add-to-cart-btn">
            Add to Cart
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="product-info">
        <span className="product-category">{product.category}</span>
        <h3 className="product-name">{product.name}</h3>
        <div className="product-meta">
          <span className="product-price">\${product.price}</span>
          <div className="product-rating">
            <Star className="star-icon" />
            <span>{product.rating}</span>
            <span className="reviews-count">({product.reviews})</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Cart Sidebar
function CartSidebar() {
  const { cart, cartTotal, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity } = useCart()

  if (!isCartOpen) return null

  return (
    <div className="cart-overlay">
      {/* Backdrop */}
      <div className="cart-backdrop" onClick={() => setIsCartOpen(false)} />

      {/* Sidebar */}
      <div className="cart-sidebar">
        {/* Header */}
        <div className="cart-header">
          <h2 className="cart-title">Your Cart ({cart.length})</h2>
          <button onClick={() => setIsCartOpen(false)} className="icon-btn">
            <X className="icon-md" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <ShoppingBag className="icon-xl" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-item">
                <img src={item.image} alt={item.name} className="cart-item-image" />
                <div className="cart-item-details">
                  <h4 className="cart-item-name">{item.name}</h4>
                  <p className="cart-item-price">\${item.price}</p>
                  <div className="quantity-controls">
                    <button onClick={() => updateQuantity(item.id, -1)} className="qty-btn">
                      <Minus className="icon-xs" />
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="qty-btn">
                      <Plus className="icon-xs" />
                    </button>
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="remove-btn">
                  <X className="icon-sm" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Subtotal</span>
              <span className="total-amount">\${cartTotal.toFixed(2)}</span>
            </div>
            <button className="checkout-btn">
              Checkout
              <ChevronRight className="icon-sm" />
            </button>
            <p className="shipping-note">Free shipping on orders over \$100</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Hero Banner
function HeroBanner() {
  return (
    <section className="hero">
      <div className="hero-bg">
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />
      </div>
      <div className="hero-container">
        <div className="hero-content">
          <span className="hero-badge">Summer Sale - Up to 50% Off</span>
          <h1 className="hero-title">Discover Your Perfect Style</h1>
          <p className="hero-subtitle">
            Shop the latest trends in electronics, accessories, and more. Premium quality at unbeatable prices.
          </p>
          <button className="hero-btn">Shop Now</button>
        </div>
      </div>
    </section>
  )
}

// Features Bar
function FeaturesBar() {
  const features = [
    { icon: Truck, text: "Free Shipping" },
    { icon: Shield, text: "Secure Payment" },
    { icon: RefreshCw, text: "Easy Returns" },
  ]

  return (
    <div className="features-bar">
      <div className="features-container">
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-item">
              <feature.icon className="feature-icon" />
              <span className="feature-text">{feature.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Product Grid
function ProductGrid() {
  return (
    <section className="products-section">
      <div className="products-container">
        <div className="products-header">
          <h2 className="products-title">Trending Products</h2>
          <a href="#" className="view-all-link">
            View All <ChevronRight className="icon-sm" />
          </a>
        </div>
        <div className="products-grid">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}

// Main App
export default function App() {
  return (
    <CartProvider>
      <div className="app">
        <Header />
        <HeroBanner />
        <FeaturesBar />
        <ProductGrid />
        <CartSidebar />
      </div>
    </CartProvider>
  )
}`,

    "src/App.css": `
:root {
  --primary: #F43F5E;
  --primary-dark: #E11D48;
  --primary-light: #FB7185;
  --primary-bg: rgba(244, 63, 94, 0.1);

  --amber: #F59E0B;
  --purple: #A855F7;

  --bg: #FFFFFF;
  --bg-light: #F8FAFC;
  --surface: #FFFFFF;
  --text: #0F172A;
  --text-muted: #64748B;
  --text-light: #94A3B8;
  --border: #F1F5F9;

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Poppins', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

/* Icons */
.icon-xs { width: 12px; height: 12px; }
.icon-sm { width: 16px; height: 16px; }
.icon-md { width: 20px; height: 20px; }
.icon-lg { width: 24px; height: 24px; }
.icon-xl { width: 48px; height: 48px; color: #CBD5E1; }

.app {
  min-height: 100vh;
  background: var(--bg);
}

/* Header */
.header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
}

.header-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 640px) {
  .header-container { padding: 0 1.5rem; }
}

@media (min-width: 1024px) {
  .header-container { padding: 0 2rem; }
}

.header-content {
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
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary) 0%, #EC4899 100%);
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

.nav-link:hover,
.nav-link.active {
  color: var(--text);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  padding: 8px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  color: var(--text);
  background: var(--bg-light);
}

.desktop-only {
  display: none;
}

@media (min-width: 640px) {
  .desktop-only { display: flex; }
}

.cart-btn {
  position: relative;
  padding: 8px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.cart-btn:hover {
  color: var(--text);
  background: var(--bg-light);
}

.cart-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  background: var(--primary);
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
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

/* Mobile Menu */
.mobile-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.5);
}

.mobile-menu {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 256px;
  background: var(--bg);
  padding: 1.5rem;
}

.mobile-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
}

.mobile-nav {
  margin-top: 3rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mobile-link {
  padding: 8px 0;
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: none;
}

/* Hero */
.hero {
  position: relative;
  background: linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%);
  color: white;
  padding: 64px 0;
  overflow: hidden;
}

@media (min-width: 640px) {
  .hero { padding: 96px 0; }
}

.hero-bg {
  position: absolute;
  inset: 0;
  opacity: 0.2;
}

.hero-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(64px);
}

.hero-blob-1 {
  top: 0;
  right: 0;
  width: 384px;
  height: 384px;
  background: var(--primary);
}

.hero-blob-2 {
  bottom: 0;
  left: 0;
  width: 384px;
  height: 384px;
  background: var(--purple);
}

.hero-container {
  position: relative;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 640px) {
  .hero-container { padding: 0 1.5rem; }
}

@media (min-width: 1024px) {
  .hero-container { padding: 0 2rem; }
}

.hero-content {
  max-width: 672px;
}

.hero-badge {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(244, 63, 94, 0.2);
  color: #FDA4AF;
  border-radius: 100px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 1rem;
}

.hero-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  line-height: 1.2;
}

@media (min-width: 640px) {
  .hero-title { font-size: 3rem; }
}

.hero-subtitle {
  font-size: 1.125rem;
  color: #94A3B8;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.hero-btn {
  padding: 1rem 2rem;
  background: white;
  color: var(--text);
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.hero-btn:hover {
  background: var(--bg-light);
}

/* Features Bar */
.features-bar {
  background: var(--bg-light);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.features-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 640px) {
  .features-container { padding: 0 1.5rem; }
}

@media (min-width: 1024px) {
  .features-container { padding: 0 2rem; }
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  padding: 1.5rem 0;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
}

@media (min-width: 640px) {
  .feature-item {
    flex-direction: row;
    text-align: left;
  }
}

.feature-icon {
  width: 20px;
  height: 20px;
  color: var(--primary);
}

.feature-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
}

/* Products Section */
.products-section {
  padding: 64px 0;
}

.products-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 640px) {
  .products-container { padding: 0 1.5rem; }
}

@media (min-width: 1024px) {
  .products-container { padding: 0 2rem; }
}

.products-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.products-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
}

@media (min-width: 640px) {
  .products-title { font-size: 1.875rem; }
}

.view-all-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--primary);
  font-weight: 500;
  text-decoration: none;
}

.view-all-link:hover {
  text-decoration: underline;
}

.products-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 640px) {
  .products-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .products-grid { grid-template-columns: repeat(3, 1fr); }
}

/* Product Card */
.product-card {
  position: relative;
  background: var(--bg);
  border-radius: 16px;
  border: 1px solid var(--border);
  overflow: hidden;
  transition: all 0.3s;
}

.product-card:hover {
  box-shadow: var(--shadow-xl);
}

.product-image-wrapper {
  position: relative;
  aspect-ratio: 1;
  background: var(--bg-light);
  overflow: hidden;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s;
}

.product-card:hover .product-image {
  transform: scale(1.05);
}

.wishlist-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  border: none;
  border-radius: 50%;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: background 0.2s;
  color: var(--text-muted);
}

.wishlist-btn:hover {
  background: white;
}

.quick-add {
  position: absolute;
  left: 1rem;
  right: 1rem;
  bottom: 1rem;
  opacity: 0;
  transform: translateY(8px);
  transition: all 0.3s;
}

.quick-add.visible {
  opacity: 1;
  transform: translateY(0);
}

.add-to-cart-btn {
  width: 100%;
  padding: 12px;
  background: var(--text);
  color: white;
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.add-to-cart-btn:hover {
  background: #1E293B;
}

.product-info {
  padding: 1rem;
}

.product-category {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.product-name {
  margin-top: 4px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-meta {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.product-price {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text);
}

.product-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.star-icon {
  width: 16px;
  height: 16px;
  fill: var(--amber);
  color: var(--amber);
}

.reviews-count {
  color: var(--text-light);
}

/* Cart Sidebar */
.cart-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
}

.cart-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.cart-sidebar {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 100%;
  max-width: 448px;
  background: var(--bg);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
}

.cart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.cart-title {
  font-size: 1.25rem;
  font-weight: 700;
}

.cart-items {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cart-empty {
  text-align: center;
  padding: 3rem 0;
  color: var(--text-muted);
}

.cart-empty svg {
  margin: 0 auto 1rem;
}

.cart-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-light);
  border-radius: 12px;
}

.cart-item-image {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  object-fit: cover;
}

.cart-item-details {
  flex: 1;
}

.cart-item-name {
  font-weight: 500;
  color: var(--text);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cart-item-price {
  color: var(--primary);
  font-weight: 600;
  margin-top: 4px;
}

.quantity-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.qty-btn {
  padding: 4px;
  background: white;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.qty-btn:hover {
  background: var(--bg-light);
}

.qty-value {
  width: 32px;
  text-align: center;
  font-weight: 500;
}

.remove-btn {
  padding: 4px;
  background: transparent;
  border: none;
  color: var(--text-light);
  cursor: pointer;
  transition: color 0.2s;
}

.remove-btn:hover {
  color: var(--primary);
}

.cart-footer {
  padding: 1.5rem;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cart-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 1.125rem;
}

.cart-total span:first-child {
  color: var(--text-muted);
}

.total-amount {
  font-weight: 700;
  color: var(--text);
}

.checkout-btn {
  width: 100%;
  padding: 1rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.2s;
}

.checkout-btn:hover {
  background: var(--primary-dark);
}

.shipping-note {
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-muted);
}
`,

    "src/index.css": `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Poppins', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#root {
  min-height: 100vh;
}`
  }
};
