import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

const STORAGE_KEY = "siox_test_mode";
const SEEDED_KEY = "siox_test_data_seeded";

type TestModeContextType = {
  testMode: boolean;
  setTestMode: (value: boolean) => void;
  isSeeding: boolean;
  seedError: string | null;
};

export const TestContext = createContext<TestModeContextType>({
  testMode: false,
  setTestMode: () => {},
  isSeeding: false,
  seedError: null,
});

function getStoredTestMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "true";
  } catch {
    return false;
  }
}

function wasAlreadySeeded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SEEDED_KEY) === "true";
  } catch {
    return false;
  }
}

function markAsSeeded() {
  try {
    localStorage.setItem(SEEDED_KEY, "true");
  } catch {}
}

export function TestModeProvider({ children }: { children: ReactNode }) {
  const [testMode, setTestModeState] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  const autoSeedTestData = useCallback(async () => {
    if (wasAlreadySeeded()) return;
    
    setIsSeeding(true);
    setSeedError(null);
    
    try {
      const res = await fetch("/api/admin/auto-seed-test-data", { method: "POST" });
      const data = await res.json();
      
      if (res.ok && data.hasData) {
        markAsSeeded();
        if (data.seeded) {
          window.location.reload();
        }
      } else if (!res.ok) {
        setSeedError(data.error || "Failed to seed test data");
      }
    } catch (err) {
      setSeedError(err instanceof Error ? err.message : "Failed to seed test data");
    } finally {
      setIsSeeding(false);
    }
  }, []);

  useEffect(() => {
    const stored = getStoredTestMode();
    setTestModeState(stored);
    setIsHydrated(true);
    
    if (stored) {
      autoSeedTestData();
    }
  }, [autoSeedTestData]);

  const setTestMode = useCallback((value: boolean) => {
    setTestModeState(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {}
    
    if (value) {
      autoSeedTestData();
    }
  }, [autoSeedTestData]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const newValue = e.newValue === "true";
        setTestModeState(newValue);
        if (newValue) {
          autoSeedTestData();
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [autoSeedTestData]);

  return (
    <TestContext.Provider value={{ 
      testMode: isHydrated ? testMode : false, 
      setTestMode,
      isSeeding,
      seedError,
    }}>
      {children}
    </TestContext.Provider>
  );
}

export function useTestMode() {
  return useContext(TestContext);
}
