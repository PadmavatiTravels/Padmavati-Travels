
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDcxr5U-XxbbqSPQQzZTF-u1FbdZQBMBeE",
  authDomain: "padmavati-travels-erp.firebaseapp.com",
  projectId: "padmavati-travels-erp",
  storageBucket: "padmavati-travels-erp.firebasestorage.app",
  messagingSenderId: "221324353977",
  appId: "1:221324353977:web:bc20454d17276f3b071668",
  measurementId: "G-6K0V2HLGMW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
