// ╔══════════════════════════════════════════════════════╗
// ║         Nippur — Firebase Core Module                ║
// ║         Project: nipor-b8997                         ║
// ╚══════════════════════════════════════════════════════╝

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, onSnapshot, doc, deleteDoc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBl5YsPvdgbC546Xun0J7kz-RxxP63Sikw",
  authDomain: "nipor-b8997.firebaseapp.com",
  projectId: "nipor-b8997",
  storageBucket: "nipor-b8997.firebasestorage.app",
  messagingSenderId: "223383995330",
  appId: "1:223383995330:web:905f11c398f01328990c5b",
  measurementId: "G-Q6FTHMVR60"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const storage = getStorage(app);
const auth    = getAuth(app);

export {
  app, db, storage, auth,
  collection, addDoc, getDocs, onSnapshot,
  doc, deleteDoc, updateDoc, query, orderBy
};