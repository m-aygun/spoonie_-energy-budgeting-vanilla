// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDvXIFhAQd5CU5OQ78PQHTFLnkSkcdtmAM",
  authDomain: "spoonie-9a939.firebaseapp.com",
  projectId: "spoonie-9a939",
  storageBucket: "spoonie-9a939.firebasestorage.app",
  messagingSenderId: "307795770946",
  appId: "1:307795770946:web:b96e5e0b39141a6c0677db",
  measurementId: "G-M0B7RDSGME"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);