import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyClwbk9bCyY5YZO5jBMbjo4IWCqGfYcDCw",
  authDomain: "base-resto-3d1e8.firebaseapp.com",
  projectId: "base-resto-3d1e8",
  storageBucket: "base-resto-3d1e8.firebasestorage.app",
  messagingSenderId: "797391462536",
  appId: "1:797391462536:web:631a9149d7e2b33d137f3d"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
