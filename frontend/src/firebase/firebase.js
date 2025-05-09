//  firebase
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAhobqqK4oNxlWdoN1m10nVpnL-Vr6vohk",
  authDomain: "rrts-313dc.firebaseapp.com",
  databaseURL: "https://rrts-313dc-default-rtdb.firebaseio.com",
  projectId: "rrts-313dc",
  storageBucket: "rrts-313dc.firebasestorage.app",
  messagingSenderId: "1014882660674",
  appId: "1:1014882660674:web:ebde820a376ac1483158db"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// for getting data from firebase
const database = getDatabase(app);

export { app, database };