import { useEffect } from "react";
import { useNavigate } from "react-router";
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { isNative } from "@/lib/capacitor";

export function useDeepLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNative) return;

    const handleUrlOpen = (event: URLOpenListenerEvent) => {
      try {
        const url = new URL(event.url);
        const path = url.pathname + url.search;

        if (
          path.startsWith("/verify-email") ||
          path.startsWith("/reset-password")
        ) {
          navigate(path);
        } else if (path !== "/") {
          navigate(path);
        }
      } catch {
        // Invalid URL, ignore
      }
    };

    App.addListener("appUrlOpen", handleUrlOpen);

    return () => {
      App.removeAllListeners();
    };
  }, [navigate]);
}
