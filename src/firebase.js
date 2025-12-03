import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB4V1SBjIwQxaJqwHxVR_NlytVjL-gzKoI",
  authDomain: "echonote-5ef3c.firebaseapp.com",
  projectId: "echonote-5ef3c",
  storageBucket: "echonote-5ef3c.appspot.com",
  messagingSenderId: "157611677496",
  appId: "1:157611677496:web:2bcda2d0f0e81acb2313cd",
  measurementId: "G-WDXPY9LPNL",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// ✅ New Firestore with Offline Support
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
