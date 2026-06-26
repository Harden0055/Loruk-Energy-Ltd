import { doc, updateDoc, getFirestore } from "firebase/firestore";

const db = getFirestore();

// Update LPG Stock
export const updateLpgStock = async (size: '6kg' | '13kg', filled: number, empty: number) => {
  const docRef = doc(db, "inventory", `lpg_${size}`);
  await updateDoc(docRef, { filled, empty, lastUpdated: new Date() });
};

// Update Fuel Volume (Diesel or Super Premium)
export const updateFuelVolume = async (type: 'diesel' | 'super_premium', volumeLiters: number) => {
  const docRef = doc(db, "inventory", type);
  await updateDoc(docRef, { volumeLiters, lastUpdated: new Date() });
};
