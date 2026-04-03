import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, Auth,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
export const firebaseConfigured = !!apiKey;

const firebaseConfig = {
  apiKey,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

if (firebaseConfigured) {
  app = initializeApp(firebaseConfig);
  const dbId = import.meta.env.VITE_FIREBASE_FIRESTORE_DB as string | undefined;
  _db   = getFirestore(app, dbId || '(default)');
  _auth = getAuth(app);
}

export const db   = _db!;
export const auth = _auth!;
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle  = () => _auth ? signInWithPopup(_auth, googleProvider) : Promise.reject('Firebase not configured');
export const logout           = () => _auth ? signOut(_auth) : Promise.resolve();
export const loginWithEmail   = (email: string, pw: string) => _auth ? signInWithEmailAndPassword(_auth, email, pw) : Promise.reject('Firebase not configured');
export const registerWithEmail = (email: string, pw: string) => _auth ? createUserWithEmailAndPassword(_auth, email, pw) : Promise.reject('Firebase not configured');
