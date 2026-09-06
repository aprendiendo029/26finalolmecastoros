/**
 * Quiniela Béisbol LMB 2026 - Inicialización y Configuración de Firebase Oficial
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  onSnapshot, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// =========================================================================
// CONFIGURACIÓN DE FIREBASE OFICIAL
// =========================================================================
export const firebaseConfig = {
  apiKey: "AIzaSyCUeZmhwVq6V57V5ZAZHVsJ5xS5MIxtHrw",
  authDomain: "playoffs-6dcfd.firebaseapp.com",
  projectId: "playoffs-6dcfd",
  storageBucket: "playoffs-6dcfd.firebasestorage.app",
  messagingSenderId: "782529203001",
  appId: "1:782529203001:web:e08c04386ea9745792b6e8"
};
// =========================================================================

let app = null;
let auth = null;
let db = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn("Error inicializando Firebase SDK:", error);
}

// Objeto de compatibilidad global para referencias existentes
window.FirebaseApp = { 
  initializeApp, 
  getAuth, 
  signInAnonymously, 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  onSnapshot, 
  serverTimestamp, 
  config: firebaseConfig,
  app,
  auth,
  db
};

export {
  app,
  auth,
  db,
  initializeApp,
  getAuth,
  signInAnonymously,
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp
};
