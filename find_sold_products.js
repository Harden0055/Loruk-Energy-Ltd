const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc, deleteDoc, setDoc } = require('firebase/firestore');
// Actually, I can't easily run firebase node sdk if I don't have the config.
