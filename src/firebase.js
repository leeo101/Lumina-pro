import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCks-KBcfjRKoSHlGOKmekwHcWYxNGkN9g",
  authDomain: "lumina-pro-e0cf2.firebaseapp.com",
  projectId: "lumina-pro-e0cf2",
  storageBucket: "lumina-pro-e0cf2.firebasestorage.app",
  messagingSenderId: "268909313181",
  appId: "1:268909313181:web:12b8012c4afd239ff0e874",
  measurementId: "G-XC21QF2SBR"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
