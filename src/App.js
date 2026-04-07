import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, addDoc, onSnapshot, collection, query, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { Archive, FlaskConical, GlassWater, Home, Plus, Trash2, Mic, MicOff, LoaderCircle, List, ChevronLeft, ChevronRight, FileDown, Pencil, X, LogIn, LogOut } from 'lucide-react';

// Tailwind CSS classes for consistent UI
const tailwind = "bg-[#F4EFEA] text-[#4E3629] min-h-screen p-8 font-sans transition-all duration-300 flex flex-col items-center";
const card = "bg-[#E0D8D0] rounded-2xl shadow-xl p-6 mb-8 w-full max-w-4xl";
const inputField = "bg-[#C8C2BA] text-[#4E3629] p-3 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#8A2A2B] placeholder-[#4E3629]";
const button = "bg-[#4E3629] hover:bg-[#8A2A2B] text-[#F4EFEA] font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105";
const tabButton = "p-4 flex-1 text-center rounded-xl transition-all duration-200 flex items-center justify-center";
const activeTab = "bg-[#8A2A2B] text-[#F4EFEA] shadow-lg";
const inactiveTab = "bg-[#E0D8D0] text-[#4E3629] hover:bg-[#C8C2BA]";
const notificationBox = "bg-red-700 text-white p-4 rounded-xl mb-4";
const lowStockItem = "flex justify-between items-center bg-[#C8C2BA] p-3 rounded-xl mb-2";
const micButton = "bg-[#4E3629] hover:bg-[#8A2A2B] text-[#F4EFEA] font-bold p-3 rounded-full shadow-lg transition-all duration-200 ease-in-out transform hover:scale-110 flex items-center justify-center";
const loadingSpinner = "animate-spin text-[#F4EFEA]";
const tableHeader = "bg-[#C8C2BA] text-left text-[#4E3629] font-semibold";
const tableRow = "border-t border-[#B5AE9F] hover:bg-[#C8C2BA] transition-colors";
const tableCell = "py-3 px-4 text-sm";
const paginationButton = "px-4 py-2 mx-1 rounded-full bg-[#C8C2BA] hover:bg-[#8A2A2B] hover:text-[#F4EFEA] text-[#4E3629]";

// Firebase configuration - Corrected character by character from your screenshot
const firebaseConfig = {
  apiKey: "AIzaSyDy1Yr1RpPmWuUIAWzlYdwWGgeqEFQpcjZk",
  authDomain: "distillation-app.firebaseapp.com",
  projectId: "distillation-app",
  storageBucket: "distillation-app.firebasestorage.app",
  messagingSenderId: "198528022551",
  appId: "1:198528022551:web:fd830c47cdada01faf4452"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [view, setView] = useState('dashboard');
  const [recipes, setRecipes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [distillationLogs, setDistillationLogs] = useState([]);
  const [bottlingLogs, setBottlingLogs] = useState([]);
  const [combinedLogs, setCombinedLogs] = useState([]);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [editingInventoryId, setEditingInventoryId] = useState(null);
  const [authError, setAuthError] = useState("");

  // IMPORTANT: CHANGE THIS to your actual Gmail address (e.g., "birgir@gmail.com")
  const ADMIN_EMAIL = "birgir@thoran.is"; 

  const [inventoryForm, setInventoryForm] = useState({
    name: '', type: 'ingredient', quantity: '', unit: '', lowStockThreshold: '', leadTimeDays: ''
  });

  const [distillationForm, setDistillationForm] = useState({
    date: new Date().toISOString().slice(0, 16), recipeName: '', distillationStart: '', 
    powerLevel: '', headsCollectionStart: '', heartsCollectionStart: '', heartsCollectionStop: '',
    tailsDuration: '', distillateAmount: '', distillateABV: '', notes: '',
    lowerPlateOn: false, upperPlateOn: false, dephlegmatorOn: false,
  });

  const [bottlingForm, setBottlingForm] = useState({
    date: new Date().toISOString().slice(0, 10), product: '', bottledAmount: '', lotNumber: '', notes: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isListeningDistillation, setIsListeningDistillation] = useState(false);
  const [isLoadingAIDistillation, setIsLoadingAIDistillation] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Data Listeners
  useEffect(() => {
    if (user) {
      const appIdStr = 'distillation-app';
      const paths = ['inventory', 'recipes', 'distillationLogs', 'bottlingLogs'];
      const unsubscribers = paths.map(path => {
        return onSnapshot(collection(db, 'artifacts', appIdStr, 'users', user.uid, path), (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          if (path === 'inventory') setInventory(data);
          if (path === 'recipes') setRecipes(data);
          if (path === 'distillationLogs') setDistillationLogs(data.map(d => ({ ...d, type: 'distillation' })));
          if (path === 'bottlingLogs') setBottlingLogs(data.map(d => ({ ...d, type: 'bottling' })));
        }, (err) => {
           console.error(`Error fetching ${path}:`, err);
        });
      });
      return () => unsubscribers.forEach(unsub => unsub());
    }
  }, [user]);

  useEffect(() => {
    const combined = [...distillationLogs, ...bottlingLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
    setCombinedLogs(combined);
  }, [distillationLogs, bottlingLogs]);

  // Login Handler
  const handleLogin = async () => {
    setAuthError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      
      if (ADMIN_EMAIL !== "your.admin.email@example.com" && result.user.email !== ADMIN_EMAIL) {
        await signOut(auth);
        setAuthError(`Access Denied: ${result.user.email} is not authorized.`);
      }
    } catch (err) {
      console.error("Login error:", err);
      setAuthError(err.message.includes("closed-by-user") 
        ? "Login window was closed. Please try again." 
        : `Login failed: ${err.code || err.message}`);
    }
  };

  const handleLogout = () => signOut(auth);

  const showNotification = (msg) => {
    setNotificationMessage(msg);
    setShowNotificationModal(true);
  };

  // Inventory Logic
  const handleInventorySubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    const data = {
      ...inventoryForm,
      quantity: parseFloat(inventoryForm.quantity),
      lowStockThreshold: parseFloat(inventoryForm.lowStockThreshold),
      leadTimeDays: parseInt(inventoryForm.leadTimeDays, 10)
    };
    try {
      if (editingInventoryId) {
        await updateDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'inventory', editingInventoryId), data);
        showNotification("Item Updated");
      } else {
        await addDoc(collection(db, 'artifacts', 'distillation-app', 'users', user.uid, 'inventory'), data);
        showNotification("Item Added");
      }
      setInventoryForm({ name: '', type: 'ingredient', quantity: '', unit: '', lowStockThreshold: '', leadTimeDays: '' });
      setEditingInventoryId(null);
    } catch (err) { showNotification("Save failed"); }
  };

  const deleteInventoryItem = async (id) => {
    if (!user) return;
    if (window.confirm("Are you sure you want to delete this item?")) {
      await deleteDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'inventory', id));
      showNotification("Item Deleted Permanently");
    }
  };

  // Log Submission
  const handleLogSubmit = async (e, type) => {
    e.preventDefault();
    if (!user) return;
    const path = type === 'distillation' ? 'distillationLogs' : 'bottlingLogs';
    const form = type === 'distillation' ? distillationForm : bottlingForm;
    try {
      await addDoc(collection(db, 'artifacts', 'distillation-app', 'users', user.uid, path), form);
      showNotification("Log Saved Successfully");
      if (type === 'distillation') {
        setDistillationForm({ ...distillationForm, recipeName: '', notes: '' });
      } else {
        setBottlingForm({ ...bottlingForm, product: '', bottledAmount: '' });
      }
    } catch (err) { showNotification("Error saving log"); }
  };

  const exportPDF = () => {
    const element = document.getElementById('logs-table');
    if (window.html2pdf) {
      window.html2pdf().from(element).save('distillery_logs.pdf');
    } else {
      showNotification("PDF Library not loaded yet.");
    }
  };

  if (!isAuthReady) return <div className={tailwind}><LoaderCircle className="animate-spin mt-20" size={48} /></div>;

  if (!user) {
    return (
      <div className={tailwind}>
        <div className={card + " text-center mt-20 max-w-md"}>
          <h2 className="text-2xl font-black mb-6 text-[#4E3629]">Distillery App Login</h2>
          <button onClick={handleLogin} className={button + " w-full flex items-center justify-center gap-3"}>
            <LogIn size={20} /> Sign in with Google
          </button>
          {authError && <div className="mt-6 p-3 bg-red-100 text-red-700 rounded-xl text-sm border border-red-200">{authError}</div>}
        </div>
      </div>
    );
  }

  const currentLogs = combinedLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className={tailwind}>
      <header className="w-full max-w-4xl mb-8 flex flex-col gap-4">
        <div className="flex justify-between items-center bg-[#E0D8D0] p-4 rounded-2xl shadow-md border-b-4 border-[#8A2A2B]">
          <span className="font-bold text-[#8A2A2B] truncate mr-4">{user.email}</span>
          <button onClick={handleLogout} className="text-red-800 hover:text-red-600 flex items-center gap-1 text-sm font-black whitespace-nowrap">
            <LogOut size={16} /> LOGOUT
          </button>
        </div>
        <nav className="flex bg-[#E0D8D0] rounded-2xl p-2 shadow-xl overflow-x-auto gap-1">
          <button onClick={() => setView('dashboard')} className={`${tabButton} ${view === 'dashboard' ? activeTab : inactiveTab}`}><Home size={18} className="mr-1"/>Home</button>
          <button onClick={() => setView('distillation')} className={`${tabButton} ${view === 'distillation' ? activeTab : inactiveTab}`}><FlaskConical size={18} className="mr-1"/>Log Run</button>
          <button onClick={() => setView('bottling')} className={`${tabButton} ${view === 'bottling' ? activeTab : inactiveTab}`}><GlassWater size={18} className="mr-1"/>Bottling</button>
          <button onClick={() => setView('inventory')} className={`${tabButton} ${view === 'inventory' ? activeTab : inactiveTab}`}><Archive size={18} className="mr-1"/>Inventory</button>
          <button onClick={() => setView('logHistory')} className={`${tabButton} ${view === 'logHistory' ? activeTab : inactiveTab}`}><List size={18} className="mr-1"/>History</button>
        </nav>
      </header>

      <main className="w-full max-w-4xl">
        {view === 'dashboard' && (
          <div className="space-y-6">
            <div className={card}>
              <h1 className="text-3xl font-black mb-4 text-[#8A2A2B]">System Status</h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#8A2A2B] p-4 rounded-xl text-white">
                  <p className="text-2xl font-bold">{inventory.length}</p>
                  <p className="text-[10px] uppercase font-bold opacity-80">Stock Items</p>
                </div>
                <div className="bg-[#8A2A2B] p-4 rounded-xl text-white">
                  <p className="text-2xl font-bold">{combinedLogs.length}</p>
                  <p className="text-[10px] uppercase font-bold opacity-80">Total Batches</p>
                </div>
              </div>
            </div>
            {inventory.some(i => i.quantity <= i.lowStockThreshold) && (
              <div className={notificationBox}>
                <h3 className="font-bold mb-2 flex items-center gap-2"><Archive size={18}/> Low Stock Alert</h3>
                {inventory.filter(i => i.quantity <= i.lowStockThreshold).map(i => (
                  <div key={i.id} className="text-sm py-1 border-b border-white/20 last:border-0">
                    {i.name}: {i.quantity} {i.unit} (Refill threshold: {i.lowStockThreshold})
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'distillation' && (
          <div className={card}>
            <h2 className="text-2xl font-bold mb-6 text-[#8A2A2B] flex justify-between items-center">
              New Run Log
              <button onClick={() => showNotification("AI Processing Coming Soon")} className={micButton}><Mic size={20}/></button>
            </h2>
            <form onSubmit={(e) => handleLogSubmit(e, 'distillation')} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="datetime-local" value={distillationForm.date} onChange={e => setDistillationForm({...distillationForm, date: e.target.value})} className={inputField} />
                <select value={distillationForm.recipeName} onChange={e => setDistillationForm({...distillationForm, recipeName: e.target.value})} className={inputField}>
                  <option value="">Select Recipe</option>
                  {recipes.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input type="time" placeholder="Start" value={distillationForm.distillationStart} onChange={e => setDistillationForm({...distillationForm, distillationStart: e.target.value})} className={inputField} />
                <input type="number" placeholder="Power" value={distillationForm.powerLevel} onChange={e => setDistillationForm({...distillationForm, powerLevel: e.target.value})} className={inputField} />
                <input type="number" placeholder="Result (L)" value={distillationForm.distillateAmount} onChange={e => setDistillationForm({...distillationForm, distillateAmount: e.target.value})} className={inputField} />
              </div>
              <textarea placeholder="Notes..." value={distillationForm.notes} onChange={e => setDistillationForm({...distillationForm, notes: e.target.value})} className={inputField + " h-24"} />
              <button type="submit" className={button + " w-full"}>SAVE DISTILLATION RUN</button>
            </form>
          </div>
        )}

        {view === 'bottling' && (
          <div className={card}>
            <h2 className="text-2xl font-bold mb-6 text-[#8A2A2B]">Bottling Log</h2>
            <form onSubmit={(e) => handleLogSubmit(e, 'bottling')} className="space-y-4">
              <input type="date" value={bottlingForm.date} onChange={e => setBottlingForm({...bottlingForm, date: e.target.value})} className={inputField} />
              <input type="text" placeholder="Product" value={bottlingForm.product} onChange={e => setBottlingForm({...bottlingForm, product: e.target.value})} className={inputField} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Units Bottled" value={bottlingForm.bottledAmount} onChange={e => setBottlingForm({...bottlingForm, bottledAmount: e.target.value})} className={inputField} />
                <input type="text" placeholder="Lot Number" value={bottlingForm.lotNumber} onChange={e => setBottlingForm({...bottlingForm, lotNumber: e.target.value})} className={inputField} />
              </div>
              <button type="submit" className={button + " w-full"}>SAVE BOTTLING LOG</button>
            </form>
          </div>
        )}

        {view === 'inventory' && (
          <div className={card}>
            <h2 className="text-2xl font-bold mb-6 text-[#8A2A2B] flex items-center gap-2"><Archive /> Stock Management</h2>
            <div className="overflow-x-auto mb-8 bg-white/30 rounded-xl p-2">
              <table className="w-full">
                <thead><tr className={tableHeader}><th className="p-3">Item</th><th className="p-3">Level</th><th className="p-3 text-center">Manage</th></tr></thead>
                <tbody>
                  {inventory.map(item => (
                    <tr key={item.id} className={tableRow}>
                      <td className="p-3 font-bold">{item.name}</td>
                      <td className={`p-3 ${item.quantity <= item.lowStockThreshold ? 'text-red-700 font-black' : ''}`}>{item.quantity} {item.unit}</td>
                      <td className="p-3 flex justify-center gap-3">
                        <button onClick={() => {setEditingInventoryId(item.id); setInventoryForm(item);}} className="p-2 text-blue-700 hover:bg-blue-100 rounded-lg"><Pencil size={18}/></button>
                        <button onClick={() => deleteInventoryItem(item.id)} className="p-2 text-red-700 hover:bg-red-100 rounded-lg"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <form onSubmit={handleInventorySubmit} className="bg-[#C8C2BA] p-6 rounded-2xl border-2 border-[#8A2A2B]/20 space-y-4 shadow-inner">
              <h3 className="font-black text-[#8A2A2B] uppercase text-sm tracking-widest">{editingInventoryId ? "Modify Item" : "Add New Stock"}</h3>
              <input type="text" placeholder="Item Name" value={inventoryForm.name} onChange={e => setInventoryForm({...inventoryForm, name: e.target.value})} className={inputField} required />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Quantity" value={inventoryForm.quantity} onChange={e => setInventoryForm({...inventoryForm, quantity: e.target.value})} className={inputField} required />
                <input type="text" placeholder="Unit (kg, L, Units)" value={inventoryForm.unit} onChange={e => setInventoryForm({...inventoryForm, unit: e.target.value})} className={inputField} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Alert Level" value={inventoryForm.lowStockThreshold} onChange={e => setInventoryForm({...inventoryForm, lowStockThreshold: e.target.value})} className={inputField} required />
                <input type="number" placeholder="Lead Days" value={inventoryForm.leadTimeDays} onChange={e => setInventoryForm({...inventoryForm, leadTimeDays: e.target.value})} className={inputField} required />
              </div>
              <div className="flex gap-2">
                <button type="submit" className={button + " flex-1 uppercase tracking-tighter"}>{editingInventoryId ? "Confirm Changes" : "Register Stock"}</button>
                {editingInventoryId && <button type="button" onClick={() => {setEditingInventoryId(null); setInventoryForm({name:'', type:'ingredient', quantity:'', unit:'', lowStockThreshold:'', leadTimeDays:''});}} className="bg-gray-500 text-white p-3 rounded-xl"><X /></button>}
              </div>
            </form>
          </div>
        )}

        {view === 'logHistory' && (
          <div className={card}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#8A2A2B]">Batch History</h2>
              <button onClick={exportPDF} className="p-2 bg-[#4E3629] text-white rounded-lg flex items-center gap-2 text-xs font-bold"><FileDown size={16}/> EXPORT PDF</button>
            </div>
            <div className="overflow-x-auto" id="logs-table">
              <table className="w-full bg-white/10 rounded-xl overflow-hidden shadow-inner">
                <thead className={tableHeader}><tr className="text-[10px] uppercase tracking-tighter"><th className="p-3">Type</th><th className="p-3">Date</th><th className="p-3">Product</th><th className="p-3">Result</th></tr></thead>
                <tbody>
                  {currentLogs.map(log => (
                    <tr key={log.id} className={tableRow}>
                      <td className="p-3"><span className={`text-[9px] font-black ${log.type === 'distillation' ? 'bg-[#8A2A2B]' : 'bg-[#4E3629]'} text-white px-2 py-0.5 rounded-full`}>{log.type.toUpperCase()}</span></td>
                      <td className="p-3 text-xs">{new Date(log.date).toLocaleDateString()}</td>
                      <td className="p-3 font-bold text-sm">{log.recipeName || log.product}</td>
                      <td className="p-3 text-sm">{log.distillateAmount || log.bottledAmount} {log.type === 'distillation' ? 'L' : 'U'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-6">
              <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 disabled:opacity-20"><ChevronLeft size={20}/></button>
              <span className="text-xs font-black uppercase tracking-widest text-[#8A2A2B]">Page {currentPage} / {Math.ceil(combinedLogs.length / itemsPerPage) || 1}</span>
              <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(combinedLogs.length/itemsPerPage), p+1))} disabled={currentPage >= Math.ceil(combinedLogs.length/itemsPerPage)} className="p-2 disabled:opacity-20"><ChevronRight size={20}/></button>
            </div>
          </div>
        )}
      </main>

      {showNotificationModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-[#F4EFEA] p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border-t-8 border-[#8A2A2B]">
            <p className="text-lg font-black text-[#4E3629] mb-6">{notificationMessage}</p>
            <button onClick={() => setShowNotificationModal(false)} className={button + " w-full"}>DISMISS</button>
          </div>
        </div>
      )}
    </div>
  );
}
