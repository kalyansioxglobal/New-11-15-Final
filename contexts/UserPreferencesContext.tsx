import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";
type Density = "comfortable" | "compact";
type FontSize = "small" | "medium" | "large";
type LandingPage = "freight" | "hotels" | "bpo" | "holdings";

export type UserPreferences = {
  id?: string;
  userId?: string;
  theme: Theme;
  density: Density;
  fontSize: FontSize;
  landingPage: LandingPage;
  layout?: any;
};

type UserPreferencesContextType = {
  preferences: UserPreferences | null;
  loading: boolean;
  savePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
};

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(
  undefined
);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPrefs() {
      try {
        setLoading(true);
        const res = await fetch("/api/user/preferences");
        if (res.status === 401) {
          if (!cancelled) setLoading(false);
          return;
        }
        if (!res.ok) {
          throw new Error("Failed to load preferences");
        }
        const data = await res.json();
        if (!cancelled) {
          setPreferences(data);
          applyTheme(data.theme);
          applyFontSize(data.fontSize);
        }
      } catch (error) {
        console.error("Error loading preferences", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPrefs();
    return () => {
      cancelled = true;
    };
  }, []);

  const savePreferences = async (updates: Partial<UserPreferences>) => {
    if (!preferences) return;

    const next = { ...preferences, ...updates };

    setPreferences(next);
    applyTheme(next.theme);
    applyFontSize(next.fontSize);

    const res = await fetch("/api/user/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        theme: next.theme,
        density: next.density,
        fontSize: next.fontSize,
        landingPage: next.landingPage,
        layout: next.layout,
      }),
    });

    if (!res.ok) {
      console.error("Failed to save preferences");
    }
  };

  const value: UserPreferencesContextType = {
    preferences,
    loading,
    savePreferences,
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) {
    throw new Error(
      "useUserPreferences must be used within a UserPreferencesProvider"
    );
  }
  return ctx;
}

function applyTheme(theme: Theme) {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  root.classList.remove("theme-light", "theme-dark");

  if (theme === "light") {
    root.classList.add("theme-light");
  } else if (theme === "dark") {
    root.classList.add("theme-dark");
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.add(prefersDark ? "theme-dark" : "theme-light");
  }
}

function applyFontSize(fontSize: FontSize) {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  root.classList.remove("font-small", "font-medium", "font-large");

  if (fontSize === "small") root.classList.add("font-small");
  if (fontSize === "medium") root.classList.add("font-medium");
  if (fontSize === "large") root.classList.add("font-large");
}
