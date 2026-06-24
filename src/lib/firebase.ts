import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDKQhVVBycpobnRX1u-UYUD0715GjzJKL0",
  authDomain: "operating-vial-rmln4.firebaseapp.com",
  projectId: "operating-vial-rmln4",
  storageBucket: "operating-vial-rmln4.firebasestorage.app",
  messagingSenderId: "277508777653",
  appId: "1:277508777653:web:4e01319628b9fe409cc0fc",
  measurementId: ""
};

const app = initializeApp(firebaseConfig);
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = getFirestore(app, "ai-studio-5d6e3954-eb18-4c54-be5b-cc1e8d03dca1");
export const storage = getStorage(app);
