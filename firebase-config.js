import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

// ✅ Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDkHtAbzuLSJwCQvB89s7j_J_6JzpxN480",
  authDomain: "chessproevolution.firebaseapp.com",
  projectId: "chessproevolution",
  storageBucket: "chessproevolution.appspot.com", // ✅ Fixed bucket domain
  messagingSenderId: "409029482190",
  appId: "1:409029482190:web:8c5801c616c0e89395a29f",
  measurementId: "G-KTFDBKGFZQ"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Export Firestore & Auth
export const db = getFirestore(app);
export const auth = getAuth(app);

// 🔹 Local + GitHub Pages domain check for Firebase Auth
(function checkDomain() {
  const allowedDomains = ["localhost", "127.0.0.1", "moneythepro.github.io"];
  const currentHost = window.location.hostname;

  if (!allowedDomains.includes(currentHost)) {
    console.warn(
      `⚠️ Firebase Auth: ${currentHost} is not in your allowed domains. Add it in Firebase Console → Authentication → Settings → Authorized Domains.`
    );
  }
})();
