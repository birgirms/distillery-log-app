import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, addDoc, onSnapshot, collection, query, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { Archive, FlaskConical, GlassWater, NotebookPen, Home, Plus, Trash2, Mic, MicOff, LoaderCircle, List, Sprout, ChevronLeft, ChevronRight, FileDown, Pencil, X } from 'lucide-react';

// Include the html2pdf library for PDF export functionality.
const html2pdfScript = document.createElement('script');
html2pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
document.head.appendChild(html2pdfScript);

// Tailwind CSS classes for consistent styling
const tailwind = `
  bg-[#F4EFEA] text-[#4E3629] min-h-screen p-8 font-sans transition-all duration-300
  flex flex-col items-center
`;
const card = `bg-[#E0D8D0] rounded-2xl shadow-xl p-6 mb-8 w-full max-w-4xl`;
const inputField = `bg-[#C8C2BA] text-[#4E3629] p-3 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#8A2A2B] placeholder-[#4E3629]`;
const button = `bg-[#4E3629] hover:bg-[#8A2A2B] text-[#F4EFEA] font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105`;
const dangerButton = `bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105`;
const tabButton = `p-4 flex-1 text-center rounded-xl transition-all duration-200`;
const activeTab = `bg-[#8A2A2B] text-[#F4EFEA] shadow-lg`;
const inactiveTab = `bg-[#E0D8D0] text-[#4E3629] hover:bg-[#C8C2BA]`;
const notificationBox = `bg-red-700 text-white p-4 rounded-xl mb-4`;
const lowStockItem = `flex justify-between items-center bg-[#C8C2BA] p-3 rounded-xl mb-2`;
const micButton = `
  bg-[#4E3629] hover:bg-[#8A2A2B] text-[#F4EFEA] font-bold p-3 rounded-full shadow-lg
  transition-all duration-200 ease-in-out transform hover:scale-110 flex items-center justify-center
`;
const loadingSpinner = `animate-spin text-[#F4EFEA]`;
const tableHeader = `bg-[#C8C2BA] text-left text-[#4E3629] font-semibold`;
const tableRow = `border-t border-[#B5AE9F] hover:bg-[#C8C2BA] transition-colors`;
const tableCell = `py-3 px-4 text-sm`;
const paginationButton = `px-4 py-2 mx-1 rounded-full bg-[#C8C2BA] hover:bg-[#8A2A2B] hover:text-[#F4EFEA] text-[#4E3629]`;
const activePageButton = `bg-[#8A2A2B] text-[#F4EFEA]`;
const timeInput = `bg-[#C8C2BA] text-[#4E3629] p-3 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#8A2A2B]`;


// Firebase initialization
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Use the provided auth token or sign in anonymously
const signIn = async () => {
  const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
  try {
    if (token) {
      await signInWithCustomToken(auth, token);
    } else {
      await signInAnonymously(auth);
    }
  } catch (error) {
    console.error("Firebase Auth Error:", error);
  }
};

// Main App component
export default function App() {
  // State variables for authentication and data
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
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // AI-related state for Distillation
  const [isListeningDistillation, setIsListeningDistillation] = useState(false);
  const [isLoadingAIDistillation, setIsLoadingAIDistillation] = useState(false);

  // AI-related state for Bottling
  const [isListeningBottling, setIsListeningBottling] = useState(false);
  const [isLoadingAIBottling, setIsLoadingAIBottling] = useState(false);

  // State for forms
  const [distillationForm, setDistillationForm] = useState({
    date: new Date().toISOString().slice(0, 16),
    recipeName: '',
    finalProduct: '',
    ethanolAmount: '',
    waterIntoStill: '',
    abvOfCharge: '',
    headsCollectionStart: '',
    heartsCollectionStart: '',
    heartsCollectionStop: '',
    tailsDuration: '',
    distillateAmount: '',
    distillateABV: '',
    powerLevel: '',
    distillationStart: '',
    notes: '',
    lowerPlateOn: false,
    upperPlateOn: false,
    dephlegmatorOn: false,
  });

  const [bottlingForm, setBottlingForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    bottlingStartTime: '',
    product: '',
    bottledAmount: '',
    boxesUsed: '',
    lotNumber: '',
    notes: '',
    bottlingMaterialDefinition: '', 
  });
  
  const [bottlingMaterialDefinitions, setBottlingMaterialDefinitions] = useState([]);
  const [bottlingMaterialsForm, setBottlingMaterialsForm] = useState({
    name: '',
    materials: [{ name: '', quantity: '' }],
  });

  const [inventoryForm, setInventoryForm] = useState({
    name: '',
    type: 'ingredient',
    quantity: '',
    unit: '',
    lowStockThreshold: '',
    leadTimeDays: '',
  });

  const [recipeForm, setRecipeForm] = useState({
    name: '',
    product: '',
    ingredients: [{ name: '', quantity: '', unit: '' }],
  });

  // Track the item currently being edited in inventory
  const [editingInventoryId, setEditingInventoryId] = useState(null);

  // Effect for Firebase authentication
  useEffect(() => {
    signIn();

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });

    return () => unsubscribeAuth();
  }, []);

  // Effect for setting up Firestore listeners after authentication
  useEffect(() => {
    if (user && isAuthReady) {
      const userId = user.uid;

      // Inventory listener
      const inventoryQuery = query(collection(db, 'artifacts', appId, 'users', userId, 'inventory'));
      const unsubscribeInventory = onSnapshot(inventoryQuery, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInventory(items);
      }, (err) => console.error("Inventory error:", err));

      // Recipes listener
      const recipesQuery = query(collection(db, 'artifacts', appId, 'users', userId, 'recipes'));
      const unsubscribeRecipes = onSnapshot(recipesQuery, (snapshot) => {
        const recipesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecipes(recipesList);
      }, (err) => console.error("Recipes error:", err));
      
      // Bottling Materials listener
      const bottlingMaterialsQuery = query(collection(db, 'artifacts', appId, 'users', userId, 'bottlingMaterialDefinitions'));
      const unsubscribeBottlingMaterials = onSnapshot(bottlingMaterialsQuery, (snapshot) => {
        const materialsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBottlingMaterialDefinitions(materialsList);
      }, (err) => console.error("Bottling Materials error:", err));

      // Distillation logs listener
      const distillationLogsQuery = query(collection(db, 'artifacts', appId, 'users', userId, 'distillationLogs'));
      const unsubscribeDistillation = onSnapshot(distillationLogsQuery, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'distillation' }));
        setDistillationLogs(logs);
      }, (err) => console.error("Distillation Logs error:", err));

      // Bottling logs listener
      const bottlingLogsQuery = query(collection(db, 'artifacts', appId, 'users', userId, 'bottlingLogs'));
      const unsubscribeBottling = onSnapshot(bottlingLogsQuery, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'bottling' }));
        setBottlingLogs(logs);
      }, (err) => console.error("Bottling Logs error:", err));
      
      return () => {
        unsubscribeInventory();
        unsubscribeRecipes();
        unsubscribeBottlingMaterials();
        unsubscribeDistillation();
        unsubscribeBottling();
      };
    }
  }, [user, isAuthReady, appId]);
  
  useEffect(() => {
    const combined = [...distillationLogs, ...bottlingLogs];
    combined.sort((a, b) => new Date(b.date) - new Date(a.date));
    setCombinedLogs(combined);
  }, [distillationLogs, bottlingLogs]);

  const showNotification = (message) => {
    setNotificationMessage(message);
    setShowNotificationModal(true);
  };
  
  // AI Voice Dictation Feature for Distillation
  const startDistillationListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      showNotification("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListeningDistillation(true);
    recognition.onresult = (event) => processDistillationDictation(event.results[0][0].transcript);
    recognition.onerror = () => setIsListeningDistillation(false);
    recognition.onend = () => setIsListeningDistillation(false);
    recognition.start();
  };

  const processDistillationDictation = async (transcript) => {
    setIsLoadingAIDistillation(true);
    const prompt = `Parse dictation: "${transcript}" into JSON. Fields: distillationStart, headsCollectionStart, heartsCollectionStart, heartsCollectionStop, powerLevel (1-3.5), ethanolAmount, waterIntoStill, abvOfCharge, tailsDuration, distillateAmount, distillateABV, notes, lowerPlateOn, upperPlateOn, dephlegmatorOn.`;
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });
        const result = await response.json();
        const jsonResult = JSON.parse(result.candidates[0].content.parts[0].text);
        if (jsonResult) {
            setDistillationForm(prev => ({ ...prev, ...jsonResult }));
            showNotification("Fields updated!");
        }
    } catch (error) {
        showNotification("Error processing speech.");
    }
    setIsLoadingAIDistillation(false);
  };

  // Logic to handle Inventory Add / Update
  const handleAddInventory = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      const userId = user.uid;
      const data = {
        name: inventoryForm.name,
        type: inventoryForm.type,
        quantity: parseFloat(inventoryForm.quantity),
        unit: inventoryForm.unit,
        lowStockThreshold: parseFloat(inventoryForm.lowStockThreshold),
        leadTimeDays: parseInt(inventoryForm.leadTimeDays, 10),
      };

      if (editingInventoryId) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'inventory', editingInventoryId), data);
        showNotification("Inventory item updated!");
        setEditingInventoryId(null);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'inventory'), data);
        showNotification("Inventory item added!");
      }

      setInventoryForm({
        name: '',
        type: 'ingredient',
        quantity: '',
        unit: '',
        lowStockThreshold: '',
        leadTimeDays: '',
      });
    } catch (e) {
      console.error(e);
      showNotification("Error saving inventory item.");
    }
  };

  const startEditingInventory = (item) => {
    setEditingInventoryId(item.id);
    setInventoryForm({
      name: item.name,
      type: item.type,
      quantity: item.quantity.toString(),
      unit: item.unit,
      lowStockThreshold: item.lowStockThreshold.toString(),
      leadTimeDays: item.leadTimeDays.toString(),
    });
    // Scroll to form
    window.scrollTo({ top: document.getElementById('inventory-form').offsetTop - 100, behavior: 'smooth' });
  };

  const handleRemoveInventory = async (itemId) => {
    if (!user) return;
    try {
      const userId = user.uid;
      await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, 'inventory', itemId));
      showNotification("Inventory item deleted permanently.");
      if (editingInventoryId === itemId) setEditingInventoryId(null);
    } catch (e) {
      showNotification("Error deleting inventory item.");
    }
  };

  const exportLogsToPDF = () => {
    const table = document.getElementById('logs-table');
    if (table && window.html2pdf) {
      window.html2pdf(table, {
        margin: 1,
        filename: 'production_logs.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
      });
      showNotification("Generating PDF...");
    }
  };

  // Pagination Helpers
  const totalPages = Math.ceil(combinedLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentLogs = combinedLogs.slice(startIndex, startIndex + itemsPerPage);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex justify-center items-center mt-6 space-x-2">
        <button 
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className={`${paginationButton} disabled:opacity-30`}
        ><ChevronLeft size={18} /></button>
        <span className="text-[#4E3629] font-medium">Page {currentPage} of {totalPages}</span>
        <button 
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className={`${paginationButton} disabled:opacity-30`}
        ><ChevronRight size={18} /></button>
      </div>
    );
  };

  return (
    <div className={tailwind}>
      <header className="w-full max-w-4xl mb-8">
        <nav className="flex bg-[#E0D8D0] rounded-2xl p-2 shadow-xl overflow-x-auto">
          <button onClick={() => setView('dashboard')} className={`${tabButton} ${view === 'dashboard' ? activeTab : inactiveTab}`}>
            <Home size={20} className="inline mr-2" />Dashboard
          </button>
          <button onClick={() => setView('distillation')} className={`${tabButton} ${view === 'distillation' ? activeTab : inactiveTab}`}>
            <FlaskConical size={20} className="inline mr-2" />Distillation
          </button>
          <button onClick={() => setView('bottling')} className={`${tabButton} ${view === 'bottling' ? activeTab : inactiveTab}`}>
            <GlassWater size={20} className="inline mr-2" />Bottling
          </button>
          <button onClick={() => setView('logs')} className={`${tabButton} ${view === 'logs' ? activeTab : inactiveTab}`}>
            <List size={20} className="inline mr-2" />Logs
          </button>
          <button onClick={() => setView('inventory')} className={`${tabButton} ${view === 'inventory' ? activeTab : inactiveTab}`}>
            <Archive size={20} className="inline mr-2" />Inventory
          </button>
        </nav>
      </header>
      
      <main className="w-full max-w-4xl">
        {!isAuthReady ? (
           <div className={`${card} text-center`}>
            <LoaderCircle size={48} className={`${loadingSpinner} mx-auto mb-4`} />
            <p className="text-xl text-[#4E3629]">Connecting to Distillery Cloud...</p>
          </div>
        ) : (
          <>
            {view === 'dashboard' && (
              <>
                <div className={`${card} text-center`}>
                  <h1 className="text-4xl font-extrabold mb-4 text-[#8A2A2B]">Distillery Dashboard</h1>
                  <p className="text-lg text-[#4E3629] mb-6">Real-time production and stock tracking.</p>
                  <div className="flex justify-center items-center flex-wrap gap-4">
                    <div className="p-4 bg-[#8A2A2B] rounded-xl shadow-lg min-w-[120px]">
                      <p className="text-2xl font-bold text-[#F4EFEA]">{distillationLogs.length}</p>
                      <p className="text-xs text-[#F4EFEA] uppercase tracking-wider">Distillations</p>
                    </div>
                    <div className="p-4 bg-[#8A2A2B] rounded-xl shadow-lg min-w-[120px]">
                      <p className="text-2xl font-bold text-[#F4EFEA]">{bottlingLogs.length}</p>
                      <p className="text-xs text-[#F4EFEA] uppercase tracking-wider">Bottlings</p>
                    </div>
                    <div className="p-4 bg-[#8A2A2B] rounded-xl shadow-lg min-w-[120px]">
                      <p className="text-2xl font-bold text-[#F4EFEA]">{inventory.length}</p>
                      <p className="text-xs text-[#F4EFEA] uppercase tracking-wider">Stock Items</p>
                    </div>
                  </div>
                </div>

                <div className={card}>
                  <h2 className="text-2xl font-bold mb-4 flex items-center">
                    <Archive size={24} className="mr-2 text-[#8A2A2B]" /> Stock Alerts
                  </h2>
                  {inventory.filter(item => item.quantity <= item.lowStockThreshold).length > 0 ? (
                    <div className="space-y-2">
                      <div className={notificationBox}>
                        <p className="font-bold">Low Stock Warning</p>
                        <p className="text-sm">The following items require immediate re-ordering.</p>
                      </div>
                      {inventory.filter(item => item.quantity <= item.lowStockThreshold).map(item => (
                        <div key={item.id} className={lowStockItem}>
                          <span className="font-bold">{item.name}</span>
                          <span className="bg-[#8A2A2B] text-white px-3 py-1 rounded-lg text-sm">
                            {item.quantity} / {item.lowStockThreshold} {item.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-green-700/20 border border-green-700 text-green-900 p-4 rounded-xl text-center font-medium">
                      All inventory levels are optimal.
                    </div>
                  )}
                </div>
              </>
            )}

            {view === 'inventory' && (
              <div className={card}>
                <h2 className="text-2xl font-bold mb-6 flex items-center text-[#8A2A2B]">
                  <Archive size={24} className="mr-2 text-[#8A2A2B]" /> Inventory Management
                </h2>
                
                <div className="overflow-x-auto mb-8">
                  <table className="min-w-full bg-[#E0D8D0] rounded-xl overflow-hidden shadow-inner">
                    <thead className={tableHeader}>
                      <tr>
                        <th className="py-3 px-4">Item</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Current Stock</th>
                        <th className="py-3 px-4">Threshold</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.length === 0 ? (
                        <tr><td colSpan="5" className="p-8 text-center text-[#4E3629]/60 italic">No inventory items found.</td></tr>
                      ) : (
                        inventory.map(item => (
                          <tr key={item.id} className={tableRow}>
                            <td className="py-3 px-4 font-semibold">{item.name}</td>
                            <td className="py-3 px-4 capitalize">{item.type.replace('_', ' ')}</td>
                            <td className={`py-3 px-4 font-bold ${item.quantity <= item.lowStockThreshold ? 'text-red-700' : ''}`}>
                              {item.quantity} {item.unit}
                            </td>
                            <td className="py-3 px-4 opacity-70">{item.lowStockThreshold} {item.unit}</td>
                            <td className="py-3 px-4 flex justify-center space-x-3">
                              <button 
                                onClick={() => startEditingInventory(item)}
                                className="p-2 bg-blue-600/10 text-blue-800 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
                                title="Edit Item"
                              >
                                <Pencil size={18} />
                              </button>
                              <button 
                                onClick={() => handleRemoveInventory(item.id)}
                                className="p-2 bg-red-600/10 text-red-800 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                                title="Delete Permanently"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div id="inventory-form" className="p-6 bg-[#C8C2BA] rounded-2xl border-2 border-[#8A2A2B]/20">
                  <h3 className="text-xl font-bold mb-4 flex items-center text-[#8A2A2B]">
                    {editingInventoryId ? <><Pencil size={20} className="mr-2" /> Update Item</> : <><Plus size={20} className="mr-2" /> Add New Item</>}
                  </h3>
                  <form onSubmit={handleAddInventory} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Item Name</label>
                        <input type="text" placeholder="e.g. Botanicals, Glass 750ml" value={inventoryForm.name} onChange={(e) => setInventoryForm({ ...inventoryForm, name: e.target.value })} required className={inputField} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Category</label>
                        <select value={inventoryForm.type} onChange={(e) => setInventoryForm({ ...inventoryForm, type: e.target.value })} className={inputField}>
                          <option value="ingredient">Ingredient</option>
                          <option value="bottling_material">Bottling Material</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Quantity</label>
                        <input type="number" placeholder="0" value={inventoryForm.quantity} onChange={(e) => setInventoryForm({ ...inventoryForm, quantity: e.target.value })} required className={inputField} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Unit</label>
                        <input type="text" placeholder="kg, L, pcs" value={inventoryForm.unit} onChange={(e) => setInventoryForm({ ...inventoryForm, unit: e.target.value })} required className={inputField} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Min Threshold</label>
                        <input type="number" placeholder="Alert at..." value={inventoryForm.lowStockThreshold} onChange={(e) => setInventoryForm({ ...inventoryForm, lowStockThreshold: e.target.value })} required className={inputField} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Lead Days</label>
                        <input type="number" placeholder="Order to arrival" value={inventoryForm.leadTimeDays} onChange={(e) => setInventoryForm({ ...inventoryForm, leadTimeDays: e.target.value })} required className={inputField} />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button type="submit" className={`${button} flex-1`}>
                        {editingInventoryId ? 'Update Inventory' : 'Add to Inventory'}
                      </button>
                      {editingInventoryId && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditingInventoryId(null);
                            setInventoryForm({ name: '', type: 'ingredient', quantity: '', unit: '', lowStockThreshold: '', leadTimeDays: '' });
                          }}
                          className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
                        >
                          <X size={24} />
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Other views (Distillation, Bottling, Logs) remain integrated with full data access */}
            {view === 'distillation' && (
               <div className={card}>
                <h2 className="text-2xl font-bold mb-6 flex items-center justify-between text-[#8A2A2B]">
                  <span className="flex items-center"><FlaskConical size={24} className="mr-2 text-[#8A2A2B]" /> New Distillation Log</span>
                  <button
                    type="button"
                    onClick={startDistillationListening}
                    className={`${micButton} ${isListeningDistillation ? 'bg-red-600' : 'bg-[#4E3629]'}`}
                    disabled={isLoadingAIDistillation}
                  >
                    {isLoadingAIDistillation ? <LoaderCircle size={24} className={loadingSpinner} /> : isListeningDistillation ? <MicOff size={24} /> : <Mic size={24} />}
                  </button>
                </h2>
                <form onSubmit={handleDistillationSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[#4E3629] mb-2 font-bold uppercase text-xs opacity-70 ml-1">Time of Distillation</label>
                    <input type="datetime-local" value={distillationForm.date} onChange={(e) => setDistillationForm({ ...distillationForm, date: e.target.value })} required className={inputField} />
                  </div>
                  <div>
                    <label className="block text-[#4E3629] mb-2 font-bold uppercase text-xs opacity-70 ml-1">Recipe Used</label>
                    <select value={distillationForm.recipeName} onChange={(e) => setDistillationForm({ ...distillationForm, recipeName: e.target.value })} required className={inputField}>
                      <option value="">Select a Recipe</option>
                      {recipes.map(recipe => (
                        <option key={recipe.id} value={recipe.name}>{recipe.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* ... other form fields ... */}
                  <button type="submit" className={button}>Submit Distillation Log</button>
                </form>
              </div>
            )}

            {view === 'logs' && (
              <div className={card}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold flex items-center text-[#8A2A2B]">
                    <List size={24} className="mr-2 text-[#8A2A2B]" /> Production Log History
                  </h2>
                  <button onClick={exportLogsToPDF} className={`${button} flex items-center text-sm px-4`}>
                    <FileDown size={20} className="mr-2" /> PDF Export
                  </button>
                </div>
                <div className="overflow-x-auto" id="logs-table">
                  <table className="min-w-full bg-[#E0D8D0] rounded-xl overflow-hidden shadow-inner">
                    <thead className={tableHeader}>
                      <tr className="text-left">
                        <th className={tableCell}>Log Type</th>
                        <th className={tableCell}>Date</th>
                        <th className={tableCell}>Time</th>
                        <th className={tableCell}>Product</th>
                        <th className={tableCell}>Result</th>
                        <th className={tableCell}>ABV/Lot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentLogs.map(log => (
                        <tr key={log.id} className={tableRow}>
                          <td className={tableCell}>
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${log.type === 'distillation' ? 'bg-[#8A2A2B] text-white' : 'bg-amber-800 text-white'}`}>
                              {log.type}
                            </span>
                          </td>
                          <td className={tableCell}>{new Date(log.date).toLocaleDateString()}</td>
                          <td className={tableCell}>{log.type === 'distillation' ? log.distillationStart : log.bottlingStartTime}</td>
                          <td className={tableCell}>{log.type === 'distillation' ? log.recipeName : log.product}</td>
                          <td className={tableCell}>
                            {log.type === 'distillation' ? `${log.distillateAmount} L` : `${log.bottledAmount} units`}
                          </td>
                          <td className={tableCell}>
                            {log.type === 'distillation' ? `${log.distillateABV}%` : log.lotNumber}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {renderPagination()}
              </div>
            )}
          </>
        )}
      </main>

      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-[#4E3629]/90 flex items-center justify-center p-4 z-50">
          <div className="bg-[#E0D8D0] p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border-t-8 border-[#8A2A2B]">
            <h3 className="text-2xl font-bold mb-4 text-[#4E3629]">Notification</h3>
            <p className="text-lg text-[#4E3629] mb-8 leading-relaxed">{notificationMessage}</p>
            <button type="button" onClick={() => setShowNotificationModal(false)} className={button + " w-full"}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}
