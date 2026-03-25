import { useEffect } from "react";
import { useNavigate } from "react-router";
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { isNative } from "@/lib/capacitor";

export function useDeepLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNative) return;

    const allowedDeepLinkPaths = [
      "/verify-email",
      "/reset-password",
      "/login",
      "/signup",
    ];

    const handleUrlOpen = (event: URLOpenListenerEvent) => {
      try {
        const url = new URL(event.url);
        const path = url.pathname + url.search;

        const isAllowed = allowedDeepLinkPaths.some((allowed) =>
          path.startsWith(allowed),
        );

        if (isAllowed) {
          navigate(path);
        }
      } catch {
        // Invalid URL, ignore
      }
    };

    let handle: Awaited<ReturnType<typeof App.addListener>> | undefined;

    App.addListener("appUrlOpen", handleUrlOpen).then((h) => {
      handle = h;
    });

    return () => {
      handle?.remove();
    };
  }, [navigate]);
}
