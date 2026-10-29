"use client";

import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already running standalone (installed PWA)
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isStandaloneMode);
    if (isStandaloneMode) return;

    // Check if previously dismissed in this session
    const dismissed = sessionStorage.getItem("pwa_install_dismissed");
    if (dismissed) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Handler for Android / Chrome / Edge install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // On iOS Safari, show prompt if in Safari and not standalone
    if (isIosDevice && !isStandaloneMode) {
      // Delay slightly so it doesn't distract immediately
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("pwa_install_dismissed", "true");
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <aside
      aria-label="App installation notification"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-bounce-subtle"
    >
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700/60 flex items-start space-x-3.5">
        <div className="p-2.5 bg-indigo-600 rounded-xl shrink-0 mt-0.5">
          <Download className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-white flex items-center space-x-1.5">
            <span>Install TaskTracker App</span>
            <span className="bg-indigo-500/30 text-indigo-300 text-[10px] px-1.5 py-0.2 rounded font-semibold">
              Instant Access
            </span>
          </div>

          {isIOS ? (
            <p className="text-[11px] text-slate-300 mt-1 leading-snug">
              Tap the <span className="inline-flex items-center font-bold text-indigo-300"><Share className="w-3 h-3 mx-0.5" /> Share</span> button below, then tap <strong className="text-white">"Add to Home Screen"</strong>.
            </p>
          ) : (
            <p className="text-[11px] text-slate-300 mt-1 leading-snug">
              Add TaskTracker to your home screen for quick 1-tap launch without the browser bar.
            </p>
          )}

          {!isIOS && deferredPrompt && (
            <div className="mt-3 flex items-center space-x-2">
              <button
                onClick={handleInstallClick}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                Install Now
              </button>
              <button
                onClick={handleDismiss}
                className="px-2.5 py-1.5 text-slate-400 hover:text-white text-xs font-medium"
              >
                Maybe Later
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-md transition shrink-0"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
