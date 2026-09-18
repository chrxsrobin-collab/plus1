import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  enableIndexedDbPersistence, 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  updateDoc, 
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD-Bke46NSo1mpQPqz2wjZUyvIuxs6iMg4",
  authDomain: "plus1vip.firebaseapp.com",
  projectId: "plus1vip",
  storageBucket: "plus1vip.firebasestorage.app",
  messagingSenderId: "1080803964753",
  appId: "1:1080803964753:web:d6dc0bc93f15625d1d8570",
  measurementId: "G-GF6EY5QVCL"
};

// Inicialización Singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Soporte offline para persistencia de pases en puerta
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code !== "failed-precondition" && err.code !== "unimplemented") {
      console.warn("Firestore offline persistence error:", err);
    }
  });
}

// ==========================================
// HELPERS DE AUTENTICACIÓN (MULTI-DISPOSITIVO)
// ==========================================

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error al iniciar sesión con Google:", error);
    throw error;
  }
};

export const loginAnonymously = async () => {
  try {
    const result = await signInAnonymously(auth);
    const user = result.user;
    if (user && !user.displayName) {
      const defaultName = "INVITADO #" + user.uid.slice(-4).toUpperCase();
      try {
        await updateProfile(user, { displayName: defaultName });
      } catch (e) {
        console.warn('updateProfile error:', e);
      }
      await setDoc(doc(db, "users", user.uid), { 
        name: defaultName, 
        streak: 1, 
        points: 0,
        isPartner: false,
        partnerTier: null,
        subscriptionExpiresAt: null
      }, { merge: true });
    }
    return user;
  } catch (error) {
    console.error("Error al iniciar sesión anónima:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    throw error;
  }
};

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// ==========================================
// HELPERS DE SINCRONIZACIÓN EN TIEMPO REAL
// ==========================================

// 1. Escuchar eventos en vivo
export const subscribeToLiveEvents = (callback: (events: any[]) => void) => {
  const eventsRef = collection(db, "events");
  const q = query(eventsRef, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(events);
  }, (err) => {
    console.warn("Error escuchando eventos en vivo:", err);
  });
};

// 2. Escuchar invitaciones en vivo por ID
export const subscribeToInvite = (inviteId: string, callback: (invite: any) => void) => {
  const inviteRef = doc(db, "invites", inviteId);
  return onSnapshot(inviteRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() });
    }
  }, (err) => {
    console.warn(`Error escuchando invitación ${inviteId}:`, err);
  });
};

// 3. Confirmar asistencia a invitación (+1)
export const confirmInviteInFirestore = async (inviteId: string, data: {
  userId?: string;
  userName: string;
  withPlusOne: boolean;
}) => {
  const attendeeRef = doc(db, "invites", inviteId, "attendees", data.userId || "anonymous_" + Date.now());
  await setDoc(attendeeRef, {
    ...data,
    confirmedAt: serverTimestamp(),
    status: "confirmed"
  });
};

// 4. Guardar pase en la billetera
export const savePassToWallet = async (userId: string, passData: any) => {
  const passRef = doc(db, "users", userId, "passes", passData.id);
  await setDoc(passRef, {
    ...passData,
    savedAt: serverTimestamp()
  }, { merge: true });
};

export { signInWithPopup, signInAnonymously };
export default app;
