import React, { createContext, useState, useContext, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// Biometrics helpers (device-local)
const bufferToBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const base64ToBuffer = (base64) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes.buffer;
};

const getErrorMessage = (code) => {
  const msgs = {
    'auth/email-already-in-use': 'Este email ya está registrado.',
    'auth/invalid-email': 'El email ingresado no es válido.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/user-not-found': 'No existe una cuenta con este email.',
    'auth/wrong-password': 'Email o contraseña incorrectos.',
    'auth/invalid-credential': 'Email o contraseña incorrectos.',
    'auth/too-many-requests': 'Demasiados intentos. Esperá un momento.',
    'auth/network-request-failed': 'Sin conexión. Verificá tu internet.',
  };
  return msgs[code] || 'Ocurrió un error. Intentá de nuevo.';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const snap = await getDoc(doc(db, 'users', fbUser.uid));
          const profile = snap.exists() ? snap.data() : {};
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            username: profile.username || fbUser.email.split('@')[0],
            fullName: profile.fullName || fbUser.displayName || '',
          });
        } catch {
          setUser({ uid: fbUser.uid, email: fbUser.email, username: fbUser.email.split('@')[0], fullName: '' });
        }
      } else {
        setUser(null);
      }
      setIsInitializing(false);
    });
    return unsubscribe;
  }, []);

  const registerUser = async (email, username, fullName, password) => {
    setAuthError('');
    setAuthLoading(true);
    try {
      const { user: fbUser } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(fbUser, { displayName: fullName });
      await setDoc(doc(db, 'users', fbUser.uid), {
        username: username.trim(),
        fullName: fullName.trim(),
        email,
        createdAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      setAuthError(getErrorMessage(error.code));
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const loginUser = async (email, password) => {
    setAuthError('');
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error) {
      setAuthError(getErrorMessage(error.code));
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const resetPassword = async (email) => {
    setAuthError('');
    if (!email.trim()) { setAuthError('Ingresá tu email para recuperar la contraseña.'); return false; }
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error) {
      setAuthError(getErrorMessage(error.code));
      return false;
    }
  };

  const loginWithBiometrics = async (email) => {
    if (!email.trim()) { setAuthError('Ingresá tu email para usar la huella.'); return false; }
    if (!window.PublicKeyCredential) { setAuthError('Tu dispositivo no soporta autenticación biométrica.'); return false; }
    const credKey = `lumina_cred_${email}`;
    const savedCred = localStorage.getItem(credKey);

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      if (!savedCred) {
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge, rp: { name: 'Lumina Pro' },
            user: { id: userId, name: email, displayName: email },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
            authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
            timeout: 60000, attestation: 'none',
          },
        });
        if (credential) {
          localStorage.setItem(credKey, bufferToBase64(credential.rawId));
          setAuthError('Huella configurada. Volvé a intentar para ingresar.');
          return false;
        }
      } else {
        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge,
            allowCredentials: [{ id: base64ToBuffer(savedCred), type: 'public-key' }],
            userVerification: 'required', timeout: 60000,
          },
        });
        if (assertion) return true; // caller must login separately
      }
    } catch (error) {
      setAuthError('No se pudo verificar la huella. Ingresá con contraseña.');
    }
    return false;
  };

  const logout = () => signOut(auth);

  if (isInitializing) return null;

  return (
    <AuthContext.Provider value={{ user, registerUser, loginUser, loginWithBiometrics, logout, resetPassword, authError, setAuthError, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
