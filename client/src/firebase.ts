// src/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAhoquiKJ6S2OTM3A5PaSeX0JOQsD1jJcE",
  authDomain: "agronex-e9a1a.firebaseapp.com",
  projectId: "agronex-e9a1a",
  storageBucket: "agronex-e9a1a.firebasestorage.app",
  messagingSenderId: "590109501565",
  appId: "1:590109501565:web:c1086b2ea6ee9872efe914",
  measurementId: "G-G26J2WK5FD"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app); // Add Firestore export
