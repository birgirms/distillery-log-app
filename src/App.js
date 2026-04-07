import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, addDoc, onSnapshot, collection, query, updateDoc, deleteDoc } from 'firebase/firestore';
import { Archive, FlaskConical, GlassWater, NotebookPen, Home, Plus, Trash2, LoaderCircle, List, ChevronLeft, ChevronRight, FileDown, Pencil, X, LogIn, LogOut, ChevronDown, ChevronUp } from 'lucide-react';

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
const tableHeader = "bg-[#C8C2BA] text-left text-[#4E3629] font-semibold";
const tableRow = "border-t border-[#B5AE9F] hover:bg-[#C8C2BA] transition-colors";
const tableCell = "py-3 px-4 text-sm";
const paginationButton = "px-4 py-2 mx-1 rounded-full bg-[#C8C2BA] hover:bg-[#8A2A2B] hover:text-[#F4EFEA] text-[#4E3629]";

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

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [view, setView] = useState('dashboard');
  const [recipes, setRecipes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [distillationLogs, setDistillationLogs] = useState([]);
  const [bottlingLogs, setBottlingLogs] = useState([]);
  const [combinedLogs, setCombinedLogs] = useState([]);
  const [bottlingMaterialDefinitions, setBottlingMaterialDefinitions] = useState([]);
  
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  
  const [editingInventoryId, setEditingInventoryId] = useState(null);
  const [editingLogId, setEditingLogId] = useState(null);
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [editingProfileId, setEditingProfileId] = useState(null);
  
  const [authError, setAuthError] = useState("");

  // HARDCODED ADMIN EMAIL
  const ADMIN_EMAIL = "birgir@thoran.is"; 

  // --- FORMS STATE ---
  const [inventoryForm, setInventoryForm] = useState({
    name: '', type: 'ingredient', quantity: '', unit: '', lowStockThreshold: '', leadTimeDays: ''
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
    boxesUsed: '', lotNumber: '', notes: '', bottlingMaterialDefinition: ''
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

  // --- UNIT CONVERSION HELPER ---
  const convertQuantity = (qty, fromUnit, toUnit) => {
    if (!fromUnit || !toUnit) return qty;
    const from = fromUnit.toLowerCase().trim();
    const to = toUnit.toLowerCase().trim();
    if (from === to) return qty;

    // Weight conversions
    if ((from === 'g' || from === 'gr') && to === 'kg') return qty / 1000;
    if (from === 'kg' && (to === 'g' || to === 'gr')) return qty * 1000;

    // Volume conversions
    if (from === 'ml' && to === 'l') return qty / 1000;
    if (from === 'l' && to === 'ml') return qty * 1000;

    return qty; // Default fallback to 1:1 if conversion not mapped
  };

  // --- AUTH LISTENER ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // --- DATA LISTENERS ---
  useEffect(() => {
    if (user) {
      const pId = 'distillation-app';
      const uId = user.uid;

      const unsubInventory = onSnapshot(collection(db, 'artifacts', pId, 'users', uId, 'inventory'), (snapshot) => {
        setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
        unsubInventory(); unsubRecipes(); unsubMaterials(); unsubDistLogs(); unsubBotLogs();
      };
    }
  }, [user]);

  useEffect(() => {
    const combined = [...distillationLogs, ...bottlingLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
    setCombinedLogs(combined);
  }, [distillationLogs, bottlingLogs]);

  // --- LOGIN LOGIC ---
  const handleLogin = async () => {
    setAuthError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      
      // Enforce Admin Email
      if (result.user.email !== ADMIN_EMAIL) {
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

  // --- INVENTORY MANAGEMENT (Add/Edit/Delete) ---
  const handleInventorySubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    const data = {
      ...inventoryForm,
      quantity: parseFloat(inventoryForm.quantity) || 0,
      lowStockThreshold: parseFloat(inventoryForm.lowStockThreshold) || 0,
      leadTimeDays: parseInt(inventoryForm.leadTimeDays, 10) || 0
    };
    try {
      if (editingInventoryId) {
        await updateDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'inventory', editingInventoryId), data);
        showNotification("Item Updated Successfully");
      } else {
        await addDoc(collection(db, 'artifacts', 'distillation-app', 'users', user.uid, 'inventory'), data);
        showNotification("Item Added Successfully");
      }
      setInventoryForm({ name: '', type: 'ingredient', quantity: '', unit: '', lowStockThreshold: '', leadTimeDays: '' });
      setEditingInventoryId(null);
    } catch (err) { 
      console.error("Inventory Save Error:", err);
      showNotification(`Error saving item: ${err.message}`); 
    }
  };

  const deleteInventoryItem = async (id) => {
    if (!user) return;
    if (window.confirm("Are you sure you want to permanently delete this item?")) {
      try {
        await deleteDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'inventory', id));
        showNotification("Item Deleted Permanently");
      } catch(err) {
        console.error("Delete Error:", err);
        showNotification(`Error deleting item: ${err.message}`);
      }
    }
  };

  // --- RECIPES & MATERIALS DEFINITIONS (Add/Edit/Delete) ---
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
    } catch (err) { 
      console.error("Recipe Save Error:", err);
      showNotification(`Error saving recipe: ${err.message}`); 
    }
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
    setRecipeForm({
      name: recipe.name || '',
      product: recipe.product || '',
      ingredients: recipe.ingredients || [{ name: '', quantity: '', unit: '' }]
    });
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
        showNotification(`Material profile "${payload.name}" saved!`);
      }
      setBottlingMaterialsForm({ name: '', materials: [{ name: '', quantity: '', unit: '' }] });
    } catch (err) { 
      console.error("Material Save Error:", err);
      showNotification(`Error saving materials: ${err.message}`); 
    }
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
    setBottlingMaterialsForm({
      name: profile.name || '',
      materials: profile.materials || [{ name: '', quantity: '', unit: '' }]
    });
  };


  // --- LOG SUBMISSIONS & DEDUCTIONS ---
  const handleLogSubmit = async (e, type) => {
    e.preventDefault();
    if (!user) return;
    const path = type === 'distillation' ? 'distillationLogs' : 'bottlingLogs';
    
    // Strict parsing to ensure numbers process correctly for deductions
    const formToSave = type === 'distillation' ? { 
      ...distillationForm,
      distillateAmount: parseFloat(distillationForm.distillateAmount) || 0,
      ethanolAmount: parseFloat(distillationForm.ethanolAmount) || 0,
      waterIntoStill: parseFloat(distillationForm.waterIntoStill) || 0
    } : { 
      ...bottlingForm,
      bottledAmount: parseInt(bottlingForm.bottledAmount, 10) || 0,
      boxesUsed: Math.floor((parseInt(bottlingForm.bottledAmount, 10) || 0) / 6)
    };

    try {
      if (editingLogId) {
        // Update existing log without re-deducting inventory
        await updateDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, path, editingLogId), formToSave);
        showNotification("Log Updated Successfully");
        setEditingLogId(null);
      } else {
        // Add new log
        await addDoc(collection(db, 'artifacts', 'distillation-app', 'users', user.uid, path), {
          ...formToSave, timestamp: new Date()
        });
        showNotification("Log Saved Successfully! Inventory Deducted.");

        // Automatic Inventory Deduction (Only on NEW logs)
        if (type === 'distillation') {
          const recipe = recipes.find(r => r.name === distillationForm.recipeName);
          if (recipe) {
            for (const ingredient of recipe.ingredients) {
              const invItem = inventory.find(i => i.name === ingredient.name);
              if (invItem) {
                // Apply unit conversion (e.g. recipe specifies 350g, inventory is stored in kg => deduct 0.35)
                const deductionQty = convertQuantity(parseFloat(ingredient.quantity) || 0, ingredient.unit, invItem.unit);
                const newQuantity = (invItem.quantity || 0) - deductionQty;
                await updateDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'inventory', invItem.id), {
                  quantity: newQuantity > 0 ? newQuantity : 0,
                });
              }
            }
          }
        } else {
          const matDef = bottlingMaterialDefinitions.find(def => def.name === bottlingForm.product);
          if (matDef) {
            for (const mat of matDef.materials) {
              const invItem = inventory.find(item => item.name === mat.name && item.type === 'bottling_material');
              if (invItem) {
                const deductionPerBottle = convertQuantity(parseFloat(mat.quantity) || 0, mat.unit, invItem.unit);
                const deductionAmount = deductionPerBottle * formToSave.bottledAmount;
                const newQuantity = (invItem.quantity || 0) - deductionAmount;
                await updateDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'inventory', invItem.id), {
                  quantity: newQuantity > 0 ? newQuantity : 0,
                });
              }
            }
          }
        }
      }

      // Reset forms
      if (type === 'distillation') {
        setDistillationForm(emptyDistillationForm);
      } else {
        setBottlingForm(emptyBottlingForm);
      }
    } catch (err) { 
      console.error("Log Save Error:", err);
      showNotification(`Error saving log: ${err.message}`); 
    }
  };

  const deleteLogItem = async (log) => {
    if (!user) return;
    if (window.confirm("Are you sure you want to permanently delete this batch log? The materials/ingredients used will be returned to your inventory.")) {
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
                const newQuantity = (invItem.quantity || 0) + restoredQty;
                await updateDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'inventory', invItem.id), {
                  quantity: newQuantity,
                });
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
                const deductionAmount = deductionPerBottle * (parseInt(log.bottledAmount, 10) || 0);
                const newQuantity = (invItem.quantity || 0) + deductionAmount;
                await updateDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, 'inventory', invItem.id), {
                  quantity: newQuantity,
                });
              }
            }
          }
        }

        // Delete the actual log document
        await deleteDoc(doc(db, 'artifacts', 'distillation-app', 'users', user.uid, path, log.id));
        showNotification("Batch Log Deleted and Inventory Restocked.");
      } catch(err) {
        console.error("Delete Error:", err);
        showNotification(`Error deleting log: ${err.message}`);
      }
    }
  };

  const startEditingLog = (log) => {
    setExpandedLogId(null);
    setEditingLogId(log.id);
    if (log.type === 'distillation') {
      setDistillationForm(log);
      setView('distillation');
    } else {
      setBottlingForm(log);
      setView('bottling');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Pre-calculate filtered logs so the export logic can access them
  const filteredLogs = combinedLogs.filter(log => {
    if (historyFilter === 'All') return true;
    const name = log.recipeName || log.product;
    return name === historyFilter;
  });

  const currentLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const uniqueFilters = Array.from(new Set(combinedLogs.map(l => l.recipeName || l.product).filter(Boolean)));

  // --- PDF EXPORT ENGINE ---
  const exportPDF = () => {
    if (!window.html2pdf) {
      showNotification("PDF Library not loaded yet.");
      return;
    }

    // 1. Create a hidden container for the clean "Excel-like" grid
    const printContainer = document.createElement('div');
    printContainer.style.padding = '20px';
    printContainer.style.fontFamily = 'Helvetica, Arial, sans-serif';
    printContainer.style.color = '#333';

    // 2. Add a clean title
    const title = document.createElement('h2');
    title.innerText = `Distillery Batch Report - ${historyFilter === 'All' ? 'All Logs' : historyFilter}`;
    title.style.borderBottom = '2px solid #8A2A2B';
    title.style.paddingBottom = '10px';
    title.style.marginBottom = '20px';
    printContainer.appendChild(title);

    // 3. Build the comprehensive HTML table string
    let tableHtml = `
      <table style="width: 100%; border-collapse: collapse; font-size: 9px; text-align: left;">
        <thead>
          <tr style="background-color: #f3f4f6; color: #4E3629;">
            <th style="padding: 6px; border: 1px solid #d1d5db;">Type</th>
            <th style="padding: 6px; border: 1px solid #d1d5db;">Date & Time</th>
            <th style="padding: 6px; border: 1px solid #d1d5db;">Recipe / Product</th>
            <th style="padding: 6px; border: 1px solid #d1d5db;">Yield & Result</th>
            <th style="padding: 6px; border: 1px solid #d1d5db;">Power & Plates</th>
            <th style="padding: 6px; border: 1px solid #d1d5db;">Charge Details</th>
            <th style="padding: 6px; border: 1px solid #d1d5db;">Collection Times</th>
            <th style="padding: 6px; border: 1px solid #d1d5db;">Notes</th>
          </tr>
        </thead>
        <tbody>
    `;

    // 4. Populate rows using ALL filtered logs, not just the paginated ones
    filteredLogs.forEach(log => {
      const isDistill = log.type === 'distillation';
      const date = new Date(log.date).toLocaleDateString();
      const time = isDistill ? log.distillationStart : log.bottlingStartTime;
      const dateTime = `${date} ${time || ''}`;
      
      const name = log.recipeName || log.product || '-';
      
      const yieldStr = isDistill 
        ? `${log.distillateAmount || 0} L @ ${log.distillateABV || 0}%` 
        : `${log.bottledAmount || 0} Units (Lot: ${log.lotNumber || '-'})`;
        
      const powerPlates = isDistill
        ? `Power: ${log.powerLevel || '-'}<br/>Plates: L:${log.lowerPlateOn?'Y':'N'} U:${log.upperPlateOn?'Y':'N'} D:${log.dephlegmatorOn?'Y':'N'}`
        : '-';
        
      const charge = isDistill
        ? `Eth: ${log.ethanolAmount || 0}L<br/>H2O: ${log.waterIntoStill || 0}L<br/>ABV: ${log.abvOfCharge || 0}%`
        : `Boxes: ${log.boxesUsed || 0}`;
        
      const cuts = isDistill
        ? `Heads: ${log.headsCollectionStart||'-'}<br/>Hearts: ${log.heartsCollectionStart||'-'} to ${log.heartsCollectionStop||'-'}<br/>Tails: ${log.tailsDuration||'0'}m`
        : '-';

      tableHtml += `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 6px; border: 1px solid #d1d5db; font-weight: bold; text-transform: uppercase;">${log.type}</td>
          <td style="padding: 6px; border: 1px solid #d1d5db;">${dateTime}</td>
          <td style="padding: 6px; border: 1px solid #d1d5db; font-weight: bold;">${name}</td>
          <td style="padding: 6px; border: 1px solid #d1d5db;">${yieldStr}</td>
          <td style="padding: 6px; border: 1px solid #d1d5db;">${powerPlates}</td>
          <td style="padding: 6px; border: 1px solid #d1d5db;">${charge}</td>
          <td style="padding: 6px; border: 1px solid #d1d5db;">${cuts}</td>
          <td style="padding: 6px; border: 1px solid #d1d5db; max-width: 150px;">${log.notes || '-'}</td>
        </tr>
      `;
    });

    tableHtml += `</tbody></table>`;
    printContainer.innerHTML += tableHtml;

    // 5. Fire off the PDF generator
    const opt = {
      margin:       0.4,
      filename:     `Distillery_Report_${historyFilter.replace(/[^a-z0-9]/gi, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
    };

    window.html2pdf().from(printContainer).set(opt).save();
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
          <span className="font-bold text-[#8A2A2B] truncate mr-4">{user.email}</span>
          <button onClick={handleLogout} className="text-red-800 hover:text-red-600 flex items-center gap-1 text-sm font-black whitespace-nowrap">
            <LogOut size={16} /> LOGOUT
          </button>
        </div>
        <nav className="flex bg-[#E0D8D0] rounded-2xl p-2 shadow-xl overflow-x-auto gap-1">
          <button onClick={() => setView('dashboard')} className={`${tabButton} ${view === 'dashboard' ? activeTab : inactiveTab}`}><Home size={18} className="mr-1"/>Home</button>
          <button onClick={() => {setView('distillation'); setEditingLogId(null); setDistillationForm(emptyDistillationForm);}} className={`${tabButton} ${view === 'distillation' ? activeTab : inactiveTab}`}><FlaskConical size={18} className="mr-1"/>Log Run</button>
          <button onClick={() => {setView('bottling'); setEditingLogId(null); setBottlingForm(emptyBottlingForm);}} className={`${tabButton} ${view === 'bottling' ? activeTab : inactiveTab}`}><GlassWater size={18} className="mr-1"/>Bottling</button>
          <button onClick={() => setView('inventory')} className={`${tabButton} ${view === 'inventory' ? activeTab : inactiveTab}`}><Archive size={18} className="mr-1"/>Inventory</button>
          <button onClick={() => setView('logHistory')} className={`${tabButton} ${view === 'logHistory' ? activeTab : inactiveTab}`}><List size={18} className="mr-1"/>History</button>
        </nav>
      </header>

      <main className="w-full max-w-4xl">
        {/* --- DASHBOARD --- */}
        {view === 'dashboard' && (
          <div className="space-y-6">
            <div className={card}>
              <h1 className="text-3xl font-black mb-4 text-[#8A2A2B]">Distillery Dashboard</h1>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-[#8A2A2B] p-4 rounded-xl text-white shadow-lg text-center">
                  <p className="text-3xl font-bold">{distillationLogs.length}</p>
                  <p className="text-xs uppercase font-bold opacity-90 tracking-widest mt-1">Distillations</p>
                </div>
                <div className="bg-[#8A2A2B] p-4 rounded-xl text-white shadow-lg text-center">
                  <p className="text-3xl font-bold">{bottlingLogs.length}</p>
                  <p className="text-xs uppercase font-bold opacity-90 tracking-widest mt-1">Bottlings</p>
                </div>
                <div className="bg-[#8A2A2B] p-4 rounded-xl text-white shadow-lg text-center">
                  <p className="text-3xl font-bold">{inventory.length}</p>
                  <p className="text-xs uppercase font-bold opacity-90 tracking-widest mt-1">Stock Items</p>
                </div>
              </div>
            </div>
            {inventory.some(i => i.quantity <= i.lowStockThreshold) && (
              <div className={notificationBox}>
                <h3 className="font-bold mb-2 flex items-center gap-2"><Archive size={18}/> Urgent: Low Stock</h3>
                {inventory.filter(i => i.quantity <= i.lowStockThreshold).map(i => (
                  <div key={i.id} className={lowStockItem}>
                    <span className="font-bold">{i.name}</span>
                    <span className="bg-white/20 px-2 py-1 rounded text-sm">{i.quantity} / {i.lowStockThreshold} {i.unit}</span>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 opacity-70 ml-1">Total Bottles</label>
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

        {/* --- INVENTORY MANAGER (Includes Recipes & Definitions) --- */}
        {view === 'inventory' && (
          <div className={card}>
            <h2 className="text-3xl font-black mb-6 text-[#8A2A2B] flex items-center gap-2"><Archive size={28}/> Full Inventory Hub</h2>
            
            {/* Stock List */}
            <div className="overflow-x-auto mb-8 bg-white/40 rounded-2xl p-2 border border-[#B5AE9F]">
              <h3 className="font-bold text-lg p-2 ml-2 text-[#4E3629]">Current Stock</h3>
              <table className="w-full">
                <thead><tr className={tableHeader}><th className="p-3">Item</th><th className="p-3">Type</th><th className="p-3">Stock Level</th><th className="p-3 text-center">Manage</th></tr></thead>
                <tbody>
                  {inventory.map(item => (
                    <tr key={item.id} className={tableRow}>
                      <td className="p-3 font-bold">{item.name}</td>
                      <td className="p-3 capitalize">{item.type.replace('_', ' ')}</td>
                      <td className={`p-3 ${item.quantity <= item.lowStockThreshold ? 'text-red-700 font-black' : ''}`}>{parseFloat(item.quantity).toFixed(2)} {item.unit}</td>
                      <td className="p-3 flex justify-center gap-3">
                        <button type="button" onClick={() => {setEditingInventoryId(item.id); setInventoryForm(item);}} className="p-2 text-blue-700 hover:bg-blue-100 rounded-lg"><Pencil size={18}/></button>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <input type="number" step="0.01" placeholder="Quantity" value={inventoryForm.quantity} onChange={e => setInventoryForm({...inventoryForm, quantity: e.target.value})} className={inputField} required />
                <select value={inventoryForm.unit} onChange={e => setInventoryForm({...inventoryForm, unit: e.target.value})} className={inputField} required>
                  <option value="">Unit</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="ml">ml</option>
                  <option value="units">units</option>
                </select>
                <input type="number" step="0.01" placeholder="Alert Level" value={inventoryForm.lowStockThreshold} onChange={e => setInventoryForm({...inventoryForm, lowStockThreshold: e.target.value})} className={inputField} required />
                <input type="number" placeholder="Lead Days" value={inventoryForm.leadTimeDays} onChange={e => setInventoryForm({...inventoryForm, leadTimeDays: e.target.value})} className={inputField} required />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className={button + " flex-1 uppercase tracking-tighter"}>{editingInventoryId ? "Confirm Changes" : "Register Stock"}</button>
                {editingInventoryId && <button type="button" onClick={() => {setEditingInventoryId(null); setInventoryForm({name:'', type:'ingredient', quantity:'', unit:'', lowStockThreshold:'', leadTimeDays:''});}} className="bg-gray-500 text-white p-3 rounded-xl"><X /></button>}
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
                  {currentLogs.map(log => (
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
                                <div><span className="block text-[10px] uppercase font-bold opacity-60">Start Time</span> {log.distillationStart || '-'}</div>
                                <div><span className="block text-[10px] uppercase font-bold opacity-60">Power Level</span> {log.powerLevel || '-'}</div>
                                <div><span className="block text-[10px] uppercase font-bold opacity-60">Ethanol Into Still</span> {log.ethanolAmount || '0'} L</div>
                                <div><span className="block text-[10px] uppercase font-bold opacity-60">Water Into Still</span> {log.waterIntoStill || '0'} L</div>
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
                              <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm text-[#4E3629]">
                                <div><span className="block text-[10px] uppercase font-bold opacity-60">Bottling Time</span> {log.bottlingStartTime || '-'}</div>
                                <div><span className="block text-[10px] uppercase font-bold opacity-60">Boxes Used</span> {log.boxesUsed || '0'}</div>
                                <div className="col-span-2 mt-2 pt-2 border-t border-[#B5AE9F]/30"><span className="block text-[10px] uppercase font-bold opacity-60">Notes</span> <span className="italic">{log.notes || 'No notes provided.'}</span></div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-[#F4EFEA] p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border-t-8 border-[#8A2A2B]">
            <p className="text-lg font-black text-[#4E3629] mb-6">{notificationMessage}</p>
            <button type="button" onClick={() => setShowNotificationModal(false)} className={button + " w-full"}>DISMISS</button>
          </div>
        </div>
      )}
    </div>
  );
}
