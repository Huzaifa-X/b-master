import { TemplateDefinition } from './index';

export const ecommerceTemplate: TemplateDefinition = {
  id: "e-commerce",
  name: "E-Commerce",
  description: "Modern online store with product grid, cart, and interactive checkout",
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
    <nav className="navbar">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white">
              <ShoppingBag size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight">ShopFlow</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {['Shop', 'Categories', 'Deals', 'About'].map(t => (
              <a key={t} href="#" className="text-gray-500 hover:text-black font-medium transition-colors">{t}</a>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-all">
            <Search size={22} />
          </button>
          <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-all">
            <Heart size={22} />
            {wishlist.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
            )}
          </button>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="group relative p-2 px-4 bg-gray-900 text-white rounded-full hover:bg-black transition-all flex items-center gap-2"
          >
            <ShoppingBag size={18} />
            <span className="font-semibold text-sm">{cartCount}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}`,

    "src/components/shop/ProductCard.jsx": `import { Heart, Star, ShoppingCart } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function ProductCard({ product }) {
  const { addToCart, wishlist, toggleWishlist } = useApp();
  const isWishlisted = wishlist.includes(product.id);

  return (
    <div className="group bg-white rounded-3xl overflow-hidden border border-gray-100 hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-500">
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
        />
        <button 
          onClick={() => toggleWishlist(product.id)}
          className={\`absolute top-4 right-4 p-3 rounded-2xl backdrop-blur-md transition-all \${
            isWishlisted ? 'bg-rose-500 text-white' : 'bg-white/80 text-gray-900 hover:bg-white'
          }\`}
        >
          <Heart size={20} fill={isWishlisted ? 'currentColor' : 'none'} />
        </button>
        <div className="absolute inset-x-4 bottom-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
          <button 
            onClick={() => addToCart(product)}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black"
          >
            <ShoppingCart size={18} />
            Add to Cart
          </button>
        </div>
      </div>
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-1">{product.category}</p>
            <h3 className="text-lg font-bold truncate pr-4">{product.name}</h3>
          </div>
          <span className="text-xl font-extrabold">\${product.price}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} fill={i < Math.floor(product.rating) ? 'currentColor' : 'none'} />
            ))}
          </div>
          <span className="text-sm font-bold">{product.rating}</span>
          <span className="text-sm text-gray-400 font-medium">({product.reviews} reviews)</span>
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
      <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="p-6 h-20 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <ShoppingBag className="text-rose-500" />
            <h2 className="text-xl font-extrabold">Your Bag</h2>
            <span className="bg-gray-100 px-2 py-1 rounded-lg text-xs font-bold">{cart.length}</span>
          </div>
          <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <ShoppingBag size={64} className="mb-4" />
              <p className="text-lg font-bold">Bag is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-4">
                <div className="w-24 h-24 rounded-2xl bg-gray-50 overflow-hidden flex-shrink-0">
                  <img src={item.image} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold underline-offset-4 hover:underline cursor-pointer">{item.name}</h4>
                  <p className="text-sm text-gray-500 mb-3">{item.category}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center bg-gray-100 rounded-xl p-1 px-2 gap-3">
                      <button onClick={() => updateQuantity(item.id, -1)} className="hover:text-rose-500"><Minus size={14}/></button>
                      <span className="font-bold text-sm">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="hover:text-rose-500"><Plus size={14}/></button>
                    </div>
                    <span className="font-extrabold">\${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-rose-500">
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t border-gray-100 space-y-4">
            <div className="flex justify-between text-lg">
              <span className="text-gray-500 font-medium">Subtotal</span>
              <span className="font-extrabold">\${cartTotal.toFixed(2)}</span>
            </div>
            <button 
              onClick={() => {
                setIsCartOpen(false);
                setIsCheckoutOpen(true);
              }}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95"
            >
              Go to Checkout
              <ArrowRight size={18} />
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCheckoutOpen(false)} />
      <div className="relative w-full max-w-lg bg-white rounded-[32px] overflow-hidden shadow-3xl animate-in zoom-in-95 duration-300">
        
        {step !== 'success' && (
          <div className="p-8 pb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black">Checkout</h2>
            <button onClick={() => setIsCheckoutOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
        )}

        <div className="p-8 pt-4">
          {step === 'summary' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.quantity}x {item.name}</span>
                    <span className="font-bold">\${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between">
                  <span className="font-bold">Total</span>
                  <span className="font-black text-rose-500 text-lg">\${cartTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl border border-gray-100 flex items-center gap-3">
                  <Truck className="text-blue-500" size={20} />
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Shipping</p>
                    <p className="text-xs font-bold">Express (2-3 Days)</p>
                  </div>
                </div>
                <div className="p-4 rounded-2xl border border-gray-100 flex items-center gap-3">
                  <ShieldCheck className="text-emerald-500" size={20} />
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Security</p>
                    <p className="text-xs font-bold">256-bit Encrypted</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setStep('payment')}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all"
              >
                Proceed to Payment
              </button>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-6">
              <div className="p-6 border-2 border-gray-900 rounded-2xl flex items-center gap-4">
                <CreditCard size={24} />
                <div className="flex-1">
                  <p className="font-bold italic">**** **** **** 4242</p>
                  <p className="text-xs text-gray-400">Expires 12/26</p>
                </div>
                <CheckCircle2 className="text-gray-900" size={20} fill="currentColor" />
              </div>

              <div className="text-center">
                <p className="text-gray-400 text-sm mb-6 px-4">
                  By clicking "Pay Now", you agree to our terms of service and acknowledge the non-refundable nature of digital goods.
                </p>
                <button 
                  onClick={handlePayment}
                  className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold text-lg hover:bg-rose-600 transition-all shadow-xl shadow-rose-200"
                >
                  Pay \${cartTotal.toFixed(2)} Now
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-12 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 scale-125">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="text-3xl font-black mb-2">Order Confirmed!</h2>
              <p className="text-gray-500 max-w-[240px]">
                Your premium products are on their way. Redirecting you shortly...
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
import './App.css';

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen">
        <Navbar />
        
        <header className="pt-12 pb-20 px-6">
          <div className="container mx-auto">
            <div className="max-w-2xl">
              <span className="px-4 py-2 bg-rose-50 rounded-full text-rose-500 font-bold text-sm mb-6 inline-block">Curated Collections</span>
              <h1 className="text-5xl md:text-7xl font-black leading-[1.1] mb-8">Elevate Your Everyday Essentials.</h1>
              <p className="text-xl text-gray-500 font-medium">Discover premium craftsmanship and minimalist design in every piece of our latest drop.</p>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </main>

        <CartDrawer />
        <CheckoutModal />
      </div>
    </AppProvider>
  );
}`,

    "src/App.css": `:root {
  --font-sans: 'Plus Jakarta Sans', sans-serif;
  --primary: #f43f5e;
  --primary-dark: #e11d48;
  --bg: #ffffff;
  --bg-light: #f8fafc;
  --border: #e2e8f0;
  --text: #0f172a;
  --text-muted: #64748b;
  --text-light: #94a3b8;
  --amber: #fbbf24;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  --shadow-3xl: 0 32px 64px -12px rgba(0, 0, 0, 0.2);
}

body {
  font-family: var(--font-sans);
  margin: 0;
  padding: 0;
}

.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
}

.shadow-3xl {
  box-shadow: var(--shadow-3xl);
}

.transition-transform {
  transition-property: transform;
}
`,

    "src/index.css": `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: 'Plus Jakarta Sans', sans-serif;
}

body {
  margin: 0;
  padding: 0;
}
`
  }
};
