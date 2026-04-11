// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBl5YsPvdgbC546Xun0J7kz-RxxP63Sikw",
  authDomain: "nipor-b8997.firebaseapp.com",
  projectId: "nipor-b8997",
  storageBucket: "nipor-b8997.firebasestorage.app",
  messagingSenderId: "223383995330",
  appId: "1:223383995330:web:905f11c398f01328990c5b",
  measurementId: "G-Q6FTHMVR60"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);