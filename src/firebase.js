// ── Firebase Configuration ─────────────────────────────────
// Replace the placeholder values below with your Firebase project config.
// You can find these in Firebase Console → Project Settings → General → Your apps → SDK config.
//
// Also make sure to:
// 1. Enable Firestore Database in Firebase Console → Build → Firestore Database
// 2. Start in "test mode" for development (allows all reads/writes)

import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
    apiKey: "AIzaSyBZ2KOiXIGEMe6Raws2kpRmS7hTW9sbiDc",
    authDomain: "warmr-7aa19.firebaseapp.com",
    projectId: "warmr-7aa19",
    storageBucket: "warmr-7aa19.firebasestorage.app",
    messagingSenderId: "209508687322",
    appId: "1:209508687322:web:44bfc85dddfd44e7dbf4e3",
    measurementId: "G-QE3NZFRDZZ"
};

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
