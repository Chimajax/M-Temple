// src/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAzBuzPcWAfi0j-SJxXwq67S-XFao9zmwc",
  authDomain: "mystic-temple-126dd.firebaseapp.com",
  projectId: "mystic-temple-126dd",
  storageBucket: "mystic-temple-126dd.appspot.com",
  messagingSenderId: "658101840918",
  appId: "1:658101840918:web:3cc5a38d8f96c50ed15937",
  measurementId: "G-21H8BSTEHH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);
