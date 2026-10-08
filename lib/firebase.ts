import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";

// Firebase config — Read from env or use defaults
// User MUST provide their own Firebase project credentials
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

// Only initialize if config is provided
function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
}

// Initialize Firebase (only once)
const app = getApps().length > 0 ? getApp() : (isFirebaseConfigured() ? initializeApp(firebaseConfig) : null);

// Export Firebase services (may be null if not configured)
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

// Auth Providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// ──────────────────────────────────────────────
// Auth Functions
// ──────────────────────────────────────────────

export async function firebaseSignInWithGoogle() {
  if (!auth) throw new Error("Firebase not configured");
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function firebaseSignInWithGithub() {
  if (!auth) throw new Error("Firebase not configured");
  const result = await signInWithPopup(auth, githubProvider);
  return result.user;
}

export async function firebaseSignInWithEmail(email: string, password: string) {
  if (!auth) throw new Error("Firebase not configured");
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function firebaseSignUpWithEmail(
  email: string,
  password: string,
  displayName: string
) {
  if (!auth) throw new Error("Firebase not configured");
  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (result.user) {
    await updateProfile(result.user, { displayName });
  }
  return result.user;
}

export async function firebaseSignOut() {
  if (!auth) return;
  await signOut(auth);
}

export function onFirebaseAuthChange(
  callback: (user: FirebaseUser | null) => void
): (() => void) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

// ──────────────────────────────────────────────
// Firestore Sync Functions
// ──────────────────────────────────────────────

const COLLECTION = "users";

/**
 * Save the entire study store data to Firestore under the user's UID.
 * Uses merge to avoid overwriting fields not included in the payload.
 */
export async function saveUserDataToFirestore(
  uid: string,
  data: Record<string, any>
) {
  if (!db) throw new Error("Firebase not configured");
  const docRef = doc(db, COLLECTION, uid);
  await setDoc(docRef, { ...data, lastSyncedAt: new Date().toISOString() }, { merge: true });
}

/**
 * Load user's study data from Firestore.
 * Returns null if no data exists yet.
 */
export async function loadUserDataFromFirestore(
  uid: string
): Promise<Record<string, any> | null> {
  if (!db) return null;
  const docRef = doc(db, COLLECTION, uid);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data();
  }
  return null;
}

/**
 * Subscribe to real-time updates of user's study data.
 * Returns an unsubscribe function.
 */
export function subscribeToUserData(
  uid: string,
  callback: (data: Record<string, any> | null) => void
): Unsubscribe {
  if (!db) return () => {};
  const docRef = doc(db, COLLECTION, uid);
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    } else {
      callback(null);
    }
  });
}

export { isFirebaseConfigured };
export type { FirebaseUser };
