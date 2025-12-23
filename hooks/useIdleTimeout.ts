import { useEffect, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";

const IDLE_TIMEOUT_MS = 90 * 60 * 1000; // 90 minutes in milliseconds
const STORAGE_KEY = "siox_last_activity";
const CHECK_INTERVAL_MS = 30 * 1000; // Check every 30 seconds

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

function getSharedLastActivity(): number {
  if (typeof window === "undefined") return Date.now();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : Date.now();
  } catch {
    return Date.now();
  }
}

function setSharedLastActivity(timestamp: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, String(timestamp));
  } catch {
  }
}

export function useIdleTimeout() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = useCallback(() => {
    signOut({ callbackUrl: "/login?reason=idle" });
  }, []);

  const resetTimer = useCallback(() => {
    const now = Date.now();
    setSharedLastActivity(now);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const sharedLastActivity = getSharedLastActivity();
      const timeSinceActivity = Date.now() - sharedLastActivity;
      
      if (timeSinceActivity >= IDLE_TIMEOUT_MS) {
        handleLogout();
      } else {
        const remainingTime = IDLE_TIMEOUT_MS - timeSinceActivity;
        timeoutRef.current = setTimeout(() => {
          handleLogout();
        }, remainingTime);
      }
    }, IDLE_TIMEOUT_MS);
  }, [handleLogout]);

  const checkIdleStatus = useCallback(() => {
    const sharedLastActivity = getSharedLastActivity();
    const timeSinceActivity = Date.now() - sharedLastActivity;
    
    if (timeSinceActivity >= IDLE_TIMEOUT_MS) {
      handleLogout();
    }
  }, [handleLogout]);

  useEffect(() => {
    resetTimer();

    const handleActivity = () => {
      resetTimer();
    };

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkIdleStatus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        const sharedLastActivity = parseInt(e.newValue, 10);
        const timeSinceActivity = Date.now() - sharedLastActivity;
        const remainingTime = Math.max(0, IDLE_TIMEOUT_MS - timeSinceActivity);
        
        timeoutRef.current = setTimeout(() => {
          checkIdleStatus();
        }, remainingTime);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    intervalRef.current = setInterval(() => {
      checkIdleStatus();
    }, CHECK_INTERVAL_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });

      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [resetTimer, checkIdleStatus]);

  return {
    resetTimer,
    getTimeRemaining: () => {
      const sharedLastActivity = getSharedLastActivity();
      const elapsed = Date.now() - sharedLastActivity;
      return Math.max(0, IDLE_TIMEOUT_MS - elapsed);
    },
  };
}
