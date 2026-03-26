import { TemplateDefinition } from './index';

export const ecommerceTemplate: TemplateDefinition = {
  id: "e-commerce",
  name: "E-Commerce",
  description: "Modern online store with product grid, cart, and interactive checkout using Tailwind CSS",
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
          "clsx": "^2.1.0",
          "tailwind-merge": "^2.2.1"
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
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <title>ShopFlow - Premium E-Commerce</title>
  </head>
  <body class="antialiased text-gray-900 bg-white">
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
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
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
    @apply antialiased text-slate-900 bg-white;
    font-family: 'Plus Jakarta Sans', sans-serif;
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
    "src/data/products.js": `export const products = [
  { id: 1, name: "Premium Wireless Headphones", price: 299.00, rating: 4.8, reviews: 245, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80", category: "Electronics" },
  { id: 2, name: "Minimalist Watch", price: 199.00, rating: 4.9, reviews: 189, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80", category: "Accessories" },
  { id: 3, name: "Designer Sunglasses", price: 159.00, rating: 4.7, reviews: 312, image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80", category: "Accessories" },
  { id: 4, name: "Leather Backpack", price: 249.00, rating: 4.6, reviews: 156, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80", category: "Bags" },
  { id: 5, name: "Smart Fitness Tracker", price: 179.00, rating: 4.5, reviews: 423, image: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&q=80", category: "Electronics" },
  { id: 6, name: "Ceramic Coffee Set", price: 49.00, rating: 4.8, reviews: 89, image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80", category: "Home" },
];`,

    // --- CONTEXT ---
    "src/context/AppContext.jsx": `import { useState, createContext, useContext, useEffect } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [wishlist, setWishlist] = useState([]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const toggleWishlist = (productId) => {
    setWishlist(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId) 
        : [...prev, productId]
    );
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <AppContext.Provider value={{
      cart, cartTotal, cartCount, isCartOpen, isCheckoutOpen, wishlist,
      addToCart, removeFromCart, updateQuantity, setIsCartOpen, setIsCheckoutOpen, toggleWishlist, clearCart
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);`,

    // --- COMPONENTS ---
    "src/components/layout/Navbar.jsx": `import { ShoppingBag, Search, User, Heart, Menu } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Navbar() {
  const { cartCount, setIsCartOpen, wishlist } = useApp();

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-11 h-11 bg-rose-500 rounded-[14px] flex items-center justify-center text-white shadow-lg shadow-rose-200 group-hover:scale-105 transition-transform">
              <ShoppingBag size={22} strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-black tracking-tighter text-slate-900">ShopFlow</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {['Shop', 'Categories', 'Deals', 'About'].map(t => (
              <a key={t} href="#" className="text-[15px] text-slate-500 hover:text-rose-500 font-bold tracking-tight transition-colors">{t}</a>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="hidden sm:flex p-3 text-slate-500 hover:bg-slate-50 rounded-full transition-all">
            <Search size={22} />
          </button>
          <button className="relative p-3 text-slate-500 hover:bg-slate-50 rounded-full transition-all group">
            <Heart size={22} className={wishlist.length > 0 ? "fill-rose-500 text-rose-500" : ""} />
            {wishlist.length > 0 && (
              <span className="absolute top-2.5 right-2.5 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </button>
          <div className="w-px h-8 bg-slate-100 mx-1 hidden sm:block" />
          <button 
            onClick={() => setIsCartOpen(true)}
            className="group relative p-2 px-5 bg-slate-900 text-white rounded-full hover:bg-black transition-all flex items-center gap-3 shadow-xl shadow-slate-200"
          >
            <div className="relative">
              <ShoppingBag size={18} strokeWidth={2.5} />
              <span className="absolute -top-3 -right-3 min-w-[20px] h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                {cartCount}
              </span>
            </div>
            <span className="font-bold text-sm tracking-tight pr-1">Cart</span>
          </button>
        </div>
      </div>
    </nav>
  );
}`,

    "src/components/shop/ProductCard.jsx": `import { Heart, Star, ShoppingBag, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function ProductCard({ product }) {
  const { addToCart, wishlist, toggleWishlist } = useApp();
  const isWishlisted = wishlist.includes(product.id);

  return (
    <div className="group relative bg-white rounded-[40px] p-4 border border-slate-50 hover:border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700">
      <div className="relative aspect-[4/5] rounded-[28px] overflow-hidden bg-slate-50 mb-6">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
        />
        <button 
          onClick={() => toggleWishlist(product.id)}
          className={\`absolute top-5 right-5 p-3.5 rounded-2xl backdrop-blur-md transition-all duration-300 \${
            isWishlisted ? 'bg-rose-500 text-white shadow-lg' : 'bg-white/80 text-slate-900 hover:bg-white hover:scale-105'
          }\`}
        >
          <Heart size={20} strokeWidth={2.5} fill={isWishlisted ? 'currentColor' : 'none'} />
        </button>
        
        <div className="absolute inset-x-5 bottom-5 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
          <button 
            onClick={() => addToCart(product)}
            className="w-full py-4.5 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-black shadow-2xl active:scale-[0.98] transition-all"
          >
            <Plus size={20} strokeWidth={3} />
            Add to Selection
          </button>
        </div>
      </div>

      <div className="px-3 pb-2">
        <div className="flex justify-between items-start gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1.5 block">{product.category}</span>
            <h3 className="text-xl font-bold text-slate-900 leading-tight truncate">{product.name}</h3>
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tighter">\${product.price}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={15} strokeWidth={2.5} fill={i < Math.floor(product.rating) ? 'currentColor' : 'none'} />
            ))}
          </div>
          <p className="text-sm font-bold text-slate-900">{product.rating}</p>
          <span className="text-xs text-slate-400 font-bold ml-1 uppercase">{product.reviews} Reviews</span>
        </div>
      </div>
    </div>
  );
}`,

    "src/components/cart/CartDrawer.jsx": `import { X, ShoppingBag, ArrowRight, Minus, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function CartDrawer() {
  const { cart, cartTotal, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, setIsCheckoutOpen } = useApp();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsCartOpen(false)} />
      <div className="relative w-full max-w-lg bg-white h-full flex flex-col shadow-[-40px_0_80px_-20px_rgba(0,0,0,0.1)] animate-in slide-in-from-right duration-500 ease-out">
        <div className="p-8 h-24 flex items-center justify-between border-b border-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
              <ShoppingBag size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight leading-none mb-1">Your Bag</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cart.length} items selected</p>
            </div>
          </div>
          <button onClick={() => setIsCartOpen(false)} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-900">
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-10">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
                <ShoppingBag size={48} strokeWidth={1} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">The bag is empty</h3>
              <p className="text-slate-400 text-sm leading-relaxed">It looks like you haven't added anything to your bag yet. Let's find something special.</p>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="mt-8 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-6 group">
                <div className="w-28 h-28 rounded-3xl bg-slate-50 overflow-hidden flex-shrink-0 border border-slate-100">
                  <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                </div>
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <h4 className="font-bold text-lg text-slate-900 leading-tight truncate">{item.name}</h4>
                    <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{item.category}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center bg-slate-50 rounded-2xl p-1 gap-1 border border-slate-100">
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"><Minus size={14} strokeWidth={3}/></button>
                      <span className="w-8 text-center font-black text-sm text-slate-900">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"><Plus size={14} strokeWidth={3}/></button>
                    </div>
                    <span className="font-black text-xl text-slate-900 tracking-tighter">\${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-8 bg-slate-50 border-t border-slate-100 space-y-6">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Tax & Shipping</span>
                <span className="font-bold text-slate-900">Calculated later</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-slate-900 font-bold text-xl leading-none">Total</span>
                <span className="font-black text-3xl text-slate-900 tracking-tighter leading-none">\${cartTotal.toFixed(2)}</span>
              </div>
            </div>
            <button 
              onClick={() => {
                setIsCartOpen(false);
                setIsCheckoutOpen(true);
              }}
              className="w-full py-5 bg-rose-500 text-white rounded-[24px] font-black text-lg flex items-center justify-center gap-3 hover:bg-rose-600 transition-all shadow-xl shadow-rose-200 active:scale-[0.98]"
            >
              Checkout Now
              <ArrowRight size={22} strokeWidth={3} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}`,

    "src/components/shop/CheckoutModal.jsx": `import { useState } from 'react';
import { X, ShieldCheck, CreditCard, Truck, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function CheckoutModal() {
  const { isCheckoutOpen, setIsCheckoutOpen, cart, cartTotal, clearCart } = useApp();
  const [step, setStep] = useState('summary'); // summary | payment | success

  if (!isCheckoutOpen) return null;

  const handlePayment = () => {
    setStep('success');
    setTimeout(() => {
      setIsCheckoutOpen(false);
      clearCart();
      setStep('summary');
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setIsCheckoutOpen(false)} />
      <div className="relative w-full max-w-xl bg-white rounded-[40px] overflow-hidden shadow-[0_32px_128px_-32px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500">
        
        {step !== 'success' && (
          <div className="p-10 pb-4 flex items-center justify-between border-b border-slate-50">
            <div>
              <h2 className="text-3xl font-black tracking-tight leading-none mb-1">Finalize Order</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secure encrypted checkout</p>
            </div>
            <button onClick={() => setIsCheckoutOpen(false)} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
              <X size={22} strokeWidth={3} />
            </button>
          </div>
        )}

        <div className="p-10 pt-8">
          {step === 'summary' && (
            <div className="space-y-8">
              <div className="bg-slate-50 rounded-[32px] p-8 space-y-4 border border-slate-100">
                <div className="max-h-40 overflow-y-auto space-y-2 pr-4 scrollbar-thin scrollbar-thumb-slate-200">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-[15px]">
                      <span className="text-slate-600 font-medium">
                        <strong className="text-slate-900">{item.quantity}x</strong> {item.name}
                      </span>
                      <span className="font-bold text-slate-900">\${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-200 mt-4 pt-6 flex justify-between items-end">
                  <span className="font-extrabold text-lg flex flex-col">
                    Order Total
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inclusive of all taxes</span>
                  </span>
                  <span className="font-black text-4xl text-rose-500 tracking-tighter leading-none text-right">
                    \${cartTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-[24px] bg-sky-50/50 border border-sky-100 flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-sky-500 shadow-sm">
                    <Truck size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-sky-600 uppercase tracking-widest block mb-0.5">Shipping</label>
                    <p className="text-sm font-bold text-slate-900">Priority (2 Days)</p>
                  </div>
                </div>
                <div className="p-5 rounded-[24px] bg-emerald-50/50 border border-emerald-100 flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm">
                    <ShieldCheck size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-0.5">Security</label>
                    <p className="text-sm font-bold text-slate-900">256-bit SSL</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setStep('payment')}
                className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-xl flex items-center justify-center gap-3 hover:bg-black transition-all shadow-2xl active:scale-[0.98]"
              >
                Continue to Payment
              </button>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="p-8 border-2 border-slate-900 rounded-[32px] flex items-center gap-6 bg-slate-50/50 relative overflow-hidden">
                <div className="w-14 h-10 bg-black rounded-lg flex items-center justify-center text-white flex-shrink-0">
                  <CreditCard size={28} />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-black italic text-slate-900 tracking-widest">•••• •••• •••• 4242</p>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Expires 12 / 2028</p>
                </div>
                <CheckCircle2 className="text-slate-900 fill-current" size={24} />
              </div>

              <div className="text-center px-6">
                <p className="text-slate-400 text-xs leading-relaxed mb-8">
                  By clicking payment, you agree to our <strong className="text-slate-700">Terms of Service</strong>. 
                  Your transaction is protected by industry leading encryption.
                </p>
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={handlePayment}
                    className="w-full py-5 bg-rose-500 text-white rounded-[24px] font-black text-2xl hover:bg-rose-600 transition-all shadow-2xl shadow-rose-200 active:scale-[0.98]"
                  >
                    Pay \${cartTotal.toFixed(2)}
                  </button>
                  <button onClick={() => setStep('summary')} className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">
                    Go Back
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-20 flex flex-col items-center text-center animate-in fade-in zoom-in-75 duration-700">
              <div className="relative mb-12">
                <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 animate-pulse" />
                <div className="relative w-32 h-32 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={64} strokeWidth={2.5} />
                </div>
              </div>
              <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight leading-none">Order Confirmed!</h2>
              <p className="text-slate-500 max-w-[280px] leading-relaxed font-medium">
                Your premium curation is being prepared for shipment. You'll receive a tracker via email shortly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}`,

    // --- MAIN APP ---
    "src/App.jsx": `import { AppProvider } from './context/AppContext';
import Navbar from './components/layout/Navbar';
import ProductCard from './components/shop/ProductCard';
import CartDrawer from './components/cart/CartDrawer';
import CheckoutModal from './components/shop/CheckoutModal';
import { products } from './data/products';
import { ShoppingBag } from 'lucide-react';

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-white">
        <Navbar />
        
        <header className="pt-24 pb-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 rounded-full text-rose-600 font-black text-xs uppercase tracking-widest mb-10 shadow-sm border border-rose-100 animate-in fade-in slide-in-from-left duration-700">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                Curated Collections 2024
              </div>
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black leading-[0.9] text-slate-900 tracking-tighter mb-12 animate-in fade-in slide-in-from-top duration-1000">
                Elevate Your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-purple-600 italic">Lifestyle.</span>
              </h1>
              <p className="text-xl md:text-2xl text-slate-500 max-w-2xl leading-relaxed font-bold animate-in fade-in slide-in-from-bottom duration-1000 delay-200">
                Discover refined essentials crafted for those who appreciate the intersection of high utility and minimalist aesthetics.
              </p>
            </div>
          </div>
        </header>

        <section className="bg-slate-50/50 py-32 rounded-[64px] mx-4 mb-24 lg:mx-10 border border-slate-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-4">Latest Drops</h2>
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Recently curated additions to the catalog</p>
              </div>
              <div className="flex gap-4">
                {['All', 'Electronics', 'Home', 'Style'].map((f, i) => (
                  <button key={f} className={\`px-6 py-3 rounded-2xl text-sm font-black transition-all \${i === 0 ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-500 hover:bg-slate-100'}\`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {products.map((p, i) => (
                <div key={p.id} className="animate-in fade-in slide-in-from-bottom-10 fill-mode-both duration-700" style={{ animationDelay: \`\${i * 100}ms\` }}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="bg-slate-950 text-white py-24 px-6 rounded-t-[64px]">
          <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-rose-500 rounded-3xl flex items-center justify-center mb-10 shadow-2xl shadow-rose-500/50">
               <ShoppingBag size={32} strokeWidth={2.5} />
            </div>
            <h2 className="text-4xl font-black tracking-tighter mb-4">ShopFlow Premium</h2>
            <p className="text-slate-500 font-bold max-w-md mx-auto mb-12">Building the future of digital commerce discovery. join the movement.</p>
            <div className="flex gap-8 text-xs font-black uppercase tracking-widest text-slate-400">
              <a href="#" className="hover:text-white transition-colors">Instagram</a>
              <a href="#" className="hover:text-white transition-colors">TikTok</a>
              <a href="#" className="hover:text-white transition-colors">X / Twitter</a>
            </div>
          </div>
        </footer>

        <CartDrawer />
        <CheckoutModal />
      </div>
    </AppProvider>
  );
}`,
  }
};
