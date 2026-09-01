import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  clearStoredToken,
  getCurrentUser,
  getStoredToken,
  loginUser,
  registerUser,
  storeToken,
} from "../lib/api";

const AuthContext = createContext(null);

function saveSession(session) {
  storeToken(session.access_token);
  return session.user;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;

    async function restoreSession() {
      if (!getStoredToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const currentUser = await getCurrentUser();
        if (isCurrent) {
          setUser(currentUser);
        }
      } catch {
        clearStoredToken();
        if (isCurrent) {
          setUser(null);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    function handleUnauthorized() {
      clearStoredToken();
      if (isCurrent) {
        setUser(null);
      }
    }

    window.addEventListener("auth:logout", handleUnauthorized);
    return () => {
      isCurrent = false;
      window.removeEventListener("auth:logout", handleUnauthorized);
    };
  }, []);

  async function login(credentials) {
    const session = await loginUser(credentials);
    setUser(saveSession(session));
  }

  async function register(credentials) {
    const session = await registerUser(credentials);
    setUser(saveSession(session));
  }

  function logout() {
    clearStoredToken();
    setUser(null);
  }

  const value = useMemo(
    () => ({ isLoading, user, login, logout, register }),
    [isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}