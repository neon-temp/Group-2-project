// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCFXxbpcOM49zEmH7Qe_XezQEkalWrqMjw",
  authDomain: "group-2-project-62de1.firebaseapp.com",
  projectId: "group-2-project-62de1",
  storageBucket: "group-2-project-62de1.firebasestorage.app",
  messagingSenderId: "982921294285",
  appId: "1:982921294285:web:b10dde066baba60802d484",
  measurementId: "G-DT38D19DF0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app)
export const db = getFirestore(app)
