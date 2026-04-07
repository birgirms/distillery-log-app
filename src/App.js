import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, addDoc, onSnapshot, collection, query, updateDoc, deleteDoc } from 'firebase/firestore';
import { Archive, FlaskConical, GlassWater, NotebookPen, Home, Plus, Trash2, LoaderCircle, List, ChevronLeft, ChevronRight, FileDown, Pencil, X, LogIn, LogOut, ChevronDown, ChevronUp, Database, TrendingUp, DollarSign, Droplet } from 'lucide-react';

// Tailwind CSS classes for consistent UI
const tailwind = "bg-[#F4EFEA] text-[#4E3629] min-h-screen p-8 font-sans transition-all duration-300 flex flex-col items-center";
const card = "bg-[#E0D8D0] rounded-2xl shadow-xl p-6 mb-8 w-full max-w-4xl";
const inputField = "bg-[#C8C2BA] text-[#4E3629] p-3 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#8A2A2B] placeholder-[#4E3629]";
const button = "bg-[#4E3629] hover:bg-[#8A2A2B] text-[#F4EFEA] font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105";
const tabButton = "p-4 flex-1 text-center rounded-xl transition-all duration-200 flex items-center justify-center font-bold text-sm";
const activeTab = "bg-[#8A2A2B] text-[#F4EFEA] shadow-lg";
const inactiveTab = "bg-[#E0D8D0] text-[#4E3629] hover:bg-[#C8C2BA]";
const notificationBox = "bg-red-700 text-white p-4 rounded-xl mb-4 shadow-lg";
const lowStockItem = "flex justify-between items-center bg-[#C8C2BA] p-3 rounded-xl mb-2 font-semibold";
const tableHeader = "bg-[#C8C2BA] text-left text-[#4E3629] font-bold";
const tableRow = "border-t border-[#B5AE9F] hover:bg-[#C8C2BA]/60 transition-colors";
const tableCell = "py-3 px-4 text-sm";
const paginationButton = "px-4 py-2 mx-1 rounded-full bg-[#C8C2BA] hover:bg-[#8A2A2B] hover:text-[#F4EFEA] text-[#4E3629] transition-colors";

// Custom TimePicker Component (24-hour dropdown)
const TimePicker = ({ value, onChange, required }) => {
  const [hour, min] = value ? value.split(":") : ["", ""];
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  return (
    <div className="flex items-center space-x-2">
      <select
        value={hour}
        onChange={(e) => onChange(`${e.target.value}:${min || '00'}`)}
        className="bg-[#C8C2BA] text-[#4E3629] p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8A2A2B] font-semibold flex-1 cursor-pointer"
        required={required}
      >
        <option value="" disabled hidden>HH</option>
        {hours.map((h) => (<option key={h} value={h}>{h}</option>))}
      </select>
      <span className="text-[#4E3629] font-bold text-xl pb-1">:</span>
      <select
        value={min}
        onChange={(e) => onChange(`${hour || '00'}:${e.target.value}`)}
        className="bg-[#C8C2BA] text-[#4E3629] p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8A2A2B] font-semibold flex-1 cursor-pointer"
        required={required}
      >
        <option value="" disabled hidden>MM</option>
        {minutes.map((m) => (<option key={m} value={m}>{m}</option>))}
      </select>
    </div>
  );
};

// Firebase configuration with your exact API Key
const firebaseConfig = {
  apiKey: "AIzaSyDy1YrlRPpMwUIAWzlYdwWGgeqEFQpcjZk",
  authDomain: "distillation-app.firebaseapp.com",
  projectId: "distillation-app",
  storageBucket: "distillation-app.firebasestorage.app",
  messagingSenderId: "198528022551",
  appId: "1:198528022551:web:fd830c47cdada01faf4452"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- CURRENCY CONVERSION LOGIC ---
const getCurrencySymbol = (currency) => {
  switch(currency) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'ISK': return 'kr';
    default: return currency;
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [view, setView] = useState('dashboard');
  
  // App Data State
  const [recipes, setRecipes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [barrels, setBarrels] = useState([]);
  const [distillationLogs, setDistillationLogs] = useState([]);
  const [bottlingLogs, setBottlingLogs] = useState([]);
  const [combinedLogs, setCombinedLogs] = useState([]);
  const [bottlingMaterialDefinitions, setBottlingMaterialDefinitions] = useState([]);
  
  // UI State
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [hasCheckedStockAlert, setHasCheckedStockAlert] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState('ISK'); // Global display currency
  const [exchangeRates, setExchangeRates] = useState({ ISK: 1, USD: 140, EUR: 150, GBP: 175 }); // Default fallback rates
  
  const [editingInventoryId, setEditingInventoryId] = useState(null);
  const [editingBarrelId, setEditingBarrelId] = useState(null);
  const [editingLogId, setEditingLogId] = useState(null);
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [authError, setAuthError] = useState("");

  const ADMIN_EMAIL = "birgir@thoran.is"; 

  // --- FORMS STATE ---
  const [inventoryForm, setInventoryForm] = useState({
    name: '', type: 'ingredient', quantity: '', unit: '', lowStockThreshold: '', leadTimeDays: '', costPerUnit: '', currency: 'ISK', currentLot: ''
  });

  const [barrelForm, setBarrelForm] = useState({
    barrelNumber: '', type: '', capacity: '', fillDate: new Date().toISOString().slice(0, 10), contents: 'Gin', currentVolume: '', usageCount: '1'
  });

  const emptyDistillationForm = {
    date: new Date().toISOString().slice(0, 10), recipeName: '', finalProduct: '', ethanolAmount: '',
    waterIntoStill: '', abvOfCharge: '', headsCollectionStart: '', heartsCollectionStart: '', heartsCollectionStop: '',
    tailsDuration: '', distillateAmount: '', distillateABV: '', powerLevel: '', distillationStart: '', notes: '',
    lowerPlateOn: false, upperPlateOn: false, dephlegmatorOn: false,
  };
  const [distillationForm, setDistillationForm] = useState(emptyDistillationForm);

  const emptyBottlingForm = {
    date: new Date().toISOString().slice(0, 10), bottlingStartTime: '', product: '', bottledAmount: '',
    boxesUsed: '', lotNumber: '', notes: '', bottlingMaterialDefinition: '', source: 'tank', barrelId: '', volumeDrawn: ''
  };
  const [bottlingForm, setBottlingForm] = useState(emptyBottlingForm);

  const [recipeForm, setRecipeForm] = useState({
    name: '', product: '', ingredients: [{ name: '', quantity: '', unit: '' }],
  });

  const [bottlingMaterialsForm, setBottlingMaterialsForm] = useState({
    name: '', materials: [{ name: '', quantity: '', unit: '' }],
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [historyFilter, setHistoryFilter] = useState('All');
  const [expandedLogId, setExpandedLogId] = useState(null);

  // --- HELPER FUNCTIONS ---
  const convertCurrency = (amount, fromCurrency, toCurrency) => {
    if (!amount) return 0;
    if (fromCurrency === toCurrency) return parseFloat(amount);
    const amountInISK = parseFloat(amount) * (exchangeRates[fromCurrency] || 1);
    return amountInISK / (exchangeRates[toCurrency] || 1);
  };

  const convertQuantity = (qty, fromUnit, toUnit) => {
    if (!fromUnit || !toUnit) return qty;
    const from = fromUnit.toLowerCase().trim();
    const to = toUnit.toLowerCase().trim();
    if (from === to) return qty;
    if ((from === 'g' || from === 'gr') && to === 'kg') return qty / 1000;
    if (from === 'kg' && (to === 'g' || to === 'gr')) return qty * 1000;
    if (from === 'ml' && to === 'l') return qty / 1000;
    if (from === 'l' && to === 'ml') return qty * 1000;
    return qty; 
  };

  const calculateAge = (dateStr) => {
    if (!dateStr) return '-';
    const days = Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
    if (days < 30) return `${days} days`;
    if (days < 365) return `${Math.floor(days/30)} months`;
    return `${(days/365).toFixed(1)} years`;
  };

  // --- AUTH & DATA LISTENERS ---
  useEffect(() => {
    // Fetch live currency exchange rates
    const fetchRates = async () => {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/ISK');
        const data = await res.json();
        if (data && data.rates) {
          setExchangeRates({
            ISK: 1,
            USD: 1 / data.rates.USD,
            EUR: 1 / data.rates.EUR,
            GBP: 1 / data.rates.GBP
          });
        }
      } catch (err) {
        console.error("Failed to fetch live rates, using fallback.", err);
      }
    };
    fetchRates();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const pId = 'distillation-app';
      const uId = user.uid;

      const unsubInventory = onSnapshot(collection(db, 'artifacts', pId, 'users', uId, 'inventory'), (snapshot) => {
        setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      const unsubBarrels = onSnapshot(collection(db, 'artifacts', pId, 'users', uId, 'barrels'), (snapshot) => {
        setBarrels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      const unsubRecipes = onSnapshot(collection(db, 'artifacts', pId, 'users', uId, 'recipes'), (snapshot) => {
        setRecipes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      const unsubMaterials = onSnapshot(collection(db, 'artifacts', pId, 'users', uId, 'bottlingMaterialDefinitions'), (snapshot) => {
        setBottlingMaterialDefinitions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      const unsubDistLogs = onSnapshot(collection(db, 'artifacts', pId, 'users', uId, 'distillationLogs'), (snapshot) => {
        setDistillationLogs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'distillation' })));
      });
      const unsubBotLogs = onSnapshot(collection(db, 'artifacts', pId, 'users', uId, 'bottlingLogs'), (snapshot) => {
        setBottlingLogs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'bottling' })));
      });

      return () => {
        unsubInventory(); unsubBarrels(); unsubRecipes(); unsubMaterials(); unsubDistLogs(); unsubBotLogs();
      };
    }
  }, [user]);

  useEffect(() => {
    const combined = [...distillationLogs, ...bottlingLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
    setCombinedLogs(combined);
  }, [distillationLogs, bottlingLogs]);

  // --- LOGIN STOCK ALERT MECHANISM ---
  useEffect(() => {
    if (user && isAuthReady && inventory.length > 0 && !hasCheckedStockAlert) {
      const lowStockItems = inventory.filter(item => item.quantity <= item.lowStockThreshold);
      if (lowStockItems.length > 0) {
        setShowLowStockModal(true);
      }
      setHasCheckedStockAlert(true); // Prevents it from popping up repeatedly during the session
    }
  }, [inventory, user, isAuthReady, hasCheckedStockAlert]);

  // --- LOGIN LOGIC ---
  const handleLogin = async () => {
    setAuthError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      if (result.user.email !== ADMIN_EMAIL) {
        await signOut(auth);
        setAuthError(`Access Denied: ${result.user.email} is not authorized.`);
      }
    } catch (err) {
      setAuthError(err.message.includes("closed-by-user") ? "Login window was closed. Please try again." : `Login failed: ${err.code || err.message}`);
    }
  };

  const handleLogout = () => signOut(auth);
  const showNotification = (msg) => { setNotificationMessage(msg); setShowNotificationModal(true); };

  // --- INVENTORY MANAGEMENT ---
  const handleInventorySubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    const data = {
      ...inventoryForm,
      quantity: parseFloat(inventoryForm.quantity) || 0,
      lowStockThreshold: parseFloat(inventoryForm.lowStockThreshold) || 0,
      leadTimeDays: parseInt(inventoryForm.leadTimeDays, 10) || 0,
      costPerUnit: parseFloat(inventoryForm.costPerUnit) || 0,
      currency: inventoryForm.currency || 'ISK'
    };
    try {
      if (editingInventoryId) {
        await updateDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'inventory', editingInventoryId), data);
        showNotification("Item Updated Successfully");
      } else {
        await addDoc(collection(db, 'artifacts', 'distillation-app', 'users', user.uid, 'inventory'), data);
        showNotification("Item Added Successfully");
      }
      setInventoryForm({ name: '', type: 'ingredient', quantity: '', unit: '', lowStockThreshold: '', leadTimeDays: '', costPerUnit: '', currency: 'ISK', currentLot: '' });
      setEditingInventoryId(null);
    } catch (err) { showNotification(`Error saving item: ${err.message}`); }
  };

  const deleteInventoryItem = async (id) => {
    if (!user) return;
    if (window.confirm("Are you sure you want to permanently delete this item?")) {
      await deleteDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'inventory', id));
      showNotification("Item Deleted Permanently");
    }
  };

  // --- BARREL MANAGEMENT ---
  const handleBarrelSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    const data = {
      ...barrelForm,
      capacity: parseFloat(barrelForm.capacity) || 0,
      currentVolume: parseFloat(barrelForm.currentVolume) || 0,
      usageCount: parseInt(barrelForm.usageCount, 10) || 1
    };
    try {
      if (editingBarrelId) {
        await updateDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'barrels', editingBarrelId), data);
        showNotification("Barrel Updated Successfully");
      } else {
        await addDoc(collection(db, 'artifacts', 'distillation-app', 'users', user.uid, 'barrels'), data);
        showNotification("Barrel Registered Successfully");
      }
      setBarrelForm({ barrelNumber: '', type: '', capacity: '', fillDate: new Date().toISOString().slice(0, 10), contents: 'Gin', currentVolume: '', usageCount: '1' });
      setEditingBarrelId(null);
    } catch (err) { showNotification(`Error saving barrel: ${err.message}`); }
  };

  const deleteBarrel = async (id) => {
    if (!user) return;
    if (window.confirm("Are you sure you want to delete this barrel profile?")) {
      await deleteDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'barrels', id));
      showNotification("Barrel profile deleted.");
    }
  };

  // --- RECIPES & MATERIALS DEFINITIONS ---
  const handleAddRecipe = async (e) => {
    e.preventDefault();
    if (!user) return;
    const recipeToSave = {
      ...recipeForm,
      ingredients: recipeForm.ingredients.map(ing => ({ ...ing, quantity: parseFloat(ing.quantity) || 0, unit: ing.unit || '' }))
    };
    try {
      if (editingRecipeId) {
        await updateDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'recipes', editingRecipeId), recipeToSave);
        showNotification("Recipe updated successfully!");
        setEditingRecipeId(null);
      } else {
        await addDoc(collection(db, 'artifacts', 'distillation-app', 'users', user.uid, 'recipes'), recipeToSave);
        showNotification("Recipe added successfully!");
      }
      setRecipeForm({ name: '', product: '', ingredients: [{ name: '', quantity: '', unit: '' }] });
    } catch (err) { showNotification(`Error saving recipe: ${err.message}`); }
  };

  const deleteRecipeItem = async (id) => {
    if (!user) return;
    if (window.confirm("Are you sure you want to delete this recipe?")) {
      await deleteDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'recipes', id));
      showNotification("Recipe deleted.");
    }
  };

  const startEditingRecipe = (recipe) => {
    setEditingRecipeId(recipe.id);
    setRecipeForm({ name: recipe.name || '', product: recipe.product || '', ingredients: recipe.ingredients || [{ name: '', quantity: '', unit: '' }] });
  };

  const handleAddBottlingMaterials = async (e) => {
    e.preventDefault();
    if (!user) return;
    const payload = {
      name: bottlingMaterialsForm.name,
      materials: bottlingMaterialsForm.materials.map(m => ({ ...m, quantity: parseFloat(m.quantity) || 0, unit: m.unit || '' }))
    };
    try {
      if (editingProfileId) {
        await updateDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'bottlingMaterialDefinitions', editingProfileId), payload);
        showNotification(`Material profile updated!`);
        setEditingProfileId(null);
      } else {
        await setDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'bottlingMaterialDefinitions', payload.name), payload);
        showNotification(`Material profile saved!`);
      }
      setBottlingMaterialsForm({ name: '', materials: [{ name: '', quantity: '', unit: '' }] });
    } catch (err) { showNotification(`Error saving materials: ${err.message}`); }
  };

  const deleteProfileItem = async (id) => {
    if (!user) return;
    if (window.confirm("Are you sure you want to delete this profile?")) {
      await deleteDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'bottlingMaterialDefinitions', id));
      showNotification("Profile deleted.");
    }
  };

  const startEditingProfile = (profile) => {
    setEditingProfileId(profile.id);
    setBottlingMaterialsForm({ name: profile.name || '', materials: profile.materials || [{ name: '', quantity: '', unit: '' }] });
  };

  // --- LOG SUBMISSIONS & DEDUCTIONS ---
  const handleLogSubmit = async (e, type) => {
    e.preventDefault();
    if (!user) return;
    const path = type === 'distillation' ? 'distillationLogs' : 'bottlingLogs';
    
    let formToSave = {};
    if (type === 'distillation') {
      const distAmt = parseFloat(distillationForm.distillateAmount) || 0;
      const distABV = parseFloat(distillationForm.distillateABV) || 0;
      const calculatedLAA = (distAmt * (distABV / 100)).toFixed(2);
      
      // Calculate COGS - Always store in Base Currency (ISK) to keep history accurate
      let totalCostISK = 0;
      const recipe = recipes.find(r => r.name === distillationForm.recipeName);
      if (recipe) {
        for (const ingredient of recipe.ingredients) {
          const invItem = inventory.find(i => i.name === ingredient.name);
          if (invItem && invItem.costPerUnit) {
            const qty = convertQuantity(parseFloat(ingredient.quantity), ingredient.unit, invItem.unit);
            const costInISK = convertCurrency(parseFloat(invItem.costPerUnit), invItem.currency || 'USD', 'ISK');
            totalCostISK += (qty * costInISK);
          }
        }
      }

      formToSave = { 
        ...distillationForm,
        distillateAmount: distAmt,
        ethanolAmount: parseFloat(distillationForm.ethanolAmount) || 0,
        waterIntoStill: parseFloat(distillationForm.waterIntoStill) || 0,
        laa: calculatedLAA,
        cogsISK: totalCostISK.toFixed(2)
      };
    } else {
      formToSave = { 
        ...bottlingForm,
        bottledAmount: parseInt(bottlingForm.bottledAmount, 10) || 0,
        boxesUsed: Math.floor((parseInt(bottlingForm.bottledAmount, 10) || 0) / 6),
        volumeDrawn: parseFloat(bottlingForm.volumeDrawn) || 0
      };
    }

    try {
      if (editingLogId) {
        // Update existing log without re-deducting inventory
        await updateDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, path, editingLogId), formToSave);
        showNotification("Log Updated Successfully");
        setEditingLogId(null);
      } else {
        await addDoc(collection(db, 'artifacts', 'distillation-app', 'users', user.uid, path), { ...formToSave, timestamp: new Date() });
        showNotification("Log Saved Successfully! Inventory Deducted.");

        // Deductions
        if (type === 'distillation') {
          const recipe = recipes.find(r => r.name === distillationForm.recipeName);
          if (recipe) {
            for (const ingredient of recipe.ingredients) {
              const invItem = inventory.find(i => i.name === ingredient.name);
              if (invItem) {
                const deductionQty = convertQuantity(parseFloat(ingredient.quantity) || 0, ingredient.unit, invItem.unit);
                const newQuantity = (invItem.quantity || 0) - deductionQty;
                await updateDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'inventory', invItem.id), { quantity: newQuantity > 0 ? newQuantity : 0 });
              }
            }
          }
        } else {
          // Deduct materials
          const matDef = bottlingMaterialDefinitions.find(def => def.name === bottlingForm.product);
          if (matDef) {
            for (const mat of matDef.materials) {
              const invItem = inventory.find(item => item.name === mat.name && item.type === 'bottling_material');
              if (invItem) {
                const deductionPerBottle = convertQuantity(parseFloat(mat.quantity) || 0, mat.unit, invItem.unit);
                const newQuantity = (invItem.quantity || 0) - (deductionPerBottle * formToSave.bottledAmount);
                await updateDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'inventory', invItem.id), { quantity: newQuantity > 0 ? newQuantity : 0 });
              }
            }
          }
          // Deduct from Barrel if applicable
          if (formToSave.source === 'barrel' && formToSave.barrelId) {
             const barrel = barrels.find(b => b.id === formToSave.barrelId);
             if (barrel) {
                const newVolume = (parseFloat(barrel.currentVolume) || 0) - formToSave.volumeDrawn;
                await updateDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'barrels', barrel.id), { currentVolume: newVolume > 0 ? newVolume : 0 });
             }
          }
        }
      }
      type === 'distillation' ? setDistillationForm(emptyDistillationForm) : setBottlingForm(emptyBottlingForm);
    } catch (err) { showNotification(`Error saving log: ${err.message}`); }
  };

  const deleteLogItem = async (log) => {
    if (!user) return;
    if (window.confirm("Permanently delete this batch log? Used materials/ingredients will be returned to inventory.")) {
      try {
        const path = log.type === 'distillation' ? 'distillationLogs' : 'bottlingLogs';
        
        // Restore inventory based on the log type before deleting
        if (log.type === 'distillation') {
          const recipe = recipes.find(r => r.name === log.recipeName);
          if (recipe) {
            for (const ingredient of recipe.ingredients) {
              const invItem = inventory.find(i => i.name === ingredient.name);
              if (invItem) {
                const restoredQty = convertQuantity(parseFloat(ingredient.quantity) || 0, ingredient.unit, invItem.unit);
                await updateDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'inventory', invItem.id), { quantity: (invItem.quantity || 0) + restoredQty });
              }
            }
          }
        } else if (log.type === 'bottling') {
          const matDef = bottlingMaterialDefinitions.find(def => def.name === log.product);
          if (matDef) {
            for (const mat of matDef.materials) {
              const invItem = inventory.find(item => item.name === mat.name && item.type === 'bottling_material');
              if (invItem) {
                const deductionPerBottle = convertQuantity(parseFloat(mat.quantity) || 0, mat.unit, invItem.unit);
                await updateDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'inventory', invItem.id), { quantity: (invItem.quantity || 0) + (deductionPerBottle * (parseInt(log.bottledAmount, 10) || 0)) });
              }
            }
          }
          if (log.source === 'barrel' && log.barrelId) {
             const barrel = barrels.find(b => b.id === log.barrelId);
             if (barrel) {
                await updateDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'barrels', barrel.id), { currentVolume: (parseFloat(barrel.currentVolume) || 0) + (parseFloat(log.volumeDrawn) || 0) });
             }
          }
        }
        await deleteDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, path, log.id));
        showNotification("Batch Log Deleted and Inventory Restocked.");
      } catch(err) { showNotification(`Error deleting log: ${err.message}`); }
    }
  };

  const startEditingLog = (log) => {
    setExpandedLogId(null);
    setEditingLogId(log.id);
    if (log.type === 'distillation') {
      setDistillationForm(log); setView('distillation');
    } else {
      setBottlingForm(log); setView('bottling');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- ANALYTICS DASHBOARD DATA ---
  const chartColors = ['#8A2A2B', '#D97757', '#4E3629', '#2C3E50', '#825A45', '#A5694F'];

  // Distillation Chart Data (Stacked)
  const distProducts = Array.from(new Set(distillationLogs.map(l => l.recipeName).filter(Boolean))).sort();
  const distColorMap = {};
  distProducts.forEach((p, i) => distColorMap[p] = chartColors[i % chartColors.length]);

  const distLast6Months = [...Array(6)].map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return { month: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), totals: {}, totalVolume: 0, index: d.getMonth() };
  }).reverse();

  distillationLogs.forEach(log => {
      const logDate = new Date(log.date);
      const monthObj = distLast6Months.find(m => m.index === logDate.getMonth() && m.year === logDate.getFullYear());
      if (monthObj && log.recipeName) {
          const amt = parseFloat(log.distillateAmount) || 0;
          monthObj.totals[log.recipeName] = (monthObj.totals[log.recipeName] || 0) + amt;
          monthObj.totalVolume += amt;
      }
  });
  const maxDistVolume = Math.max(...distLast6Months.map(m => m.totalVolume), 1);

  // Bottling Chart Data (Stacked)
  const botProducts = Array.from(new Set(bottlingLogs.map(l => l.product).filter(Boolean))).sort();
  const botColorMap = {};
  botProducts.forEach((p, i) => botColorMap[p] = chartColors[i % chartColors.length]);

  const botLast6Months = [...Array(6)].map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return { month: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), totals: {}, totalVolume: 0, index: d.getMonth() };
  }).reverse();

  bottlingLogs.forEach(log => {
      const logDate = new Date(log.date);
      const monthObj = botLast6Months.find(m => m.index === logDate.getMonth() && m.year === logDate.getFullYear());
      if (monthObj && log.product) {
          const amt = parseInt(log.bottledAmount, 10) || 0;
          monthObj.totals[log.product] = (monthObj.totals[log.product] || 0) + amt;
          monthObj.totalVolume += amt;
      }
  });
  const maxBotVolume = Math.max(...botLast6Months.map(m => m.totalVolume), 1);

  // --- PRE-CALCULATE FILTERS & PAGINATION ---
  const filteredLogs = combinedLogs.filter(log => {
    if (historyFilter === 'All') return true;
    return (log.recipeName || log.product) === historyFilter;
  });
  const currentLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const uniqueFilters = Array.from(new Set(combinedLogs.map(l => l.recipeName || l.product).filter(Boolean)));

  // --- PDF EXPORT ENGINE ---
  const exportPDF = () => {
    if (!window.html2pdf) { showNotification("PDF Library not loaded yet."); return; }

    const printContainer = document.createElement('div');
    printContainer.style.padding = '20px';
    printContainer.style.fontFamily = 'Helvetica, Arial, sans-serif';
    printContainer.style.color = '#333';

    const title = document.createElement('h2');
    title.innerText = `Distillery Batch Report - ${historyFilter === 'All' ? 'All Logs' : historyFilter}`;
    title.style.borderBottom = '2px solid #8A2A2B';
    title.style.paddingBottom = '10px';
    title.style.marginBottom = '20px';
    printContainer.appendChild(title);

    let tableHtml = `
      <table style="width: 100%; border-collapse: collapse; font-size: 9px; text-align: left;">
        <thead>
          <tr style="background-color: #f3f4f6; color: #4E3629;">
            <th style="padding: 6px; border: 1px solid #d1d5db;">Type</th>
            <th style="padding: 6px; border: 1px solid #d1d5db;">Date & Time</th>
            <th style="padding: 6px; border: 1px solid #d1d5db;">Recipe / Product</th>
            <th style="padding: 6px; border: 1px solid #d1d5db;">Yield & Result</th>
            <th style="padding: 6px; border: 1px solid #d1d5db;">Analytics</th>
            <th style="padding: 6px; border: 1px solid #d1d5db;">Charge / Source Details</th>
            <th style="padding: 6px; border: 1px solid #d1d5db;">Collection Times</th>
            <th style="padding: 6px; border: 1px solid #d1d5db;">Notes</th>
          </tr>
        </thead>
        <tbody>
    `;

    filteredLogs.forEach(log => {
      const isDistill = log.type === 'distillation';
      const dateTime = `${new Date(log.date).toLocaleDateString()} ${isDistill ? log.distillationStart : log.bottlingStartTime || ''}`;
      const yieldStr = isDistill 
        ? `${log.distillateAmount || 0} L @ ${log.distillateABV || 0}%` 
        : `${log.bottledAmount || 0} Units (Lot: ${log.lotNumber || '-'})`;
      
      const displayCogs = log.cogsISK !== undefined ? convertCurrency(parseFloat(log.cogsISK), 'ISK', displayCurrency) : convertCurrency(parseFloat(log.cogs || 0), 'USD', displayCurrency);
      const analytics = isDistill ? `LAA: ${log.laa || 0} L<br/>COGS: ${getCurrencySymbol(displayCurrency)}${displayCogs.toFixed(2)}` : '-';
      
      const charge = isDistill
        ? `Eth: ${log.ethanolAmount || 0}L<br/>H2O: ${log.waterIntoStill || 0}L<br/>ABV: ${log.abvOfCharge || 0}%`
        : `Source: ${log.source === 'barrel' ? 'Barrel' : 'Tank'}<br/>Boxes: ${log.boxesUsed || 0}`;
      const cuts = isDistill
        ? `Heads: ${log.headsCollectionStart||'-'}<br/>Hearts: ${log.heartsCollectionStart||'-'} to ${log.heartsCollectionStop||'-'}<br/>Tails: ${log.tailsDuration||'0'}m`
        : '-';

      tableHtml += `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 6px; border: 1px solid #d1d5db; font-weight: bold; text-transform: uppercase;">${log.type}</td>
          <td style="padding: 6px; border: 1px solid #d1d5db;">${dateTime}</td>
          <td style="padding: 6px; border: 1px solid #d1d5db; font-weight: bold;">${log.recipeName || log.product || '-'}</td>
          <td style="padding: 6px; border: 1px solid #d1d5db;">${yieldStr}</td>
          <td style="padding: 6px; border: 1px solid #d1d5db;">${analytics}</td>
          <td style="padding: 6px; border: 1px solid #d1d5db;">${charge}</td>
          <td style="padding: 6px; border: 1px solid #d1d5db;">${cuts}</td>
          <td style="padding: 6px; border: 1px solid #d1d5db; max-width: 150px;">${log.notes || '-'}</td>
        </tr>
      `;
    });

    tableHtml += `</tbody></table>`;
    printContainer.innerHTML += tableHtml;

    window.html2pdf().from(printContainer).set({
      margin: 0.4, filename: `Distillery_Report_${historyFilter.replace(/[^a-z0-9]/gi, '_')}.pdf`,
      image: { type: 'jpeg', quality: 1 }, html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
    }).save();
  };

  // --- RENDER METHODS ---
  if (!isAuthReady) return <div className={tailwind}><LoaderCircle className="animate-spin mt-20" size={48} /></div>;

  if (!user) {
    return (
      <div className={tailwind}>
        <div className={card + " text-center mt-20 max-w-md"}>
          <h2 className="text-2xl font-black mb-6 text-[#4E3629]">Distillery App Login</h2>
          <button onClick={handleLogin} className={button + " w-full flex items-center justify-center gap-3"}>
            <LogIn size={20} /> Sign in with Google
          </button>
          {authError && <div className="mt-6 p-4 bg-red-100 text-red-700 rounded-xl text-sm border border-red-200 leading-relaxed font-bold shadow-inner">{authError}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={tailwind}>
      <header className="w-full max-w-4xl mb-8 flex flex-col gap-4">
        <div className="flex justify-between items-center bg-[#E0D8D0] p-4 rounded-2xl shadow-md border-b-4 border-[#8A2A2B]">
          <div className="flex items-center gap-4">
            <select value={displayCurrency} onChange={e => setDisplayCurrency(e.target.value)} className="bg-[#C8C2BA] text-[#4E3629] p-1.5 rounded-lg font-bold text-xs outline-none cursor-pointer">
              <option value="ISK">ISK (kr)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
            <span className="font-bold text-[#8A2A2B] truncate hidden md:inline">{user.email}</span>
          </div>
          <button onClick={handleLogout} className="text-red-800 hover:text-red-600 flex items-center gap-1 text-sm font-black whitespace-nowrap">
            <LogOut size={16} /> LOGOUT
          </button>
        </div>
        <nav className="flex bg-[#E0D8D0] rounded-2xl p-2 shadow-xl overflow-x-auto gap-1">
          <button onClick={() => setView('dashboard')} className={`${tabButton} ${view === 'dashboard' ? activeTab : inactiveTab}`}><Home size={18} className="mr-1"/>Home</button>
          <button onClick={() => {setView('distillation'); setEditingLogId(null); setDistillationForm(emptyDistillationForm);}} className={`${tabButton} ${view === 'distillation' ? activeTab : inactiveTab}`}><FlaskConical size={18} className="mr-1"/>Log Run</button>
          <button onClick={() => {setView('bottling'); setEditingLogId(null); setBottlingForm(emptyBottlingForm);}} className={`${tabButton} ${view === 'bottling' ? activeTab : inactiveTab}`}><GlassWater size={18} className="mr-1"/>Bottling</button>
          <button onClick={() => setView('barrels')} className={`${tabButton} ${view === 'barrels' ? activeTab : inactiveTab}`}><Database size={18} className="mr-1"/>Barrels</button>
          <button onClick={() => setView('inventory')} className={`${tabButton} ${view === 'inventory' ? activeTab : inactiveTab}`}><Archive size={18} className="mr-1"/>Inventory</button>
          <button onClick={() => setView('logHistory')} className={`${tabButton} ${view === 'logHistory' ? activeTab : inactiveTab}`}><List size={18} className="mr-1"/>History</button>
        </nav>
      </header>

      <main className="w-full max-w-4xl">
        {/* --- DASHBOARD --- */}
        {view === 'dashboard' && (
          <div className="space-y-6">
            <div className={card}>
              <h1 className="text-3xl font-black mb-6 text-[#8A2A2B] flex items-center gap-2"><TrendingUp size={28}/> Production Analytics</h1>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-[#8A2A2B] p-4 rounded-xl text-white shadow-lg text-center">
                  <p className="text-3xl font-bold">{distillationLogs.length}</p>
                  <p className="text-[10px] uppercase font-bold opacity-90 tracking-widest mt-1">Distillations</p>
                </div>
                <div className="bg-[#8A2A2B] p-4 rounded-xl text-white shadow-lg text-center">
                  <p className="text-3xl font-bold">{bottlingLogs.length}</p>
                  <p className="text-[10px] uppercase font-bold opacity-90 tracking-widest mt-1">Bottlings</p>
                </div>
                <div className="bg-[#8A2A2B] p-4 rounded-xl text-white shadow-lg text-center">
                  <p className="text-3xl font-bold">{inventory.length}</p>
                  <p className="text-[10px] uppercase font-bold opacity-90 tracking-widest mt-1">Stock Items</p>
                </div>
                <div className="bg-[#8A2A2B] p-4 rounded-xl text-white shadow-lg text-center">
                  <p className="text-3xl font-bold">{barrels.length}</p>
                  <p className="text-[10px] uppercase font-bold opacity-90 tracking-widest mt-1">Active Barrels</p>
                </div>
              </div>

              {/* Charts Container */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Distillation Chart */}
                <div className="bg-white/40 p-6 rounded-2xl border border-[#B5AE9F] flex flex-col">
                  <h3 className="font-bold text-[#4E3629] mb-6 flex items-center justify-center"><Droplet size={18} className="mr-2 text-[#8A2A2B]"/> Distillation Volume (L)</h3>
                  <div className="flex items-end h-48 gap-2 border-b-2 border-[#4E3629]/20 pb-2">
                    {distLast6Months.map(month => (
                      <div key={month.month} className="flex-1 flex flex-col items-center justify-end group relative h-full">
                        <div className="absolute -top-6 bg-[#4E3629] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                          {month.totalVolume.toFixed(0)} L
                        </div>
                        <div className="flex flex-col-reverse w-full items-center justify-start rounded-t-sm overflow-hidden" style={{ height: `${maxDistVolume > 0 ? (month.totalVolume / maxDistVolume) * 100 : 0}%`, minHeight: month.totalVolume > 0 ? '4px' : '0' }}>
                          {Object.entries(month.totals).map(([product, amt]) => (
                            <div key={product} className="w-full transition-all duration-300 hover:brightness-110" style={{ height: `${(amt / month.totalVolume) * 100}%`, backgroundColor: distColorMap[product] }} title={`${product}: ${amt.toFixed(1)} L`}></div>
                          ))}
                        </div>
                        <span className="text-[10px] font-bold mt-2 uppercase opacity-60 text-center w-full block">{month.month}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-6 justify-center">
                    {distProducts.map(p => (
                      <div key={p} className="flex items-center text-[10px] font-bold uppercase text-[#4E3629]">
                        <span className="w-3 h-3 rounded-full mr-1 inline-block" style={{ backgroundColor: distColorMap[p] }}></span> {p}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottling Chart */}
                <div className="bg-white/40 p-6 rounded-2xl border border-[#B5AE9F] flex flex-col">
                  <h3 className="font-bold text-[#4E3629] mb-6 flex items-center justify-center"><GlassWater size={18} className="mr-2 text-[#8A2A2B]"/> Bottling Volume (Units)</h3>
                  <div className="flex items-end h-48 gap-2 border-b-2 border-[#4E3629]/20 pb-2">
                    {botLast6Months.map(month => (
                      <div key={month.month} className="flex-1 flex flex-col items-center justify-end group relative h-full">
                        <div className="absolute -top-6 bg-[#4E3629] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                          {month.totalVolume.toFixed(0)} Units
                        </div>
                        <div className="flex flex-col-reverse w-full items-center justify-start rounded-t-sm overflow-hidden" style={{ height: `${maxBotVolume > 0 ? (month.totalVolume / maxBotVolume) * 100 : 0}%`, minHeight: month.totalVolume > 0 ? '4px' : '0' }}>
                          {Object.entries(month.totals).map(([product, amt]) => (
                            <div key={product} className="w-full transition-all duration-300 hover:brightness-110" style={{ height: `${(amt / month.totalVolume) * 100}%`, backgroundColor: botColorMap[product] }} title={`${product}: ${amt} Units`}></div>
                          ))}
                        </div>
                        <span className="text-[10px] font-bold mt-2 uppercase opacity-60 text-center w-full block">{month.month}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-6 justify-center">
                    {botProducts.map(p => (
                      <div key={p} className="flex items-center text-[10px] font-bold uppercase text-[#4E3629]">
                        <span className="w-3 h-3 rounded-full mr-1 inline-block" style={{ backgroundColor: botColorMap[p] }}></span> {p}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {inventory.some(i => i.quantity <= i.lowStockThreshold) && (
              <div className={notificationBox}>
                <h3 className="font-bold mb-2 flex items-center gap-2"><Archive size={18}/> Urgent: Low Stock Alert</h3>
                {inventory.filter(i => i.quantity <= i.lowStockThreshold).map(i => (
                  <div key={i.id} className={lowStockItem}>
                    <span className="font-bold text-[#4E3629]">{i.name}</span>
                    <span className="bg-[#8A2A2B] text-white px-2 py-1 rounded text-sm">{i.quantity} / {i.lowStockThreshold} {i.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- DISTILLATION LOG --- */}
        {view === 'distillation' && (
          <div className={card}>
            <h2 className="text-2xl font-bold mb-6 text-[#8A2A2B] flex items-center gap-2">
              <FlaskConical size={24}/> {editingLogId ? "Edit Distillation Log" : "New Distillation Log"}
            </h2>
            <form onSubmit={(e) => handleLogSubmit(e, 'distillation')} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Date</label>
                  <input type="date" value={distillationForm.date} onChange={e => setDistillationForm({...distillationForm, date: e.target.value})} className={inputField} required />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Recipe Used</label>
                  <select value={distillationForm.recipeName} onChange={e => setDistillationForm({...distillationForm, recipeName: e.target.value})} className={inputField} required>
                    <option value="">Select Recipe...</option>
                    {recipes.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Start Time</label>
                  <TimePicker value={distillationForm.distillationStart} onChange={val => setDistillationForm({...distillationForm, distillationStart: val})} required={true} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Power Level</label>
                  <select value={distillationForm.powerLevel} onChange={e => setDistillationForm({...distillationForm, powerLevel: e.target.value})} className={inputField} required>
                    <option value="">Power...</option>
                    {['1','1.5','2','2.5','3','3.5'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Ethanol (L)</label>
                  <input type="number" step="0.01" value={distillationForm.ethanolAmount} onChange={e => setDistillationForm({...distillationForm, ethanolAmount: e.target.value})} className={inputField} required />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Water (L)</label>
                  <input type="number" step="0.01" value={distillationForm.waterIntoStill} onChange={e => setDistillationForm({...distillationForm, waterIntoStill: e.target.value})} className={inputField} required />
                </div>
              </div>

              <div className="bg-[#C8C2BA]/40 p-4 rounded-xl flex justify-between items-center flex-wrap gap-4">
                 <label className="flex items-center gap-2 font-bold cursor-pointer">
                    <input type="checkbox" checked={distillationForm.lowerPlateOn} onChange={e => setDistillationForm({...distillationForm, lowerPlateOn: e.target.checked})} className="w-5 h-5 accent-[#8A2A2B]" /> Lower Plate On
                 </label>
                 <label className="flex items-center gap-2 font-bold cursor-pointer">
                    <input type="checkbox" checked={distillationForm.upperPlateOn} onChange={e => setDistillationForm({...distillationForm, upperPlateOn: e.target.checked})} className="w-5 h-5 accent-[#8A2A2B]" /> Upper Plate On
                 </label>
                 <label className="flex items-center gap-2 font-bold cursor-pointer">
                    <input type="checkbox" checked={distillationForm.dephlegmatorOn} onChange={e => setDistillationForm({...distillationForm, dephlegmatorOn: e.target.checked})} className="w-5 h-5 accent-[#8A2A2B]" /> Dephlegmator On
                 </label>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Heads Start</label>
                  <TimePicker value={distillationForm.headsCollectionStart} onChange={val => setDistillationForm({...distillationForm, headsCollectionStart: val})} required={true} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Hearts Start</label>
                  <TimePicker value={distillationForm.heartsCollectionStart} onChange={val => setDistillationForm({...distillationForm, heartsCollectionStart: val})} required={true} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Hearts Stop</label>
                  <TimePicker value={distillationForm.heartsCollectionStop} onChange={val => setDistillationForm({...distillationForm, heartsCollectionStop: val})} required={true} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Tails Time (m)</label>
                  <input type="number" value={distillationForm.tailsDuration} onChange={e => setDistillationForm({...distillationForm, tailsDuration: e.target.value})} className={inputField} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Collected (L)</label>
                  <input type="number" step="0.01" value={distillationForm.distillateAmount} onChange={e => setDistillationForm({...distillationForm, distillateAmount: e.target.value})} className={inputField} required />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Resulting ABV %</label>
                  <input type="number" step="0.01" value={distillationForm.distillateABV} onChange={e => setDistillationForm({...distillationForm, distillateABV: e.target.value})} className={inputField} required />
                </div>
              </div>

              {distillationForm.distillateAmount && distillationForm.distillateABV && (
                <div className="bg-green-800/10 border border-green-800 text-green-900 p-3 rounded-xl flex items-center font-bold">
                  <TrendingUp size={18} className="mr-2"/> Calculated LAA: {(parseFloat(distillationForm.distillateAmount) * (parseFloat(distillationForm.distillateABV) / 100)).toFixed(2)} L
                </div>
              )}

              <textarea placeholder="Additional Notes..." value={distillationForm.notes} onChange={e => setDistillationForm({...distillationForm, notes: e.target.value})} className={inputField + " h-24"} />
              
              <div className="flex gap-2">
                <button type="submit" className={button + " flex-1 uppercase tracking-widest text-lg mt-4"}>
                  {editingLogId ? "Update Run Log" : "Submit Run"}
                </button>
                {editingLogId && (
                  <button type="button" onClick={() => {setEditingLogId(null); setDistillationForm(emptyDistillationForm); setView('logHistory');}} className="mt-4 bg-gray-500 text-white p-3 rounded-xl"><X size={24}/></button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* --- BOTTLING LOG --- */}
        {view === 'bottling' && (
          <div className={card}>
            <h2 className="text-2xl font-bold mb-6 text-[#8A2A2B] flex items-center gap-2">
              <GlassWater size={24}/> {editingLogId ? "Edit Bottling Log" : "New Bottling Log"}
            </h2>
            <form onSubmit={(e) => handleLogSubmit(e, 'bottling')} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Date</label>
                  <input type="date" value={bottlingForm.date} onChange={e => setBottlingForm({...bottlingForm, date: e.target.value})} className={inputField} required />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Time</label>
                  <TimePicker value={bottlingForm.bottlingStartTime} onChange={val => setBottlingForm({...bottlingForm, bottlingStartTime: val})} required={true} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Product Definition</label>
                <select value={bottlingForm.product} onChange={e => setBottlingForm({...bottlingForm, product: e.target.value})} className={inputField} required>
                  <option value="">Select Product...</option>
                  {bottlingMaterialDefinitions.map(def => <option key={def.name} value={def.name}>{def.name}</option>)}
                </select>
              </div>

              <div className="bg-[#C8C2BA]/30 p-4 rounded-xl space-y-4 border border-[#B5AE9F]">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Liquid Source</label>
                  <select value={bottlingForm.source} onChange={e => setBottlingForm({...bottlingForm, source: e.target.value, barrelId: ''})} className={inputField} required>
                    <option value="tank">Standard Tank / IBC</option>
                    <option value="barrel">Aging Barrel</option>
                  </select>
                </div>
                {bottlingForm.source === 'barrel' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1 text-red-800 ml-1">Select Barrel to Drain</label>
                      <select value={bottlingForm.barrelId} onChange={e => setBottlingForm({...bottlingForm, barrelId: e.target.value})} className={`${inputField} border-red-800/30 border-2`} required>
                        <option value="">Select Active Barrel...</option>
                        {barrels.map(b => <option key={b.id} value={b.id}>{b.barrelNumber} ({b.contents} - {b.currentVolume}L left)</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1 text-red-800 ml-1">Volume Drawn (L)</label>
                      <input type="number" step="0.01" value={bottlingForm.volumeDrawn} onChange={e => setBottlingForm({...bottlingForm, volumeDrawn: e.target.value})} className={`${inputField} border-red-800/30 border-2`} required />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Total Bottles Yielded</label>
                  <input type="number" value={bottlingForm.bottledAmount} onChange={e => setBottlingForm({...bottlingForm, bottledAmount: e.target.value})} className={inputField} required />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Lot Number (Optional)</label>
                  <input type="text" value={bottlingForm.lotNumber} onChange={e => setBottlingForm({...bottlingForm, lotNumber: e.target.value})} className={inputField} />
                </div>
              </div>

              <textarea placeholder="Notes..." value={bottlingForm.notes} onChange={e => setBottlingForm({...bottlingForm, notes: e.target.value})} className={inputField + " h-24"} />
              
              <div className="flex gap-2">
                <button type="submit" className={button + " flex-1 uppercase tracking-widest text-lg mt-4"}>
                  {editingLogId ? "Update Bottling Log" : "Submit Bottling"}
                </button>
                {editingLogId && (
                  <button type="button" onClick={() => {setEditingLogId(null); setBottlingForm(emptyBottlingForm); setView('logHistory');}} className="mt-4 bg-gray-500 text-white p-3 rounded-xl"><X size={24}/></button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* --- BARREL MANAGEMENT --- */}
        {view === 'barrels' && (
          <div className={card}>
            <h2 className="text-3xl font-black mb-6 text-[#8A2A2B] flex items-center gap-2"><Database size={28}/> Barrel Maturation Tracking</h2>
            
            <div className="overflow-x-auto mb-8 bg-white/40 rounded-2xl p-2 border border-[#B5AE9F]">
              <h3 className="font-bold text-lg p-2 ml-2 text-[#4E3629]">Active Barrels</h3>
              <table className="w-full">
                <thead><tr className={tableHeader}><th className="p-3">ID / Name</th><th className="p-3">Type</th><th className="p-3">Contents</th><th className="p-3">Fill Date / Age</th><th className="p-3">Vol (L)</th><th className="p-3 text-center">Manage</th></tr></thead>
                <tbody>
                  {barrels.map(barrel => (
                    <tr key={barrel.id} className={tableRow}>
                      <td className="p-3 font-bold">{barrel.barrelNumber} <span className="block text-[10px] uppercase font-normal opacity-70">Used {barrel.usageCount}x</span></td>
                      <td className="p-3">{barrel.type} <span className="block text-[10px] uppercase opacity-70">{barrel.capacity}L Cap</span></td>
                      <td className="p-3 font-semibold">{barrel.contents}</td>
                      <td className="p-3">{new Date(barrel.fillDate).toLocaleDateString()} <span className="block text-[10px] uppercase font-bold text-[#8A2A2B]">{calculateAge(barrel.fillDate)}</span></td>
                      <td className="p-3 font-bold">{barrel.currentVolume} L</td>
                      <td className="p-3 flex justify-center gap-3">
                        <button type="button" onClick={() => {setEditingBarrelId(barrel.id); setBarrelForm(barrel);}} className="p-2 text-blue-700 hover:bg-blue-100 rounded-lg"><Pencil size={18}/></button>
                        <button type="button" onClick={() => deleteBarrel(barrel.id)} className="p-2 text-red-700 hover:bg-red-100 rounded-lg"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                  {barrels.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-[#4E3629]/60 italic font-medium">No active barrels currently registered.</td></tr>}
                </tbody>
              </table>
            </div>

            <form onSubmit={handleBarrelSubmit} className="bg-[#C8C2BA] p-6 rounded-2xl border-2 border-[#8A2A2B]/20 space-y-4 shadow-inner mb-12">
              <h3 className="font-black text-[#8A2A2B] uppercase text-sm tracking-widest flex items-center gap-2">
                {editingBarrelId ? <><Pencil size={18}/> Modify Barrel Details</> : <><Plus size={18}/> Register New Barrel</>}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="text" placeholder="Barrel ID / Number" value={barrelForm.barrelNumber} onChange={e => setBarrelForm({...barrelForm, barrelNumber: e.target.value})} className={inputField} required />
                <input type="text" placeholder="Wood/Type (e.g. Ex-Bourbon, New Oak)" value={barrelForm.type} onChange={e => setBarrelForm({...barrelForm, type: e.target.value})} className={inputField} required />
                <input type="number" placeholder="Total Capacity (L)" value={barrelForm.capacity} onChange={e => setBarrelForm({...barrelForm, capacity: e.target.value})} className={inputField} required />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                   <label className="block text-[10px] font-bold uppercase mb-1 opacity-70 ml-1">Fill Date</label>
                   <input type="date" value={barrelForm.fillDate} onChange={e => setBarrelForm({...barrelForm, fillDate: e.target.value})} className={inputField} required />
                </div>
                <div>
                   <label className="block text-[10px] font-bold uppercase mb-1 opacity-70 ml-1">Contents</label>
                   <input type="text" placeholder="e.g. Dry Gin" value={barrelForm.contents} onChange={e => setBarrelForm({...barrelForm, contents: e.target.value})} className={inputField} required />
                </div>
                <div>
                   <label className="block text-[10px] font-bold uppercase mb-1 opacity-70 ml-1">Current Vol (L)</label>
                   <input type="number" step="0.01" value={barrelForm.currentVolume} onChange={e => setBarrelForm({...barrelForm, currentVolume: e.target.value})} className={inputField} required />
                </div>
                <div>
                   <label className="block text-[10px] font-bold uppercase mb-1 opacity-70 ml-1">Times Used</label>
                   <input type="number" value={barrelForm.usageCount} onChange={e => setBarrelForm({...barrelForm, usageCount: e.target.value})} className={inputField} required />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className={button + " flex-1 uppercase tracking-tighter"}>{editingBarrelId ? "Update Barrel" : "Register Barrel"}</button>
                {editingBarrelId && <button type="button" onClick={() => {setEditingBarrelId(null); setBarrelForm({ barrelNumber: '', type: '', capacity: '', fillDate: new Date().toISOString().slice(0, 10), contents: 'Gin', currentVolume: '', usageCount: '1' });}} className="bg-gray-500 text-white p-3 rounded-xl"><X /></button>}
              </div>
            </form>
          </div>
        )}

        {/* --- INVENTORY MANAGER (Includes Recipes & Definitions) --- */}
        {view === 'inventory' && (
          <div className={card}>
            <h2 className="text-3xl font-black mb-6 text-[#8A2A2B] flex items-center gap-2"><Archive size={28}/> Full Inventory Hub</h2>
            
            {/* Stock List */}
            <div className="overflow-x-auto mb-8 bg-white/40 rounded-2xl p-2 border border-[#B5AE9F]">
              <h3 className="font-bold text-lg p-2 ml-2 text-[#4E3629]">Current Stock</h3>
              <table className="w-full">
                <thead><tr className={tableHeader}><th className="p-3">Item / Lot</th><th className="p-3">Type</th><th className="p-3">Stock Level</th><th className="p-3">Cost/Unit</th><th className="p-3 text-center">Manage</th></tr></thead>
                <tbody>
                  {inventory.map(item => (
                    <tr key={item.id} className={tableRow}>
                      <td className="p-3 font-bold">{item.name} <span className="block text-[10px] font-normal opacity-70 uppercase tracking-widest">Lot: {item.currentLot || 'N/A'}</span></td>
                      <td className="p-3 capitalize">{item.type.replace('_', ' ')}</td>
                      <td className={`p-3 ${item.quantity <= item.lowStockThreshold ? 'text-red-700 font-black' : ''}`}>{parseFloat(item.quantity).toFixed(2)} {item.unit}</td>
                      <td className="p-3 text-green-900 font-medium">{item.costPerUnit ? `${getCurrencySymbol(item.currency || 'USD')}${item.costPerUnit}` : '-'}</td>
                      <td className="p-3 flex justify-center gap-3">
                        <button type="button" onClick={() => {setEditingInventoryId(item.id); setInventoryForm({...item, currency: item.currency || 'ISK'});}} className="p-2 text-blue-700 hover:bg-blue-100 rounded-lg"><Pencil size={18}/></button>
                        <button type="button" onClick={() => deleteInventoryItem(item.id)} className="p-2 text-red-700 hover:bg-red-100 rounded-lg"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add/Edit Stock Form */}
            <form onSubmit={handleInventorySubmit} className="bg-[#C8C2BA] p-6 rounded-2xl border-2 border-[#8A2A2B]/20 space-y-4 shadow-inner mb-12">
              <h3 className="font-black text-[#8A2A2B] uppercase text-sm tracking-widest flex items-center gap-2">
                {editingInventoryId ? <><Pencil size={18}/> Modify Item</> : <><Plus size={18}/> Add New Stock</>}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Item Name (e.g. Juniper, 750ml Bottle)" value={inventoryForm.name} onChange={e => setInventoryForm({...inventoryForm, name: e.target.value})} className={inputField} required />
                <select value={inventoryForm.type} onChange={e => setInventoryForm({...inventoryForm, type: e.target.value})} className={inputField} required>
                  <option value="ingredient">Ingredient</option>
                  <option value="bottling_material">Bottling Material</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.01" placeholder="Quantity" value={inventoryForm.quantity} onChange={e => setInventoryForm({...inventoryForm, quantity: e.target.value})} className={inputField} required />
                <select value={inventoryForm.unit} onChange={e => setInventoryForm({...inventoryForm, unit: e.target.value})} className={inputField} required>
                  <option value="">Unit</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="ml">ml</option>
                  <option value="units">units</option>
                </select>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex space-x-1">
                  <input type="number" step="0.01" placeholder="Cost per Unit" value={inventoryForm.costPerUnit} onChange={e => setInventoryForm({...inventoryForm, costPerUnit: e.target.value})} className={`${inputField} w-2/3`} />
                  <select value={inventoryForm.currency} onChange={e => setInventoryForm({...inventoryForm, currency: e.target.value})} className={`${inputField} w-1/3 px-1`}>
                    <option value="ISK">kr</option>
                    <option value="USD">$</option>
                    <option value="EUR">€</option>
                    <option value="GBP">£</option>
                  </select>
                </div>
                <input type="text" placeholder="Current Lot # (Optional)" value={inventoryForm.currentLot} onChange={e => setInventoryForm({...inventoryForm, currentLot: e.target.value})} className={inputField} />
                <input type="number" step="0.01" placeholder="Alert Level" value={inventoryForm.lowStockThreshold} onChange={e => setInventoryForm({...inventoryForm, lowStockThreshold: e.target.value})} className={inputField} required />
                <input type="number" placeholder="Lead Days" value={inventoryForm.leadTimeDays} onChange={e => setInventoryForm({...inventoryForm, leadTimeDays: e.target.value})} className={inputField} required />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className={button + " flex-1 uppercase tracking-tighter"}>{editingInventoryId ? "Confirm Changes" : "Register Stock"}</button>
                {editingInventoryId && <button type="button" onClick={() => {setEditingInventoryId(null); setInventoryForm({name:'', type:'ingredient', quantity:'', unit:'', lowStockThreshold:'', leadTimeDays:'', costPerUnit: '', currency: 'ISK', currentLot: ''});}} className="bg-gray-500 text-white p-3 rounded-xl"><X /></button>}
              </div>
            </form>

            <hr className="border-[#B5AE9F] mb-8" />

            {/* Recipes & Materials Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Recipe Creator */}
              <div className="bg-[#E0D8D0] rounded-2xl">
                <h3 className="text-xl font-bold mb-4 flex items-center text-[#8A2A2B]"><NotebookPen size={20} className="mr-2"/> Recipe Builder</h3>
                <div className="bg-white/40 rounded-xl p-4 mb-4 max-h-48 overflow-y-auto border border-[#B5AE9F]">
                  <h4 className="font-bold text-sm opacity-70 mb-2">Current Recipes</h4>
                  {recipes.map(r => (
                    <div key={r.id} className="flex justify-between items-center text-sm py-2 border-b border-[#B5AE9F]/50">
                      <span>{r.name}</span>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => startEditingRecipe(r)} className="text-blue-700 hover:text-blue-900"><Pencil size={16}/></button>
                        <button type="button" onClick={() => deleteRecipeItem(r.id)} className="text-red-700 hover:text-red-900"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddRecipe} className="space-y-4">
                  <input type="text" placeholder="Recipe Name" value={recipeForm.name} onChange={e => setRecipeForm({...recipeForm, name: e.target.value})} className={inputField} required />
                  <div className="bg-[#C8C2BA]/50 p-4 rounded-xl space-y-3">
                    <p className="font-bold text-sm">Ingredients:</p>
                    {recipeForm.ingredients.map((ing, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <select value={ing.name} onChange={e => { const n = [...recipeForm.ingredients]; n[i].name = e.target.value; setRecipeForm({...recipeForm, ingredients: n}); }} className={inputField} required>
                           <option value="">Select Ingredient...</option>
                           {inventory.filter(inv => inv.type === 'ingredient').map(inv => (
                             <option key={inv.id} value={inv.name}>{inv.name}</option>
                           ))}
                        </select>
                        <input type="number" step="0.01" placeholder="Qty" value={ing.quantity} onChange={e => { const n = [...recipeForm.ingredients]; n[i].quantity = e.target.value; setRecipeForm({...recipeForm, ingredients: n}); }} className={`${inputField} w-20`} required />
                        <select value={ing.unit || ''} onChange={e => { const n = [...recipeForm.ingredients]; n[i].unit = e.target.value; setRecipeForm({...recipeForm, ingredients: n}); }} className={`${inputField} w-24`} required>
                           <option value="">Unit</option>
                           <option value="kg">kg</option>
                           <option value="g">g</option>
                           <option value="L">L</option>
                           <option value="ml">ml</option>
                           <option value="units">units</option>
                        </select>
                        <button type="button" onClick={() => { const n = [...recipeForm.ingredients]; n.splice(i, 1); setRecipeForm({...recipeForm, ingredients: n}); }} className="text-red-700 hover:text-red-900"><Trash2 size={20}/></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setRecipeForm({...recipeForm, ingredients: [...recipeForm.ingredients, {name:'', quantity:'', unit:''}]})} className="text-[#8A2A2B] text-sm font-bold">+ Add Ingredient</button>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className={button + " w-full text-sm"}>
                      {editingRecipeId ? "Update Recipe" : "Save Recipe"}
                    </button>
                    {editingRecipeId && (
                      <button type="button" onClick={() => {setEditingRecipeId(null); setRecipeForm({ name: '', product: '', ingredients: [{ name: '', quantity: '', unit: '' }] });}} className="bg-gray-500 text-white p-3 rounded-xl"><X size={20}/></button>
                    )}
                  </div>
                </form>
              </div>

              {/* Bottling Materials Definer */}
              <div className="bg-[#E0D8D0] rounded-2xl">
                <h3 className="text-xl font-bold mb-4 flex items-center text-[#8A2A2B]"><Plus size={20} className="mr-2"/> Bottling Profiles</h3>
                <div className="bg-white/40 rounded-xl p-4 mb-4 max-h-48 overflow-y-auto border border-[#B5AE9F]">
                  <h4 className="font-bold text-sm opacity-70 mb-2">Saved Profiles</h4>
                  {bottlingMaterialDefinitions.map(m => (
                    <div key={m.id} className="flex justify-between items-center text-sm py-2 border-b border-[#B5AE9F]/50">
                      <span>{m.name}</span>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => startEditingProfile(m)} className="text-blue-700 hover:text-blue-900"><Pencil size={16}/></button>
                        <button type="button" onClick={() => deleteProfileItem(m.id)} className="text-red-700 hover:text-red-900"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddBottlingMaterials} className="space-y-4">
                  <input type="text" placeholder="Profile Name (e.g. Standard 750ml)" value={bottlingMaterialsForm.name} onChange={e => setBottlingMaterialsForm({...bottlingMaterialsForm, name: e.target.value})} className={inputField} required />
                  <div className="bg-[#C8C2BA]/50 p-4 rounded-xl space-y-3">
                    <p className="font-bold text-sm">Materials required per 1 unit:</p>
                    {bottlingMaterialsForm.materials.map((mat, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <select value={mat.name} onChange={e => { const n = [...bottlingMaterialsForm.materials]; n[i].name = e.target.value; setBottlingMaterialsForm({...bottlingMaterialsForm, materials: n}); }} className={inputField} required>
                           <option value="">Select Material...</option>
                           {inventory.filter(inv => inv.type === 'bottling_material').map(inv => (
                             <option key={inv.id} value={inv.name}>{inv.name}</option>
                           ))}
                        </select>
                        <input type="number" step="0.01" placeholder="Qty" value={mat.quantity} onChange={e => { const n = [...bottlingMaterialsForm.materials]; n[i].quantity = e.target.value; setBottlingMaterialsForm({...bottlingMaterialsForm, materials: n}); }} className={`${inputField} w-20`} required />
                        <select value={mat.unit || ''} onChange={e => { const n = [...bottlingMaterialsForm.materials]; n[i].unit = e.target.value; setBottlingMaterialsForm({...bottlingMaterialsForm, materials: n}); }} className={`${inputField} w-24`} required>
                           <option value="">Unit</option>
                           <option value="kg">kg</option>
                           <option value="g">g</option>
                           <option value="L">L</option>
                           <option value="ml">ml</option>
                           <option value="units">units</option>
                        </select>
                        <button type="button" onClick={() => { const n = [...bottlingMaterialsForm.materials]; n.splice(i, 1); setBottlingMaterialsForm({...bottlingMaterialsForm, materials: n}); }} className="text-red-700 hover:text-red-900"><Trash2 size={20}/></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setBottlingMaterialsForm({...bottlingMaterialsForm, materials: [...bottlingMaterialsForm.materials, {name:'', quantity:'', unit:''}]})} className="text-[#8A2A2B] text-sm font-bold">+ Add Material</button>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className={button + " w-full text-sm"}>
                      {editingProfileId ? "Update Profile" : "Save Profile"}
                    </button>
                    {editingProfileId && (
                      <button type="button" onClick={() => {setEditingProfileId(null); setBottlingMaterialsForm({ name: '', materials: [{ name: '', quantity: '', unit: '' }] });}} className="bg-gray-500 text-white p-3 rounded-xl"><X size={20}/></button>
                    )}
                  </div>
                </form>
              </div>

            </div>
          </div>
        )}

        {/* --- LOG HISTORY --- */}
        {view === 'logHistory' && (
          <div className={card}>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-[#8A2A2B]">Batch History</h2>
                <select
                  value={historyFilter}
                  onChange={(e) => { setHistoryFilter(e.target.value); setCurrentPage(1); setExpandedLogId(null); }}
                  className="bg-[#C8C2BA]/50 text-[#4E3629] p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8A2A2B] font-semibold text-sm cursor-pointer border border-[#B5AE9F]"
                >
                  <option value="All">All Recipes & Products</option>
                  {uniqueFilters.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <button onClick={exportPDF} className="p-2 bg-[#4E3629] text-white rounded-lg flex items-center gap-2 text-xs font-bold"><FileDown size={16}/> EXPORT PDF</button>
            </div>
            <div className="overflow-x-auto" id="logs-table">
              <table className="w-full bg-white/40 rounded-xl overflow-hidden shadow-inner border border-[#B5AE9F]">
                <thead className={tableHeader}>
                  <tr className="text-[10px] uppercase tracking-tighter">
                    <th className="p-4">Type</th><th className="p-4">Date</th><th className="p-4">Recipe/Product</th><th className="p-4">Yield</th><th className="p-4">ABV/Lot</th><th className="p-4 text-right">Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLogs.map(log => {
                    const displayCogs = log.cogsISK !== undefined ? convertCurrency(parseFloat(log.cogsISK), 'ISK', displayCurrency) : convertCurrency(parseFloat(log.cogs || 0), 'USD', displayCurrency);
                    return (
                    <React.Fragment key={log.id}>
                      <tr 
                        className={`${tableRow} cursor-pointer hover:bg-[#C8C2BA]/60 transition-all ${expandedLogId === log.id ? 'bg-[#C8C2BA]/40' : ''}`}
                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                      >
                        <td className="p-4"><span className={`text-[9px] font-black ${log.type === 'distillation' ? 'bg-[#8A2A2B]' : 'bg-[#4E3629]'} text-white px-2 py-1 rounded-full`}>{log.type.toUpperCase()}</span></td>
                        <td className="p-4 text-xs font-medium">{new Date(log.date).toLocaleDateString()}</td>
                        <td className="p-4 font-bold text-sm">{log.recipeName || log.product}</td>
                        <td className="p-4 text-sm font-medium">{log.distillateAmount || log.bottledAmount} {log.type === 'distillation' ? 'L' : 'U'}</td>
                        <td className="p-4 text-sm font-medium">{log.distillateABV ? log.distillateABV + '%' : log.lotNumber || '-'}</td>
                        <td className="p-4 flex justify-end gap-2 items-center">
                          <button type="button" onClick={(e) => { e.stopPropagation(); startEditingLog(log); }} className="p-2 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"><Pencil size={18}/></button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); deleteLogItem(log); }} className="p-2 text-red-700 hover:bg-red-200 rounded-lg transition-colors"><Trash2 size={18}/></button>
                          {expandedLogId === log.id ? <ChevronUp size={20} className="text-[#4E3629] ml-2"/> : <ChevronDown size={20} className="text-[#4E3629] ml-2"/>}
                        </td>
                      </tr>
                      {expandedLogId === log.id && (
                        <tr className="bg-[#E0D8D0] border-b-2 border-[#B5AE9F] shadow-inner">
                          <td colSpan="6" className="p-6">
                            {log.type === 'distillation' ? (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-8 text-sm text-[#4E3629]">
                                <div><span className="block text-[10px] uppercase font-bold opacity-60 flex items-center gap-1"><Droplet size={12}/> LAA Generated</span> <span className="text-green-800 font-black">{log.laa || 0} L</span></div>
                                <div><span className="block text-[10px] uppercase font-bold opacity-60 flex items-center gap-1"><DollarSign size={12}/> Est. Batch Cost</span> <span className="text-green-800 font-black">{getCurrencySymbol(displayCurrency)}{displayCogs.toFixed(2)} {displayCurrency}</span></div>
                                <div className="md:col-span-2"></div>
                                
                                <div><span className="block text-[10px] uppercase font-bold opacity-60 mt-4 border-t border-[#B5AE9F]/30 pt-2">Start Time</span> {log.distillationStart || '-'}</div>
                                <div><span className="block text-[10px] uppercase font-bold opacity-60 mt-4 border-t border-[#B5AE9F]/30 pt-2">Power Level</span> {log.powerLevel || '-'}</div>
                                <div><span className="block text-[10px] uppercase font-bold opacity-60 mt-4 border-t border-[#B5AE9F]/30 pt-2">Ethanol Into Still</span> {log.ethanolAmount || '0'} L</div>
                                <div><span className="block text-[10px] uppercase font-bold opacity-60 mt-4 border-t border-[#B5AE9F]/30 pt-2">Water Into Still</span> {log.waterIntoStill || '0'} L</div>
                                
                                <div><span className="block text-[10px] uppercase font-bold opacity-60">Heads Start</span> {log.headsCollectionStart || '-'}</div>
                                <div><span className="block text-[10px] uppercase font-bold opacity-60">Hearts Start</span> {log.heartsCollectionStart || '-'}</div>
                                <div><span className="block text-[10px] uppercase font-bold opacity-60">Hearts Stop</span> {log.heartsCollectionStop || '-'}</div>
                                <div><span className="block text-[10px] uppercase font-bold opacity-60">Tails Duration</span> {log.tailsDuration || '0'} min</div>
                                
                                <div><span className="block text-[10px] uppercase font-bold opacity-60">Lower Plate</span> {log.lowerPlateOn ? 'ON' : 'OFF'}</div>
                                <div><span className="block text-[10px] uppercase font-bold opacity-60">Upper Plate</span> {log.upperPlateOn ? 'ON' : 'OFF'}</div>
                                <div><span className="block text-[10px] uppercase font-bold opacity-60">Dephlegmator</span> {log.dephlegmatorOn ? 'ON' : 'OFF'}</div>
                                
                                <div className="col-span-2 md:col-span-4 mt-2 pt-2 border-t border-[#B5AE9F]/30"><span className="block text-[10px] uppercase font-bold opacity-60">Notes</span> <span className="italic">{log.notes || 'No notes provided.'}</span></div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-8 text-sm text-[#4E3629]">
                                <div><span className="block text-[10px] uppercase font-bold opacity-60 text-[#8A2A2B]">Liquid Source</span> <span className="font-black capitalize">{log.source === 'barrel' ? `Barrel` : 'Tank/IBC'}</span></div>
                                <div><span className="block text-[10px] uppercase font-bold opacity-60 text-[#8A2A2B]">Volume Drawn</span> <span className="font-black">{log.volumeDrawn || 0} L</span></div>
                                <div className="md:col-span-2"></div>
                                
                                <div><span className="block text-[10px] uppercase font-bold opacity-60 mt-4 border-t border-[#B5AE9F]/30 pt-2">Bottling Time</span> {log.bottlingStartTime || '-'}</div>
                                <div><span className="block text-[10px] uppercase font-bold opacity-60 mt-4 border-t border-[#B5AE9F]/30 pt-2">Boxes Used</span> {log.boxesUsed || '0'}</div>
                                <div className="col-span-2 md:col-span-4 mt-2 pt-2 border-t border-[#B5AE9F]/30"><span className="block text-[10px] uppercase font-bold opacity-60">Notes</span> <span className="italic">{log.notes || 'No notes provided.'}</span></div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )})}
                  {currentLogs.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-[#4E3629]/60 italic font-medium">No logs found for this selection.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-6 bg-[#C8C2BA]/50 p-2 rounded-xl">
              <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 disabled:opacity-20 bg-white/50 rounded-lg transition-opacity"><ChevronLeft size={20}/></button>
              <span className="text-xs font-black uppercase tracking-widest text-[#8A2A2B]">Page {currentPage} / {totalPages || 1}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages || totalPages === 0} className="p-2 disabled:opacity-20 bg-white/50 rounded-lg transition-opacity"><ChevronRight size={20}/></button>
            </div>
          </div>
        )}
      </main>

      {showNotificationModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[70] animate-in fade-in duration-300">
          <div className="bg-[#F4EFEA] p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border-t-8 border-[#8A2A2B]">
            <p className="text-lg font-black text-[#4E3629] mb-6">{notificationMessage}</p>
            <button type="button" onClick={() => setShowNotificationModal(false)} className={button + " w-full"}>DISMISS</button>
          </div>
        </div>
      )}

      {/* Low Stock Initial Alert Modal */}
      {showLowStockModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] animate-in fade-in duration-300">
          <div className="bg-[#E0D8D0] p-8 rounded-3xl shadow-2xl max-w-md w-full border-t-8 border-red-700">
            <h3 className="text-2xl font-black mb-4 text-red-800 flex items-center gap-2">
              <Archive size={28}/> Low Stock Alert
            </h3>
            <p className="text-[#4E3629] mb-4 font-medium leading-relaxed">
              The following items are running below your designated safety thresholds:
            </p>
            <div className="max-h-48 overflow-y-auto mb-6 pr-2 space-y-2">
              {inventory.filter(i => i.quantity <= i.lowStockThreshold).map(i => (
                <div key={i.id} className="flex justify-between items-center bg-white/50 p-3 rounded-xl border border-red-800/20">
                  <span className="font-bold text-[#4E3629]">{i.name}</span>
                  <span className="bg-red-700 text-white px-2 py-1 rounded text-xs font-black">{parseFloat(i.quantity).toFixed(2)} / {i.lowStockThreshold} {i.unit}</span>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setShowLowStockModal(false)} className={button + " w-full"}>Acknowledge</button>
          </div>
        </div>
      )}
    </div>
  );
}
