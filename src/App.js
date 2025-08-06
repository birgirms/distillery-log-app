import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, addDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { Archive, FlaskConical, GlassWater, NotebookPen, Home, Plus, Trash2, Mic, MicOff, LoaderCircle, List, Sprout, ChevronLeft, ChevronRight, FileDown, LogIn, LogOut, UserPlus } from 'lucide-react';

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


// Firebase initialization: IMPORTANT - REPLACE THESE PLACEHOLDER VALUES WITH YOUR ACTUAL FIREBASE PROJECT CONFIG.
// You can find these values in your Firebase project settings under "Project settings" -> "Your apps" -> "Web app"
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "YOUR_API_KEY", 
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

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
  const appId = firebaseConfig.projectId; 
  
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

  // State for Login/Registration
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');


  // Effect for Firebase authentication state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      setAuthError(''); // Clear any previous auth errors on state change
    });

    return () => unsubscribeAuth();
  }, []);

  // Effect for setting up Firestore listeners AFTER authentication is ready and user is logged in
  useEffect(() => {
    if (user && isAuthReady) {
      console.log("Setting up Firestore listeners for user:", user.uid);
      const userId = user.uid;

      // Inventory listener
      const inventoryQuery = query(collection(db, `artifacts/${appId}/users/${userId}/inventory`));
      const unsubscribeInventory = onSnapshot(inventoryQuery, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInventory(items);
      });

      // Recipes listener
      const recipesQuery = query(collection(db, `artifacts/${appId}/users/${userId}/recipes`));
      const unsubscribeRecipes = onSnapshot(recipesQuery, (snapshot) => {
        const recipesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecipes(recipesList);
      });
      
      // Bottling Materials listener
      const bottlingMaterialsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/bottlingMaterialDefinitions`));
      const unsubscribeBottlingMaterials = onSnapshot(bottlingMaterialsQuery, (snapshot) => {
        const materialsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBottlingMaterialDefinitions(materialsList);
      });

      // Distillation logs listener
      const distillationLogsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/distillationLogs`));
      const unsubscribeDistillation = onSnapshot(distillationLogsQuery, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'distillation' }));
        setDistillationLogs(logs);
      });

      // Bottling logs listener
      const bottlingLogsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/bottlingLogs`));
      const unsubscribeBottling = onSnapshot(bottlingLogsQuery, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'bottling' }));
        setBottlingLogs(logs);
      });
      
      // Return a cleanup function that unsubscribes from all listeners
      return () => {
        console.log("Tearing down Firestore listeners for user:", user.uid);
        unsubscribeInventory();
        unsubscribeRecipes();
        unsubscribeBottlingMaterials();
        unsubscribeDistillation();
        unsubscribeBottling();
      };
    } else if (isAuthReady && !user) {
      // If auth is ready but no user, clear data (user logged out or not logged in)
      setInventory([]);
      setRecipes([]);
      setDistillationLogs([]);
      setBottlingLogs([]);
      setCombinedLogs([]);
      setBottlingMaterialDefinitions([]);
    }
  }, [user, isAuthReady, appId]);
  
  // Effect to combine and sort logs whenever the individual log states change
  useEffect(() => {
    const combined = [...distillationLogs, ...bottlingLogs];
    combined.sort((a, b) => new Date(b.date) - new Date(a.date));
    setCombinedLogs(combined);
  }, [distillationLogs, bottlingLogs]);

  // Function to show a custom notification modal
  const showNotification = (message) => {
    setNotificationMessage(message);
    setShowNotificationModal(true);
  };

  // --- Authentication Handlers ---
  const handleAuthAction = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
        showNotification("Registration successful! You are now logged in.");
      } else {
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
        showNotification("Login successful!");
      }
      setLoginEmail('');
      setLoginPassword('');
    } catch (error) {
      console.error("Auth Error:", error);
      setAuthError(error.message);
      showNotification(`Authentication failed: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showNotification("Logged out successfully.");
      setView('dashboard'); // Redirect to dashboard or login page after logout
    } catch (error) {
      console.error("Logout Error:", error);
      showNotification(`Logout failed: ${error.message}`);
    }
  };
  // --- End Authentication Handlers ---
  
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

    recognition.onstart = () => {
      setIsListeningDistillation(true);
      showNotification("Listening for your command...");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      showNotification("Transcribed text: " + transcript);
      processDistillationDictation(transcript);
    };

    recognition.onerror = (event) => {
      setIsListeningDistillation(false);
      console.error('Speech recognition error:', event.error);
      showNotification('Error with speech recognition. Please try again.');
    };

    recognition.onend = () => {
      setIsListeningDistillation(false);
    };

    recognition.start();
  };

  const processDistillationDictation = async (transcript) => {
    setIsLoadingAIDistillation(true);
    let chatHistory = [];
    
    // Construct the prompt for the AI model
    const prompt = `
      You are a helpful assistant for a distillery log app. Parse the following dictation and extract the relevant information into a JSON object.
      The fields to extract are:
      - distillationStart (string, format HH:MM)
      - headsCollectionStart (string, format HH:MM)
      - heartsCollectionStart (string, format HH:MM)
      - heartsCollectionStop (string, format HH:MM)
      - powerLevel (string, one of '1', '1.5', '2', '2.5', '3', '3.5')
      - ethanolAmount (number)
      - waterIntoStill (number)
      - abvOfCharge (number)
      - tailsDuration (number)
      - distillateAmount (number)
      - distillateABV (number)
      - notes (string)
      - lowerPlateOn (boolean)
      - upperPlateOn (boolean)
      - dephlegmatorOn (boolean)
      
      Interpret phrases like "lower plate is on", "upper plate active", "dephlegmator off", "turn on the lower plate" to set the boolean values.
      If a field is not mentioned, it should be set to null.
      Here is the user's dictation:
      "${transcript}"
    `;

    chatHistory.push({ role: "user", parts: [{ text: prompt }] });
    const payload = {
        contents: chatHistory,
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    distillationStart: { type: "STRING" },
                    headsCollectionStart: { type: "STRING" },
                    heartsCollectionStart: { type: "STRING" },
                    heartsCollectionStop: { type: "STRING" },
                    powerLevel: { type: "STRING" },
                    ethanolAmount: { type: "NUMBER" },
                    waterIntoStill: { type: "NUMBER" },
                    abvOfCharge: { type: "NUMBER" },
                    tailsDuration: { type: "NUMBER" },
                    distillateAmount: { type: "NUMBER" },
                    distillateABV: { type: "NUMBER" },
                    notes: { type: "STRING" },
                    lowerPlateOn: { type: "BOOLEAN" },
                    upperPlateOn: { type: "BOOLEAN" },
                    dephlegmatorOn: { type: "BOOLEAN" },
                },
            }
        }
    };

    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    let jsonResult = null;
    let retries = 0;
    const maxRetries = 3;
    let delay = 1000;

    while (retries < maxRetries) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (jsonText) {
                jsonResult = JSON.parse(jsonText);
                break;
            }
        } catch (error) {
            console.error('Error fetching from API, retrying...', error);
        }
        retries++;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
    }
    
    setIsLoadingAIDistillation(false);

    if (jsonResult) {
      setDistillationForm(prevForm => {
        const newForm = { ...prevForm };
        for (const key in jsonResult) {
          if (jsonResult[key] !== null && jsonResult[key] !== undefined) {
            newForm[key] = jsonResult[key];
          }
        }
        return newForm;
      });
      showNotification("Form fields updated successfully from your dictation!");
    } else {
      showNotification("Could not understand the dictation. Please try again or fill the form manually.");
    }
  };

  // AI Voice Dictation Feature for Bottling
  const startBottlingListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      showNotification("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }
    
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListeningBottling(true);
      showNotification("Listening for your bottling log...");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      showNotification("Transcribed text: " + transcript);
      processBottlingDictation(transcript);
    };

    recognition.onerror = (event) => {
      setIsListeningBottling(false);
      console.error('Speech recognition error:', event.error);
      showNotification('Error with speech recognition. Please try again.');
    };

    recognition.onend = () => {
      setIsListeningBottling(false);
    };

    recognition.start();
  };

  const processBottlingDictation = async (transcript) => {
    setIsLoadingAIBottling(true);
    let chatHistory = [];
    
    const prompt = `
      You are a helpful assistant for a distillery log app. Parse the following dictation and extract the relevant information into a JSON object.
      The fields to extract are:
      - bottlingStartTime (string, format HH:MM)
      - product (string, e.g. "Grapefruit base")
      - bottledAmount (number)
      - boxesUsed (number)
      - lotNumber (string)
      - notes (string)
      
      If a field is not mentioned, it should be set to null.
      If "bottled amount" is mentioned, calculate "boxesUsed" as "bottledAmount" / 6.
      Here is the user's dictation:
      "${transcript}"
    `;

    chatHistory.push({ role: "user", parts: [{ text: prompt }] });
    const payload = {
        contents: chatHistory,
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    bottlingStartTime: { type: "STRING" },
                    product: { type: "STRING" },
                    bottledAmount: { type: "NUMBER" },
                    boxesUsed: { type: "NUMBER" },
                    lotNumber: { type: "STRING" },
                    notes: { type: "STRING" },
                },
            }
        }
    };

    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    let jsonResult = null;
    let retries = 0;
    const maxRetries = 3;
    let delay = 1000;

    while (retries < maxRetries) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (jsonText) {
                jsonResult = JSON.parse(jsonText);
                break;
            }
        } catch (error) {
            console.error('Error fetching from API, retrying...', error);
        }
        retries++;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
    }
    
    setIsLoadingAIBottling(false);

    if (jsonResult) {
      setBottlingForm(prevForm => {
        const newForm = { ...prevForm };
        for (const key in jsonResult) {
          if (jsonResult[key] !== null && jsonResult[key] !== undefined) {
            newForm[key] = jsonResult[key];
          }
        }
        return newForm;
      });
      showNotification("Bottling log fields updated successfully from your dictation!");
    } else {
      showNotification("Could not understand the dictation. Please try again or fill the form manually.");
    }
  };


  // Handler for distillation log submission
  const handleDistillationSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      const userId = user.uid;
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/distillationLogs`), {
        ...distillationForm,
        timestamp: new Date(),
      });
      showNotification("Distillation log submitted successfully!");

      const recipe = recipes.find(r => r.name === distillationForm.recipeName);
      if (recipe) {
        for (const ingredient of recipe.ingredients) {
          const invItem = inventory.find(i => i.name === ingredient.name);
          if (invItem) {
            const newQuantity = (invItem.quantity || 0) - (ingredient.quantity || 0);
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/inventory`, invItem.id), {
              ...invItem,
              quantity: newQuantity > 0 ? newQuantity : 0,
            });
          }
        }
      }

      setDistillationForm({
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
    } catch (e) {
      console.error("Error adding distillation log or updating inventory: ", e);
      showNotification("Error submitting distillation log. Please try again.");
    }
  };

  // Handler for bottling log submission
  const handleBottlingSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      const userId = user.uid;
      const finalBottlingForm = {
        ...bottlingForm,
        bottledAmount: bottlingForm.bottledAmount, // Use bottledAmount directly from input
        boxesUsed: Math.floor((bottlingForm.bottledAmount || 0) / 6), // Calculate boxesUsed from bottledAmount
        timestamp: new Date(),
      };

      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/bottlingLogs`), finalBottlingForm);
      showNotification("Bottling log submitted successfully!");

      const materialDefinition = bottlingMaterialDefinitions.find(def => def.name === finalBottlingForm.product);
      if (materialDefinition) {
        for (const mat of materialDefinition.materials) {
          const invItem = inventory.find(item => item.name === mat.name && item.type === 'bottling_material');
          if (invItem) {
            const newQuantity = (invItem.quantity || 0) - (mat.quantity * finalBottlingForm.bottledAmount); // Deduct per bottle
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/inventory`, invItem.id), {
              ...invItem,
              quantity: newQuantity > 0 ? newQuantity : 0,
            });
          }
        }
      }

      setBottlingForm({
        date: new Date().toISOString().slice(0, 10),
        bottlingStartTime: '',
        product: '',
        bottledAmount: '',
        boxesUsed: '',
        lotNumber: '',
        notes: '',
      });
    } catch (e) {
      console.error("Error adding bottling log or updating inventory: ", e);
      showNotification("Error submitting bottling log. Please try again.");
    }
  };

  // Handler for adding/updating inventory items
  const handleAddInventory = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      const userId = user.uid;
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/inventory`), {
        ...inventoryForm,
        quantity: parseFloat(inventoryForm.quantity),
        lowStockThreshold: parseFloat(inventoryForm.lowStockThreshold),
        leadTimeDays: parseInt(inventoryForm.leadTimeDays, 10),
      });
      showNotification("Inventory item added successfully!");
      setInventoryForm({
        name: '',
        type: 'ingredient',
        quantity: '',
        unit: '',
        lowStockThreshold: '',
        leadTimeDays: '',
      });
    } catch (e) {
      console.error("Error adding inventory item: ", e);
      showNotification("Error adding inventory item. Please try again.");
    }
  };

  // Handler for adding a recipe
  const handleAddRecipe = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      const userId = user.uid;
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/recipes`), recipeForm);
      showNotification("Recipe added successfully!");
      setRecipeForm({
        name: '',
        product: '',
        ingredients: [{ name: '', quantity: '', unit: '' }],
      });
    } catch (e) {
      console.error("Error adding recipe: ", e);
      showNotification("Error adding recipe. Please try again.");
    }
  };
  
  // Handler for defining bottling materials
  const handleAddBottlingMaterials = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      const userId = user.uid;
      // Add a single document to store bottling material definitions
      await setDoc(doc(db, `artifacts/${appId}/users/${userId}/bottlingMaterialDefinitions`, bottlingMaterialsForm.name), {
        materials: bottlingMaterialsForm.materials.map(m => ({ ...m, quantity: parseFloat(m.quantity) })),
      });
      showNotification(`Bottling material definition "${bottlingMaterialsForm.name}" saved successfully!`);
      setBottlingMaterialsForm({
        name: '',
        materials: [{ name: '', quantity: '' }],
      });
    } catch (e) {
      console.error("Error adding bottling material definition: ", e);
      showNotification("Error saving bottling materials. Please try again.");
    }
  };

  // Handler for removing an inventory item
  const handleRemoveInventory = async (itemId) => {
    if (!user) return;
    try {
      const userId = user.uid;
      await setDoc(doc(db, `artifacts/${appId}/users/${userId}/inventory`, itemId), { deleted: true }, { merge: true });
      showNotification("Inventory item removed successfully!");
    } catch (e) {
      console.error("Error removing inventory item: ", e);
      showNotification("Error removing inventory item. Please try again.");
    }
  };

  // Function to export the logs table to a PDF
  const exportLogsToPDF = () => {
    const table = document.getElementById('logs-table');
    if (table) {
      window.html2pdf(table, { // Access html2pdf from the window object
        margin: 1,
        filename: 'production_logs.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
      });
      showNotification("Generating PDF...");
    } else {
      showNotification("Log table not found. Please navigate to the Logs tab first.");
    }
  };

  // UI rendering based on current view
  const renderViewContent = () => {
    const lowStockItems = inventory.filter(item => item.quantity <= item.lowStockThreshold);

    // Pagination logic for combined logs
    const totalPages = Math.ceil(combinedLogs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentLogs = combinedLogs.slice(startIndex, endIndex);

    const handlePageChange = (page) => {
      setCurrentPage(page);
    };

    const renderPagination = () => {
      if (totalPages <= 1) return null;
      const pages = [];
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button
            key={i}
            onClick={() => handlePageChange(i)}
            className={`${paginationButton} ${currentPage === i ? activePageButton : ''}`}
          >
            {i}
          </button>
        );
      }
      return (
        <div className="flex justify-center items-center mt-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`${paginationButton} ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <ChevronLeft size={16} />
          </button>
          {pages}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`${paginationButton} ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      );
    };

    switch (view) {
      case 'dashboard':
        return (
          <>
            <div className={`${card} text-center`}>
              <h1 className="text-4xl font-extrabold mb-4 text-[#8A2A2B]">Distillery Dashboard</h1>
              <p className="text-lg text-[#4E3629] mb-6">Track your production logs and inventory in real-time.</p>
              <div className="flex justify-center items-center">
                <div className="p-4 bg-[#8A2A2B] rounded-xl m-2 shadow-lg">
                  <p className="text-xl font-semibold text-[#F4EFEA]">{distillationLogs.length}</p>
                  <p className="text-sm text-[#F4EFEA]">Distillation Logs</p>
                </div>
                <div className="p-4 bg-[#8A2A2B] rounded-xl m-2 shadow-lg">
                  <p className="text-xl font-semibold text-[#F4EFEA]">{bottlingLogs.length}</p>
                  <p className="text-sm text-[#F4EFEA]">Bottling Logs</p>
                </div>
                <div className="p-4 bg-[#8A2A2B] rounded-xl m-2 shadow-lg">
                  <p className="text-xl font-semibold text-[#F4EFEA]">{inventory.length}</p>
                  <p className="text-sm text-[#F4EFEA]">Inventory Items</p>
                </div>
              </div>
            </div>

            <div className={card}>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <Archive size={24} className="mr-2 text-[#8A2A2B]" /> Inventory Overview
              </h2>
              {inventory.filter(item => item.quantity <= item.lowStockThreshold).length > 0 ? (
                <>
                  <div className={notificationBox}>
                    <p className="font-bold">Urgent: Low Stock!</p>
                    <p>The following items are running low. Re-order to avoid production halts.</p>
                  </div>
                  {inventory.filter(item => item.quantity <= item.lowStockThreshold).map(item => (
                        <div key={item.id} className={lowStockItem}>
                          <span className="font-bold">{item.name}</span>
                          <span>
                            <span className="text-red-400 font-semibold">{item.quantity}</span> / {item.lowStockThreshold} {item.unit}
                          </span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="bg-green-700 text-white p-4 rounded-xl text-center">
                      All inventory levels are looking good!
                    </div>
                  )}
                </div>
              </>
            )}

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
                    <label className="block text-[#4E3629] mb-2">Time of Distillation</label>
                    <input type="datetime-local" value={distillationForm.date} onChange={(e) => setDistillationForm({ ...distillationForm, date: e.target.value })} required className={inputField} />
                  </div>
                  <div>
                    <label className="block text-[#4E3629] mb-2">Recipe Used</label>
                    <select value={distillationForm.recipeName} onChange={(e) => setDistillationForm({ ...distillationForm, recipeName: e.target.value })} required className={inputField}>
                      <option value="">Select a Recipe</option>
                      {recipes.map(recipe => (
                        <option key={recipe.id} value={recipe.name}>{recipe.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#4E3629] mb-2">Distillation Start (HH:MM)</label>
                    <input type="time" value={distillationForm.distillationStart} onChange={(e) => setDistillationForm({ ...distillationForm, distillationStart: e.target.value })} required className={`${inputField} text-[#4E3629]`}/>
                  </div>
                  <div>
                    <label className="block text-[#4E3629] mb-2">Power Level</label>
                    <select value={distillationForm.powerLevel} onChange={(e) => setDistillationForm({ ...distillationForm, powerLevel: e.target.value })} required className={inputField}>
                      <option value="">Select Power Level</option>
                      <option value="1">1</option>
                      <option value="1.5">1.5</option>
                      <option value="2">2</option>
                      <option value="2.5">2.5</option>
                      <option value="3">3</option>
                      <option value="3.5">3.5</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-[#4E3629]">Plate & Dephlegmator Controls</label>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-[#4E3629]">Lower Plate On/Off</span>
                        <button
                          type="button"
                          onClick={() => setDistillationForm({ ...distillationForm, lowerPlateOn: !distillationForm.lowerPlateOn })}
                          className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#E0D8D0] focus:ring-[#8A2A2B] ${distillationForm.lowerPlateOn ? 'bg-[#8A2A2B]' : 'bg-[#C8C2BA]'}`}
                        >
                          <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-[#F4EFEA] shadow transform ring-0 transition ease-in-out duration-200 ${distillationForm.lowerPlateOn ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[#4E3629]">Upper Plate On/Off</span>
                        <button
                          type="button"
                          onClick={() => setDistillationForm({ ...distillationForm, upperPlateOn: !distillationForm.upperPlateOn })}
                          className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#E0D8D0] focus:ring-[#8A2A2B] ${distillationForm.upperPlateOn ? 'bg-[#8A2A2B]' : 'bg-[#C8C2BA]'}`}
                        >
                          <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-[#F4EFEA] shadow transform ring-0 transition ease-in-out duration-200 ${distillationForm.upperPlateOn ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[#4E3629]">Dephlegmator On/Off</span>
                        <button
                          type="button"
                          onClick={() => setDistillationForm({ ...distillationForm, dephlegmatorOn: !distillationForm.dephlegmatorOn })}
                          className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#E0D8D0] focus:ring-[#8A2A2B] ${distillationForm.dephlegmatorOn ? 'bg-[#8A2A2B]' : 'bg-[#C8C2BA]'}`}
                        >
                          <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-[#F4EFEA] shadow transform ring-0 transition ease-in-out duration-200 ${distillationForm.dephlegmatorOn ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#4E3629] mb-2">Ethanol Into Still (L)</label>
                    <input type="number" step="0.01" value={distillationForm.ethanolAmount} onChange={(e) => setDistillationForm({ ...distillationForm, ethanolAmount: e.target.value })} required className={inputField} />
                  </div>
                  <div>
                    <label className="block text-[#4E3629] mb-2">Water Into Still (L)</label>
                    <input type="number" step="0.01" value={distillationForm.waterIntoStill} onChange={(e) => setDistillationForm({ ...distillationForm, waterIntoStill: e.target.value })} required className={inputField} />
                  </div>
                  <div>
                    <label className="block text-[#4E3629] mb-2">ABV of Charge (%)</label>
                    <input type="number" step="0.01" value={distillationForm.abvOfCharge} onChange={(e) => setDistillationForm({ ...distillationForm, abvOfCharge: e.target.value })} required className={inputField} />
                  </div>
                  
                  <div>
                    <label className="block text-[#4E3629] mb-2">Heads Collection Start (HH:MM)</label>
                    <input type="time" value={distillationForm.headsCollectionStart} onChange={(e) => setDistillationForm({ ...distillationForm, headsCollectionStart: e.target.value })} required className={`${inputField} text-[#4E3629]`}/>
                  </div>
                  <div>
                    <label className="block text-[#4E3629] mb-2">Hearts Collection Start (HH:MM)</label>
                    <input type="time" value={distillationForm.heartsCollectionStart} onChange={(e) => setDistillationForm({ ...distillationForm, heartsCollectionStart: e.target.value })} required className={`${inputField} text-[#4E3629]`}/>
                  </div>
                  <div>
                    <label className="block text-[#4E3629] mb-2">Hearts Collection Stop (HH:MM)</label>
                    <input type="time" value={distillationForm.heartsCollectionStop} onChange={(e) => setDistillationForm({ ...distillationForm, heartsCollectionStop: e.target.value })} required className={`${inputField} text-[#4E3629]`}/>
                  </div>
                  <div>
                    <label className="block text-[#4E3629] mb-2">Tails Collection Duration (minutes)</label>
                    <input type="number" value={distillationForm.tailsDuration} onChange={(e) => setDistillationForm({ ...distillationForm, tailsDuration: e.target.value })} required className={inputField} />
                  </div>
                  <div>
                    <label className="block text-[#4E3629] mb-2">Distillate Collected (L)</label>
                    <input type="number" step="0.01" value={distillationForm.distillateAmount} onChange={(e) => setDistillationForm({ ...distillationForm, distillateAmount: e.target.value })} required className={inputField} />
                  </div>
                  <div>
                    <label className="block text-[#4E3629] mb-2">Distillate ABV (%)</label>
                    <input type="number" step="0.01" value={distillationForm.distillateABV} onChange={(e) => setDistillationForm({ ...distillationForm, distillateABV: e.target.value })} required className={inputField} />
                  </div>
                  <div>
                    <label className="block text-[#4E3629] mb-2">Notes</label>
                    <textarea value={distillationForm.notes} onChange={(e) => setDistillationForm({ ...distillationForm, notes: e.target.value })} className={`${inputField} h-32 resize-y`} />
                  </div>
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
                  <button onClick={exportLogsToPDF} className={`${button} flex items-center`}>
                    <FileDown size={20} className="mr-2 text-[#F4EFEA]" /> Export to PDF
                  </button>
                </div>
                
                <div className="overflow-x-auto" id="logs-table">
                  <h1 className="text-2xl font-extrabold mb-4 text-[#8A2A2B]">Production Log History</h1>
                  <table className="min-w-full bg-[#E0D8D0] rounded-xl overflow-hidden">
                    <thead className={tableHeader}>
                      <tr className="bg-[#C8C2BA] text-left text-[#4E3629]">
                        <th className={`${tableCell} whitespace-nowrap`}>Type</th>
                        <th className={`${tableCell} whitespace-nowrap`}>Date</th>
                        <th className={`${tableCell} whitespace-nowrap`}>Start Time</th>
                        <th className={`${tableCell} whitespace-nowrap`}>Product / Recipe</th>
                        <th className={`${tableCell} whitespace-nowrap`}>Amount</th>
                        <th className={`${tableCell} whitespace-nowrap`}>ABV / Lot No.</th>
                        <th className={`${tableCell} whitespace-nowrap`}>Lower Plate</th>
                        <th className={`${tableCell} whitespace-nowrap`}>Upper Plate</th>
                        <th className={`${tableCell} whitespace-nowrap`}>Dephlegmator</th>
                        <th className={`${tableCell} whitespace-nowrap`}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Pagination logic for combined logs */}
                      {(() => {
                        const totalPages = Math.ceil(combinedLogs.length / itemsPerPage);
                        const startIndex = (currentPage - 1) * itemsPerPage;
                        const endIndex = startIndex + itemsPerPage;
                        const currentLogsSlice = combinedLogs.slice(startIndex, endIndex);

                        return currentLogsSlice.map(log => (
                          <tr key={log.id} className={tableRow}>
                            <td className={tableCell}>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${log.type === 'distillation' ? 'bg-[#8A2A2B] text-[#F4EFEA]' : 'bg-[#8A2A2B] text-[#F4EFEA]'}`}>
                                {log.type.charAt(0).toUpperCase() + log.type.slice(1)}
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
                            <td className={tableCell}>
                              {log.type === 'distillation' ? (log.lowerPlateOn ? 'On' : 'Off') : '-'}
                            </td>
                            <td className={tableCell}>
                              {log.type === 'distillation' ? (log.upperPlateOn ? 'On' : 'Off') : '-'}
                            </td>
                            <td className={tableCell}>
                              {log.type === 'distillation' ? (log.dephlegmatorOn ? 'On' : 'Off') : '-'}
                            </td>
                            <td className={tableCell}>{log.notes}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
                {(() => {
                  const totalPages = Math.ceil(combinedLogs.length / itemsPerPage);
                  const pages = [];
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`${paginationButton} ${currentPage === i ? activePageButton : ''}`}
                      >
                        {i}
                      </button>
                    );
                  }
                  return (
                    <div className="flex justify-center items-center mt-4">
                      <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`${paginationButton} ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      {pages}
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`${paginationButton} ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {view === 'bottling' && (
              <div className={card}>
                <h2 className="text-2xl font-bold mb-6 flex items-center justify-between text-[#8A2A2B]">
                  <span className="flex items-center"><GlassWater size={24} className="mr-2 text-[#8A2A2B]" /> New Bottling Log</span>
                  <button
                    type="button"
                    onClick={startBottlingListening}
                    className={`${micButton} ${isListeningBottling ? 'bg-red-600' : 'bg-[#4E3629]'}`}
                    disabled={isLoadingAIBottling}
                  >
                    {isLoadingAIBottling ? <LoaderCircle size={24} className={loadingSpinner} /> : isListeningBottling ? <MicOff size={24} /> : <Mic size={24} />}
                  </button>
                </h2>
                <form onSubmit={handleBottlingSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[#4E3629] mb-2">Date of Bottling</label>
                    <input type="date" value={bottlingForm.date} onChange={(e) => setBottlingForm({ ...bottlingForm, date: e.target.value })} required className={inputField} />
                  </div>
                  <div>
                    <label className="block text-[#4E3629] mb-2">Bottling Start Time (HH:MM)</label>
                    <input type="time" value={bottlingForm.bottlingStartTime} onChange={(e) => setBottlingForm({ ...bottlingForm, bottlingStartTime: e.target.value })} required className={`${inputField} text-[#4E3629]`}/>
                  </div>
                  <div>
                    <label className="block text-[#4E3629] mb-2">Product Bottled</label>
                    <select value={bottlingForm.product} onChange={(e) => setBottlingForm({ ...bottlingForm, product: e.target.value })} required className={inputField}>
                      <option value="">Select a Product</option>
                      {recipes.map(recipe => (
                        <option key={recipe.id} value={recipe.product}>{recipe.product}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#4E3629] mb-2">Amount Bottled (units)</label>
                    <input type="number" value={bottlingForm.bottledAmount} onChange={(e) => setBottlingForm({ ...bottlingForm, bottledAmount: parseInt(e.target.value, 10) || '' })} className={inputField} />
                  </div>
                  <div>
                    <label className="block text-[#4E3629] mb-2">Boxes Filled (read-only)</label>
                    <input type="number" readOnly value={Math.floor((bottlingForm.bottledAmount || 0) / 6)} className={inputField} />
                  </div>
                  <div>
                    <label className="block text-[#4E3629] mb-2">Lot Number</label>
                    <input type="text" value={bottlingForm.lotNumber} onChange={(e) => setBottlingForm({ ...bottlingForm, lotNumber: e.target.value })} required className={inputField} />
                  </div>
                  <div>
                    <label className="block text-[#4E3629] mb-2">Notes</label>
                    <textarea value={bottlingForm.notes} onChange={(e) => setBottlingForm({ ...bottlingForm, notes: e.target.value })} className={`${inputField} h-32 resize-y`} />
                  </div>
                  <button type="submit" className={button}>Submit Bottling Log</button>
                </form>
              </div>
            )}

            {view === 'inventory' && (
              <div className={card}>
                <h2 className="text-2xl font-bold mb-6 flex items-center text-[#8A2A2B]">
                  <NotebookPen size={24} className="mr-2 text-[#8A2A2B]" /> Inventory Management
                </h2>
                
                {/* Current Inventory Table */}
                <div className="overflow-x-auto">
                  <h3 className="text-xl font-bold mb-4">Current Inventory</h3>
                  <table className="min-w-full bg-[#E0D8D0] rounded-xl overflow-hidden">
                    <thead className={tableHeader}>
                      <tr className="bg-[#C8C2BA] text-left text-[#4E3629]">
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Quantity</th>
                        <th className="py-3 px-4">Low Stock</th>
                        <th className="py-3 px-4">Lead Time (days)</th>
                        <th className="py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.filter(item => !item.deleted).map(item => (
                        <tr key={item.id} className="border-t border-[#B5AE9F] hover:bg-[#C8C2BA] transition-colors">
                          <td className="py-3 px-4">{item.name}</td>
                          <td className="py-3 px-4">{item.type}</td>
                          <td className="py-3 px-4">{item.quantity} {item.unit}</td>
                          <td className="py-3 px-4">{item.lowStockThreshold} {item.unit}</td>
                          <td className="py-3 px-4">{item.leadTimeDays}</td>
                          <td className="py-3 px-4">
                            <button onClick={() => handleRemoveInventory(item.id)} className="text-[#8A2A2B] hover:text-red-600">
                              <Trash2 size={20} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Current Recipes Table */}
                <div className="overflow-x-auto mt-8">
                  <h3 className="text-xl font-bold mb-4">Current Recipes</h3>
                  <table className="min-w-full bg-[#E0D8D0] rounded-xl overflow-hidden">
                    <thead className={tableHeader}>
                      <tr className="bg-[#C8C2BA] text-left text-[#4E3629]">
                        <th className="py-3 px-4">Recipe Name</th>
                        <th className="py-3 px-4">Final Product</th>
                        <th className="py-3 px-4">Ingredients</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipes.map(recipe => (
                        <tr key={recipe.id} className="border-t border-[#B5AE9F] hover:bg-[#C8C2BA] transition-colors">
                          <td className="py-3 px-4">{recipe.name}</td>
                          <td className="py-3 px-4">{recipe.product}</td>
                          <td className="py-3 px-4">
                            {recipe.ingredients.map((ing, i) => (
                              <span key={i} className="block">{ing.quantity} {ing.unit} of {ing.name}</span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add New Inventory Item */}
                <div className="mb-8 p-6 bg-[#C8C2BA] rounded-2xl mt-8">
                  <h3 className="text-xl font-bold mb-4 flex items-center text-[#8A2A2B]">
                    <Plus size={20} className="mr-2" /> Add/Update Item
                  </h3>
                  <form onSubmit={handleAddInventory} className="space-y-4">
                    <input type="text" placeholder="Item Name (e.g., Grain, Bottles, Labels)" value={inventoryForm.name} onChange={(e) => setInventoryForm({ ...inventoryForm, name: e.target.value })} required className={inputField} />
                    <div className="flex space-x-4">
                      <select value={inventoryForm.type} onChange={(e) => setInventoryForm({ ...inventoryForm, type: e.target.value })} className={`${inputField} flex-1`}>
                        <option value="ingredient">Ingredient</option>
                        <option value="bottling_material">Bottling Material</option>
                      </select>
                      <input type="text" placeholder="Unit (e.g., kg, pieces, rolls)" value={inventoryForm.unit} onChange={(e) => setInventoryForm({ ...inventoryForm, unit: e.target.value })} required className={`${inputField} flex-1`} />
                    </div>
                    <div className="flex space-x-4">
                      <input type="number" placeholder="Current Quantity" value={inventoryForm.quantity} onChange={(e) => setInventoryForm({ ...inventoryForm, quantity: e.target.value })} required className={`${inputField} flex-1`} />
                      <input type="number" placeholder="Low Stock Threshold" value={inventoryForm.lowStockThreshold} onChange={(e) => setInventoryForm({ ...inventoryForm, lowStockThreshold: e.target.value })} required className={`${inputField} flex-1`} />
                      <input type="number" placeholder="Lead Time (days)" value={inventoryForm.leadTimeDays} onChange={(e) => setInventoryForm({ ...inventoryForm, leadTimeDays: e.target.value })} required className={`${inputField} flex-1`} />
                    </div>
                    <button type="submit" className={button}>Add/Update Inventory Item</button>
                  </form>
                </div>
                
                {/* Add New Recipe */}
                <div className="mb-8 p-6 bg-[#C8C2BA] rounded-2xl">
                  <h3 className="text-xl font-bold mb-4 flex items-center text-[#8A2A2B]">
                    <Plus size={20} className="mr-2" /> Add New Recipe
                  </h3>
                  <form onSubmit={handleAddRecipe} className="space-y-4">
                    <input type="text" placeholder="Recipe Name" value={recipeForm.name} onChange={(e) => setRecipeForm({ ...recipeForm, name: e.target.value })} required className={inputField} />
                    <input type="text" placeholder="Final Product" value={recipeForm.product} onChange={(e) => setRecipeForm({ ...recipeForm, product: e.target.value })} required className={inputField} />
                    
                    <h4 className="text-lg font-bold mt-4 text-[#4E3629]">Ingredients:</h4>
                    {recipeForm.ingredients.map((ing, index) => (
                      <div key={index} className="flex space-x-2 items-center">
                        <input type="text" placeholder="Ingredient Name" value={ing.name} onChange={(e) => {
                          const newIngredients = [...recipeForm.ingredients];
                          newIngredients[index].name = e.target.value;
                          setRecipeForm({ ...recipeForm, ingredients: newIngredients });
                        }} required className={inputField} />
                        <input type="number" step="0.01" placeholder="Quantity" value={ing.quantity} onChange={(e) => {
                          const newIngredients = [...recipeForm.ingredients];
                          newIngredients[index].quantity = parseFloat(e.target.value);
                          setRecipeForm({ ...recipeForm, ingredients: newIngredients });
                        }} required className={`${inputField} w-28`} />
                        <select value={ing.unit} onChange={(e) => {
                          const newIngredients = [...recipeForm.ingredients];
                          newIngredients[index].unit = e.target.value;
                          setRecipeForm({ ...recipeForm, ingredients: newIngredients });
                        }} required className={`${inputField} w-28`}>
                          <option value="">Unit</option>
                          <option value="L">L</option>
                          <option value="gr">gr</option>
                        </select>
                        <button type="button" onClick={() => {
                          const newIngredients = [...recipeForm.ingredients];
                          newIngredients.splice(index, 1);
                          setRecipeForm({ ...recipeForm, ingredients: newIngredients });
                        }}>
                          <Trash2 size={20} className="text-[#8A2A2B] hover:text-red-600" />
                        </button>
                      </div>
                    ))}
                    <div className="flex flex-col space-y-4 items-start">
                      <button type="button" onClick={() => setRecipeForm({ ...recipeForm, ingredients: [...recipeForm.ingredients, { name: '', quantity: '', unit: '' }] })} className="text-[#8A2A2B] hover:text-[#6D2121]">
                        + Add Another Ingredient
                      </button>
                      <button type="submit" className={button}>Add Recipe</button>
                    </div>
                  </form>
                </div>

                {/* Add New Bottling Materials Definition */}
                <div className="mb-8 p-6 bg-[#C8C2BA] rounded-2xl">
                  <h3 className="text-xl font-bold mb-4 flex items-center text-[#8A2A2B]">
                    <Plus size={20} className="mr-2" /> Define Bottling Materials
                  </h3>
                  <form onSubmit={handleAddBottlingMaterials} className="space-y-4">
                    <input type="text" placeholder="Definition Name (e.g., Standard Bottle Pack)" value={bottlingMaterialsForm.name} onChange={(e) => setBottlingMaterialsForm({ ...bottlingMaterialsForm, name: e.target.value })} required className={inputField} />
                    <h4 className="text-lg font-bold mt-4 text-[#4E3629]">Materials per Bottle:</h4>
                    {bottlingMaterialsForm.materials.map((mat, index) => (
                      <div key={index} className="flex space-x-2 items-center">
                        <input type="text" placeholder="Material Name (e.g., Bottles, Labels)" value={mat.name} onChange={(e) => {
                          const newMaterials = [...bottlingMaterialsForm.materials];
                          newMaterials[index].name = e.target.value;
                          setBottlingMaterialsForm({ ...bottlingMaterialsForm, materials: newMaterials });
                        }} required className={inputField} />
                        <input type="number" placeholder="Quantity" value={mat.quantity} onChange={(e) => {
                          const newMaterials = [...bottlingMaterialsForm.materials];
                          newMaterials[index].quantity = e.target.value;
                          setBottlingMaterialsForm({ ...bottlingMaterialsForm, materials: newMaterials });
                        }} required className={`${inputField} w-28`} />
                        <button type="button" onClick={() => {
                          const newMaterials = [...bottlingMaterialsForm.materials];
                          newMaterials.splice(index, 1);
                          setBottlingMaterialsForm({ ...bottlingMaterialsForm, materials: newMaterials });
                        }}>
                          <Trash2 size={20} className="text-[#8A2A2B] hover:text-red-600" />
                        </button>
                      </div>
                    ))}
                    <div className="flex flex-col space-y-4 items-start">
                      <button type="button" onClick={() => setBottlingMaterialsForm({ ...bottlingMaterialsForm, materials: [...bottlingMaterialsForm.materials, { name: '', quantity: '' }] })} className="text-[#8A2A2B] hover:text-[#6D2121]">
                        + Add Another Material
                      </button>
                      <button type="submit" className={button}>Save Material Definition</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className={`${card} text-center`}>
            {/* Login/Registration Form */}
            <h2 className="text-2xl font-bold mb-6 text-[#8A2A2B]">
              {isRegistering ? 'Register' : 'Login'} to Distillery App
            </h2>
            <form onSubmit={handleAuthAction} className="space-y-4">
              <div>
                <label className="block text-[#4E3629] mb-2">Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  className={inputField}
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label className="block text-[#4E3629] mb-2">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className={inputField}
                  placeholder="Enter your password"
                />
              </div>
              {authError && <p className="text-red-500 text-sm">{authError}</p>}
              <div className="flex justify-between items-center">
                <button type="submit" className={button}>
                  {isRegistering ? (
                    <><UserPlus size={20} className="inline mr-2" /> Register</>
                  ) : (
                    <><LogIn size={20} className="inline mr-2" /> Login</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-[#4E3629] hover:text-[#8A2A2B] text-sm"
                >
                  {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-[#4E3629] bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-[#E0D8D0] p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center">
            <h3 className="text-2xl font-bold mb-4 text-[#4E3629]">Notification</h3>
            <p className="text-lg text-[#4E3629] mb-6">{notificationMessage}</p>
            <button type="button" onClick={() => setShowNotificationModal(false)} className={button}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
