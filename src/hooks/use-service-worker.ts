import { useEffect } from "react";

export function useServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("Service worker registered:", registration.scope);
      })
      .catch((error) => {
        console.log("Service worker registration failed:", error);
      });
  }, []);
}