import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB8LRKRxmgVQaV2bTNDzOK_ajS1GAXCKTg",
  authDomain: "loruk-energy-ltd.firebaseapp.com",
  projectId: "loruk-energy-ltd",
  storageBucket: "loruk-energy-ltd.firebasestorage.app",
  messagingSenderId: "318142535444",
  appId: "1:318142535444:web:823f491fdf19407a7f1401",
  measurementId: "G-B8Y3X8JS7Q"
};

const app = initializeApp(firebaseConfig);
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = getFirestore(app);
export const storage = getStorage(app);
