import { useState, useEffect } from "react";

/**
 * Hook to track connection status and resuming state
 */
export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [isResuming, setIsResuming] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsConnected(true);
      setIsResuming(false);
    };

    const handleOffline = () => {
      setIsConnected(false);
      setIsResuming(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setIsConnected(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const startResuming = () => setIsResuming(true);
  const stopResuming = () => setIsResuming(false);

  return {
    isConnected,
    isResuming,
    startResuming,
    stopResuming,
  };
}
