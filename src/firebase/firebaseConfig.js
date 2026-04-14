import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCfCTPRGo55BKOcd0zpmcFFyScE5Ilzt4o",
  authDomain: "trigaraprinting-f0aa8.firebaseapp.com",
  projectId: "trigaraprinting-f0aa8",
  storageBucket: "trigaraprinting-f0aa8.firebasestorage.app",
  messagingSenderId: "598230201866",
  appId: "1:598230201866:web:2dd88b709f6154be4c51f3",
  measurementId: "G-J3BYJCLQT3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
