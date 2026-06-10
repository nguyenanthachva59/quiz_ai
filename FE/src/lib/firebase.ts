import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDDJ9coJk-vtpjZOMwBZmv2mVO3gpP3M5E",
  authDomain: "quiz-ai-ckend.firebaseapp.com",
  projectId: "quiz-ai-ckend",
  storageBucket: "quiz-ai-ckend.firebasestorage.app",
  messagingSenderId: "710419737124",
  appId: "1:710419737124:web:6630325ca3445836d986b1",
  measurementId: "G-MX4KNJK3J8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;