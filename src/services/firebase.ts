import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User, Auth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, Firestore } from 'firebase/firestore';
import { Profile } from '../types';

export const firebaseConfig = {
  projectId: "saaf-din",
  appId: "1:790892695516:web:c9807566d4b2d8b781c919",
  storageBucket: "saaf-din.firebasestorage.app",
  apiKey: "AIzaSyBFN-KAIu0mRJ74Td2IOGqwpS2RJglYrBU",
  authDomain: "saaf-din.firebaseapp.com",
  messagingSenderId: "790892695516",
  measurementId: "G-KNWSG5H2E2",
};

// Initialize Firebase App
export const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

let currentUser: User | null = null;

// Track auth state
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    try {
      localStorage.setItem('saafdin_auth_uid', user.uid);
    } catch (e) {
      console.warn('localStorage error:', e);
    }
  }
});

/**
 * Initializes anonymous authentication as specified in HANDOFF.md.
 * Automatically signs in anonymously on first load.
 */
export async function initAnonymousAuth(): Promise<User | null> {
  if (auth.currentUser) {
    currentUser = auth.currentUser;
    return currentUser;
  }

  try {
    const cred = await signInAnonymously(auth);
    currentUser = cred.user;
    return currentUser;
  } catch (err) {
    console.warn('Anonymous auth failed (offline or auth disabled in console):', err);
    return null;
  }
}

export function getCurrentUid(): string {
  if (currentUser?.uid) return currentUser.uid;
  if (auth.currentUser?.uid) return auth.currentUser.uid;
  try {
    const cachedUid = localStorage.getItem('saafdin_auth_uid');
    if (cachedUid) return cachedUid;
  } catch (e) {
    // ignore
  }
  return 'anonymous_local_user';
}

/**
 * Saves user profile to Firestore under users/{uid} and local storage fallback.
 */
export async function saveProfileToFirestore(profile: Profile): Promise<void> {
  const uid = getCurrentUid();

  // Always persist locally
  try {
    localStorage.setItem('saafdin_profile', JSON.stringify(profile));
  } catch (e) {
    console.warn('Local storage write failed:', e);
  }

  // Attempt remote Firestore save if authenticated
  if (auth.currentUser) {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, {
        profile,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore profile save failed (may be offline or rules restricted):', err);
    }
  }
}

/**
 * Loads user profile from Firestore or local storage.
 */
export async function loadProfileFromFirestore(): Promise<Profile | null> {
  const uid = getCurrentUid();

  if (auth.currentUser) {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists() && snap.data()?.profile) {
        return snap.data().profile as Profile;
      }
    } catch (err) {
      console.warn('Firestore profile load failed:', err);
    }
  }

  // Fallback to local storage
  try {
    const cached = localStorage.getItem('saafdin_profile');
    if (cached) {
      return JSON.parse(cached) as Profile;
    }
  } catch (e) {
    console.warn('Local storage read error:', e);
  }

  return null;
}
