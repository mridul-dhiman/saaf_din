import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User, Auth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  Firestore,
} from 'firebase/firestore';
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
 * Automatically signs in anonymously on startup.
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
 * Saves user profile to Firestore under users/{uid} and localStorage fallback.
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
      console.warn('Firestore profile save failed:', err);
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
        const p = snap.data().profile as Profile;
        try {
          localStorage.setItem('saafdin_profile', JSON.stringify(p));
        } catch (e) {
          // ignore
        }
        return p;
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

/**
 * Saves daily action plan & completion states to users/{uid}/plans/{yyyy-mm-dd}.
 * LocalStorage-first, synced online.
 */
export async function savePlanToFirestore(
  dateStr: string,
  planData: { actions: any[]; completionMap: Record<string, boolean> }
): Promise<void> {
  const storageKey = `saafdin_plan_${dateStr}`;
  try {
    localStorage.setItem(storageKey, JSON.stringify(planData.completionMap));
    localStorage.setItem(`${storageKey}_full`, JSON.stringify(planData));
  } catch (e) {
    console.warn('localStorage plan write error:', e);
  }

  if (auth.currentUser) {
    try {
      const uid = getCurrentUid();
      const planRef = doc(db, 'users', uid, 'plans', dateStr);
      await setDoc(planRef, {
        actions: planData.actions,
        completionMap: planData.completionMap,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore plan sync failed:', err);
    }
  }
}

/**
 * Loads daily action plan & completion states for users/{uid}/plans/{yyyy-mm-dd}.
 * LocalStorage-first, synced from Firestore when online.
 */
export async function loadPlanFromFirestore(
  dateStr: string
): Promise<{ actions: any[]; completionMap: Record<string, boolean> } | null> {
  const storageKey = `saafdin_plan_${dateStr}`;

  // Check localStorage first
  try {
    const cachedFull = localStorage.getItem(`${storageKey}_full`);
    if (cachedFull) {
      return JSON.parse(cachedFull);
    }
  } catch (e) {
    console.warn('localStorage plan read error:', e);
  }

  if (auth.currentUser) {
    try {
      const uid = getCurrentUid();
      const planRef = doc(db, 'users', uid, 'plans', dateStr);
      const snap = await getDoc(planRef);
      if (snap.exists() && snap.data()) {
        const data = snap.data();
        const res = {
          actions: data.actions || [],
          completionMap: data.completionMap || {},
        };
        try {
          localStorage.setItem(storageKey, JSON.stringify(res.completionMap));
          localStorage.setItem(`${storageKey}_full`, JSON.stringify(res));
        } catch (e) {
          // ignore
        }
        return res;
      }
    } catch (err) {
      console.warn('Firestore plan load error:', err);
    }
  }

  return null;
}

/**
 * Saves adopted habit alternatives under users/{uid}/swaps/{swapId}.
 * LocalStorage-first, synced online.
 */
export async function saveSwapsToFirestore(adoptedSwapIds: string[]): Promise<void> {
  try {
    localStorage.setItem('saafdin_adopted_swaps', JSON.stringify(adoptedSwapIds));
  } catch (e) {
    console.warn('localStorage swaps write error:', e);
  }

  if (auth.currentUser) {
    try {
      const uid = getCurrentUid();
      for (const swapId of adoptedSwapIds) {
        const swapRef = doc(db, 'users', uid, 'swaps', swapId);
        await setDoc(swapRef, {
          swapId,
          adopted: true,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    } catch (err) {
      console.warn('Firestore swaps sync failed:', err);
    }
  }
}

/**
 * Loads adopted habit alternatives from users/{uid}/swaps/{swapId}.
 * LocalStorage-first, synced online.
 */
export async function loadSwapsFromFirestore(): Promise<string[] | null> {
  try {
    const cached = localStorage.getItem('saafdin_adopted_swaps');
    if (cached) {
      return JSON.parse(cached) as string[];
    }
  } catch (e) {
    console.warn('localStorage swaps read error:', e);
  }

  if (auth.currentUser) {
    try {
      const uid = getCurrentUid();
      const swapsRef = collection(db, 'users', uid, 'swaps');
      const snap = await getDocs(swapsRef);
      const list: string[] = [];
      snap.forEach((d) => {
        if (d.data()?.adopted) {
          list.push(d.id);
        }
      });
      if (list.length > 0) {
        try {
          localStorage.setItem('saafdin_adopted_swaps', JSON.stringify(list));
        } catch (e) {
          // ignore
        }
        return list;
      }
    } catch (err) {
      console.warn('Firestore swaps load error:', err);
    }
  }

  return null;
}
