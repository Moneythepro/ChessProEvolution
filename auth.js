// auth.js (Firebase v9+ modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// Your config
const firebaseConfig = {
  apiKey: "AIzaSyDkHtAbzuLSJwCQvB89s7j_J_6JzpxN480",
  authDomain: "chessproevolution.firebaseapp.com",
  projectId: "chessproevolution",
  storageBucket: "chessproevolution.firebasestorage.app",
  messagingSenderId: "409029482190",
  appId: "1:409029482190:web:8c5801c616c0e89395a29f",
  measurementId: "G-KTFDBKGFZQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// UI Elements
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userStatus = document.getElementById("userStatus");

// Google Sign-In
loginBtn.onclick = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    userStatus.textContent = `Signed in as ${user.displayName}`;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } catch (err) {
    alert("Google Sign-In failed: " + err.message);
  }
};

// Email login (optional, hook into form)
window.emailLogin = async (email, password) => {
  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    alert("Welcome " + userCred.user.email);
  } catch (err) {
    alert("Email login failed: " + err.message);
  }
};

// Email register
window.emailRegister = async (email, password) => {
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    alert("Registered as " + userCred.user.email);
  } catch (err) {
    alert("Email registration failed: " + err.message);
  }
};

// Sign out
logoutBtn.onclick = async () => {
  await signOut(auth);
  userStatus.textContent = "Not signed in";
  loginBtn.style.display = "inline-block";
  logoutBtn.style.display = "none";
};

// Auth state change
onAuthStateChanged(auth, (user) => {
  if (user) {
    userStatus.textContent = `Signed in as ${user.displayName || user.email}`;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    userStatus.textContent = "Not signed in";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }
});
