import React, { createContext, useContext, useState, useEffect } from "react";

/**
 * Context for the global user state (API Key and credits)
 * @module user-state-context
 */

interface UserStateContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  credits: number | null;
  setCredits: (c: number | null) => void;
  refreshCredits: () => Promise<void>;
  initialized: boolean;
}

const UserStateContext = createContext<UserStateContextType | undefined>(
  undefined
);

export function useUserState() {
  const ctx = useContext(UserStateContext);
  if (!ctx)
    throw new Error("useUserState must be used within UserStateProvider");
  return ctx;
}

export function UserStateProvider({ children }: { children: React.ReactNode }) {
  // Synchronous initialization
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("nvmApiKey") || ""
  );
  const [credits, setCredits] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Refreshes the credits from the backend
  const refreshCredits = async () => {
    try {
      if (!apiKey) {
        setCredits(null);
        return;
      }
      const resp = await fetch("/api/credit", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!resp.ok) throw new Error();
      const data = await resp.json();
      setCredits(typeof data.credit === "number" ? data.credit : null);
    } catch {
      setCredits(null);
    }
  };

  // Refresh credits when the API Key changes
  useEffect(() => {
    (async () => {
      await refreshCredits();
      setInitialized(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // Listen for changes in localStorage to refresh credits after burning in other tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "nvmCreditsUpdated") {
        refreshCredits();
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  return (
    <UserStateContext.Provider
      value={{
        apiKey,
        setApiKey,
        credits,
        setCredits,
        refreshCredits,
        initialized,
      }}
    >
      {children}
    </UserStateContext.Provider>
  );
}
