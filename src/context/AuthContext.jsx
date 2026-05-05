import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Helpers para ArrayBuffer a Base64
const bufferToBase64 = (buffer) => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

const base64ToBuffer = (base64) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Check if there is an active session (just for simple refresh persistence during development)
    // Normally, a real app would require re-auth on every start, but we can make it optional
    const loggedUser = sessionStorage.getItem('lumina_active_user');
    if (loggedUser) {
      setUser(JSON.parse(loggedUser));
    }
    setIsInitializing(false);
  }, []);

  const registerUser = (username, fullName, password) => {
    if (localStorage.getItem(`lumina_user_${username}`)) {
      alert("El usuario ya existe.");
      return false;
    }
    const userData = { username, fullName, password };
    localStorage.setItem(`lumina_user_${username}`, JSON.stringify(userData));
    setUser(userData);
    sessionStorage.setItem('lumina_active_user', JSON.stringify(userData));
    return true;
  };

  const loginUser = (username, password) => {
    const savedUserJson = localStorage.getItem(`lumina_user_${username}`);
    if (!savedUserJson) {
      alert("Usuario no encontrado. Por favor registrate.");
      return false;
    }
    const savedUser = JSON.parse(savedUserJson);
    if (savedUser.password !== password) {
      alert("Contraseña incorrecta.");
      return false;
    }
    setUser(savedUser);
    sessionStorage.setItem('lumina_active_user', JSON.stringify(savedUser));
    return true;
  };

  const loginWithBiometrics = async (username) => {
    if (!username.trim()) {
      alert("Ingresá tu nombre de usuario para buscar tu cuenta.");
      return false;
    }

    const savedUserJson = localStorage.getItem(`lumina_user_${username}`);
    if (!savedUserJson) {
      alert("Usuario no encontrado. Por favor, registrate primero.");
      return false;
    }

    const savedUser = JSON.parse(savedUserJson);

    if (!window.PublicKeyCredential) {
      alert("Tu dispositivo o navegador no soporta autenticación biométrica.");
      return false;
    }

    if (!savedUser.credentialId) {
      // Primera vez usando huella: Configurar la huella
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);

        const publicKey = {
          challenge,
          rp: { name: "Lumina Expenses" },
          user: {
            id: userId,
            name: username,
            displayName: savedUser.fullName || username
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 }
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          },
          timeout: 60000,
          attestation: "none"
        };

        const credential = await navigator.credentials.create({ publicKey });
        
        if (credential) {
          savedUser.credentialId = bufferToBase64(credential.rawId);
          localStorage.setItem(`lumina_user_${username}`, JSON.stringify(savedUser));
          
          setUser(savedUser);
          sessionStorage.setItem('lumina_active_user', JSON.stringify(savedUser));
          return true;
        }
      } catch (error) {
        console.error("Error al configurar huella:", error);
        alert("Cancelaste o hubo un error al configurar la huella.");
      }
    } else {
      // Ya tiene huella configurada, solo verificar
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const publicKey = {
          challenge,
          allowCredentials: [
            {
              id: base64ToBuffer(savedUser.credentialId),
              type: "public-key"
            }
          ],
          userVerification: "required",
          timeout: 60000
        };

        const assertion = await navigator.credentials.get({ publicKey });
        
        if (assertion) {
          setUser(savedUser);
          sessionStorage.setItem('lumina_active_user', JSON.stringify(savedUser));
          return true;
        }
      } catch (error) {
        console.error("Error en login biométrico:", error);
        alert("No se pudo verificar la huella.");
      }
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('lumina_active_user');
  };

  if (isInitializing) return null;

  return (
    <AuthContext.Provider value={{
      user,
      registerUser,
      loginUser,
      loginWithBiometrics,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};
