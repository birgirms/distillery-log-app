import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, addDoc, onSnapshot, collection, query, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { Archive, FlaskConical, GlassWater, Home, Plus, Trash2, Mic, MicOff, LoaderCircle, List, ChevronLeft, ChevronRight, FileDown, Pencil, X, LogIn, LogOut } from 'lucide-react';

// Tailwind CSS classes
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
const activePageButton = "bg-[#8A2A2B] text-[#F4EFEA]";

// Firebase configuration using your specific keys
const firebaseConfig = {
  apiKey: "AIzaSyDy1IrRpMwUIAWz1YdwWGgeqEFQpcjZK",
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

  const ADMIN_EMAIL = "your.admin.email@example.com"; // UPDATE THIS TO YOUR EMAIL

  const [inventoryForm, setInventoryForm] = useState({
    name: '', type: 'ingredient', quantity: '', unit: '', lowStockThreshold: '', leadTimeDays: ''
  });

  const [distillationForm, setDistillationForm] = useState({
    date: new Date().toISOString().slice(0, 16), recipeName: '', distillationStart: '', 
    powerLevel: '', headsCollectionStart: '', heartsCollectionStart: '', heartsCollectionStop: '',
    tailsDuration: '', distillateAmount: '', distillateABV: '', notes: '',
    lowerPlateOn: false, upperPlateOn: false, dephlegmatorOn: false,
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
      const paths = ['inventory', 'recipes', 'distillationLogs', 'bottlingLogs'];
      const unsubscribers = paths.map(path => {
        return onSnapshot(collection(db, 'artifacts', 'distillation-app', 'users', user.uid, path), (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          if (path === 'inventory') setInventory(data);
          if (path === 'recipes') setRecipes(data);
          if (path === 'distillationLogs') setDistillationLogs(data.map(d => ({ ...d, type: 'distillation' })));
          if (path === 'bottlingLogs') setBottlingLogs(data.map(d => ({ ...d, type: 'bottling' })));
        });
      });
      return () => unsubscribers.forEach(unsub => unsub());
    }
  }, [user]);

  // Combined Logs Sorting
  useEffect(() => {
    const combined = [...distillationLogs, ...bottlingLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
    setCombinedLogs(combined);
  }, [distillationLogs, bottlingLogs]);

  // Auth Handlers
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (ADMIN_EMAIL && result.user.email !== ADMIN_EMAIL) {
        await signOut(auth);
        setAuthError("Access Denied: Admin only.");
      }
    } catch (err) {
      setAuthError("Login failed.");
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
    await deleteDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'inventory', id));
    showNotification("Item Deleted Permanently");
  };

  // PDF Export
  const exportPDF = () => {
    const element = document.getElementById('logs-table');
    if (window.html2pdf) {
      window.html2pdf().from(element).save('distillery_logs.pdf');
    } else {
      showNotification("PDF Library Loading...");
    }
  };

  if (!isAuthReady) return <div className={tailwind}><LoaderCircle className="animate-spin mt-20" size={48} /></div>;

  if (!user) {
    return (
      <div className={tailwind}>
        <div className={card + " text-center mt-20"}>
          <h2 className="text-2xl font-bold mb-6">Distillery App Login</h2>
          <button onClick={handleLogin} className={button + " w-full flex items-center justify-center gap-2"}>
            <LogIn size={20} /> Sign in with Google
          </button>
          {authError && <p className="text-red-600 mt-4 text-sm">{authError}</p>}
        </div>
      </div>
    );
  }

  const currentLogs = combinedLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className={tailwind}>
      <header className="w-full max-w-4xl mb-8 flex flex-col gap-4">
        <div className="flex justify-between items-center bg-[#E0D8D0] p-4 rounded-2xl shadow-md">
          <span className="font-bold text-[#8A2A2B]">Logged in as: {user.email}</span>
          <button onClick={handleLogout} className="text-red-800 hover:underline flex items-center gap-1 text-sm font-bold">
            <LogOut size={16} /> Logout
          </button>
        </div>
        <nav className="flex bg-[#E0D8D0] rounded-2xl p-2 shadow-xl overflow-x-auto gap-1">
          <button onClick={() => setView('dashboard')} className={`${tabButton} ${view === 'dashboard' ? activeTab : inactiveTab}`}><Home size={18} className="mr-1"/>Home</button>
          <button onClick={() => setView('distillation')} className={`${tabButton} ${view === 'distillation' ? activeTab : inactiveTab}`}><FlaskConical size={18} className="mr-1"/>Logs</button>
          <button onClick={() => setView('inventory')} className={`${tabButton} ${view === 'inventory' ? activeTab : inactiveTab}`}><Archive size={18} className="mr-1"/>Stock</button>
          <button onClick={() => setView('logHistory')} className={`${tabButton} ${view === 'logHistory' ? activeTab : inactiveTab}`}><List size={18} className="mr-1"/>History</button>
        </nav>
      </header>

      <main className="w-full max-w-4xl">
        {view === 'dashboard' && (
          <div className={card}>
            <h1 className="text-3xl font-black mb-4 text-[#8A2A2B] text-center">Dashboard</h1>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-[#8A2A2B] p-4 rounded-xl text-white text-center">
                <p className="text-2xl font-bold">{inventory.length}</p>
                <p className="text-xs uppercase">Stock Items</p>
              </div>
              <div className="bg-[#8A2A2B] p-4 rounded-xl text-white text-center">
                <p className="text-2xl font-bold">{distillationLogs.length}</p>
                <p className="text-xs uppercase">Total Runs</p>
              </div>
            </div>
            {inventory.some(i => i.quantity <= i.lowStockThreshold) && (
              <div className={notificationBox}>
                <h3 className="font-bold mb-2">Stock Alerts:</h3>
                {inventory.filter(i => i.quantity <= i.lowStockThreshold).map(i => (
                  <div key={i.id} className="text-sm">⚠️ {i.name} is low: {i.quantity} {i.unit} left.</div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'inventory' && (
          <div className={card}>
            <h2 className="text-2xl font-bold mb-6 flex items-center text-[#8A2A2B] gap-2"><Archive /> Stock Management</h2>
            <div className="overflow-x-auto mb-8 bg-white/30 rounded-xl p-2 shadow-inner">
              <table className="w-full">
                <thead><tr className={tableHeader}><th className="p-3">Item</th><th className="p-3">Stock</th><th className="p-3 text-center">Actions</th></tr></thead>
                <tbody>
                  {inventory.map(item => (
                    <tr key={item.id} className={tableRow}>
                      <td className="p-3 font-medium">{item.name}</td>
                      <td className={`p-3 font-bold ${item.quantity <= item.lowStockThreshold ? 'text-red-700' : ''}`}>{item.quantity} {item.unit}</td>
                      <td className="p-3 flex justify-center gap-2">
                        <button onClick={() => {setEditingInventoryId(item.id); setInventoryForm(item);}} className="p-2 text-blue-700 hover:bg-blue-100 rounded-lg"><Pencil size={18}/></button>
                        <button onClick={() => deleteInventoryItem(item.id)} className="p-2 text-red-700 hover:bg-red-100 rounded-lg"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <form onSubmit={handleInventorySubmit} className="bg-[#C8C2BA] p-6 rounded-2xl border-2 border-[#8A2A2B]/20 space-y-4">
              <h3 className="font-bold text-[#8A2A2B]">{editingInventoryId ? "Update Item" : "Add New Item"}</h3>
              <input type="text" placeholder="Item Name" value={inventoryForm.name} onChange={e => setInventoryForm({...inventoryForm, name: e.target.value})} className={inputField} required />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Quantity" value={inventoryForm.quantity} onChange={e => setInventoryForm({...inventoryForm, quantity: e.target.value})} className={inputField} required />
                <input type="text" placeholder="Unit (kg, L)" value={inventoryForm.unit} onChange={e => setInventoryForm({...inventoryForm, unit: e.target.value})} className={inputField} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Alert at..." value={inventoryForm.lowStockThreshold} onChange={e => setInventoryForm({...inventoryForm, lowStockThreshold: e.target.value})} className={inputField} required />
                <input type="number" placeholder="Lead Days" value={inventoryForm.leadTimeDays} onChange={e => setInventoryForm({...inventoryForm, leadTimeDays: e.target.value})} className={inputField} required />
              </div>
              <div className="flex gap-2">
                <button type="submit" className={button + " flex-1"}>{editingInventoryId ? "Save Changes" : "Add to Stock"}</button>
                {editingInventoryId && <button type="button" onClick={() => {setEditingInventoryId(null); setInventoryForm({name:'', type:'ingredient', quantity:'', unit:'', lowStockThreshold:'', leadTimeDays:''});}} className="bg-gray-500 text-white p-3 rounded-xl"><X /></button>}
              </div>
            </form>
          </div>
        )}

        {view === 'logHistory' && (
          <div className={card}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#8A2A2B]">Run History</h2>
              <button onClick={exportPDF} className="p-2 bg-[#4E3629] text-white rounded-lg flex items-center gap-2 text-sm"><FileDown size={18}/> Export PDF</button>
            </div>
            <div className="overflow-x-auto" id="logs-table">
              <table className="w-full bg-white/20 rounded-xl overflow-hidden">
                <thead className={tableHeader}><tr className="text-xs uppercase opacity-70"><th className="p-3">Type</th><th className="p-3">Date</th><th className="p-3">Product</th><th className="p-3">Result</th></tr></thead>
                <tbody>
                  {currentLogs.map(log => (
                    <tr key={log.id} className={tableRow}>
                      <td className="p-3"><span className="text-[10px] font-bold bg-[#8A2A2B] text-white px-2 py-0.5 rounded-full">{log.type}</span></td>
                      <td className="p-3">{new Date(log.date).toLocaleDateString()}</td>
                      <td className="p-3 font-bold">{log.recipeName || log.product}</td>
                      <td className="p-3">{log.distillateAmount || log.bottledAmount} {log.type === 'distillation' ? 'L' : 'Units'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between mt-4">
              <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 opacity-50"><ChevronLeft/></button>
              <span className="text-sm font-bold">Page {currentPage} of {Math.ceil(combinedLogs.length / itemsPerPage)}</span>
              <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(combinedLogs.length/itemsPerPage), p+1))} disabled={currentPage >= Math.ceil(combinedLogs.length/itemsPerPage)} className="p-2 opacity-50"><ChevronRight/></button>
            </div>
          </div>
        )}
      </main>

      {showNotificationModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[#F4EFEA] p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border-t-8 border-[#8A2A2B]">
            <p className="text-lg font-bold mb-6">{notificationMessage}</p>
            <button onClick={() => setShowNotificationModal(false)} className={button + " w-full"}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
