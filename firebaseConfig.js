// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBZSxaZwOmecNj9ZZRYsp9MGAOllwWZw7g",
  authDomain: "aidt-921d3.firebaseapp.com",
  projectId: "aidt-921d3",
  storageBucket: "aidt-921d3.firebasestorage.app",
  messagingSenderId: "581875353126",
  appId: "1:581875353126:web:7cae1502e3e0227bd888e7",
  measurementId: "G-BRYT3NJCTE"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firebase 서비스들 초기화
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app, firebaseConfig.storageBucket);

// Analytics는 브라우저에서만 초기화
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
export { analytics };

export default app;