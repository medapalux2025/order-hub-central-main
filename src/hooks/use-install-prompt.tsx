import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallPromptValue = {
  canInstall: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<boolean>;
};

const InstallPromptContext = createContext<InstallPromptValue | null>(null);

export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const beforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const installed = () => setIsInstalled(true);

    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installed);

    if (
      ("standalone" in window.navigator && window.navigator.standalone) ||
      window.matchMedia("(display-mode: standalone)").matches
    ) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
    return outcome === "accepted";
  }, [deferredPrompt]);

  const value = useMemo<InstallPromptValue>(
    () => ({
      canInstall: !!deferredPrompt && !isInstalled,
      isInstalled,
      promptInstall,
    }),
    [deferredPrompt, isInstalled, promptInstall],
  );

  return <InstallPromptContext.Provider value={value}>{children}</InstallPromptContext.Provider>;
}

export function useInstallPrompt(): InstallPromptValue {
  const ctx = useContext(InstallPromptContext);
  if (!ctx) throw new Error("useInstallPrompt must be used inside InstallPromptProvider");
  return ctx;
}
