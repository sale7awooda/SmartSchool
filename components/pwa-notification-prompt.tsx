'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Bell, X, DownloadCloud, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeUserToPush } from '@/lib/push-notifications';
import { toast } from 'sonner';

export function PwaNotificationPrompt() {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(true); // Assume true until checked
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [needsNotification, setNeedsNotification] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (typeof window === 'undefined') return;

    // Check Installation Status
    const checkIsInstalled = () => {
      return window.matchMedia('(display-mode: standalone)').matches || 
             (window.navigator as any).standalone === true;
    };
    
    setIsInstalled(checkIsInstalled());

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstalled(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Initial check for permissions
    const isDismissed = localStorage.getItem('unified-prompt-dismissed') === 'true';
    const isNotifDefault = 'Notification' in window && Notification.permission === 'default';
    setNeedsNotification(isNotifDefault);

    if (!isDismissed && (isNotifDefault || (!checkIsInstalled() && deferredPrompt))) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2500);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [user, deferredPrompt]);

  const handleAction = async () => {
    setIsProcessing(true);

    try {
      if (!isInstalled && deferredPrompt) {
        // Step 1: Install
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          // Don't close yet, proceed to notification if needed
        } else {
          setIsProcessing(false);
          return; // They refused install, let them be
        }
      }

      if (needsNotification) {
        // Step 2: Push Notifications
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Background registration to keep UI instant
          subscribeUserToPush(user!).then(() => {
            toast.success('Awesome! Push notifications are now enabled.');
          }).catch(console.error);
        }
        setNeedsNotification(false);
      }
      
      setShowPrompt(false);
    } catch (error: any) {
      console.error('Unified prompt error:', error);
      toast.error(error.message || 'Action could not be completed entirely.');
      // If notification threw an error after resolving install, we still dismiss.
      setShowPrompt(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('unified-prompt-dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt || (!needsNotification && isInstalled)) return null;

  const isInstallOnly = !isInstalled && deferredPrompt && !needsNotification;
  const isNotifOnly = (isInstalled || !deferredPrompt) && needsNotification;
  const isBoth = !isInstalled && deferredPrompt && needsNotification;

  let title = 'App Setup Required';
  let desc = 'Complete setup to get the best experience.';
  let btnText = 'Complete Setup';
  let Icon = CheckCircle2;

  if (isBoth) {
    title = 'Install & Enable Alerts';
    desc = 'Install the app and enable notifications for live updates and offline access.';
    btnText = 'Set Up Now';
    Icon = DownloadCloud;
  } else if (isInstallOnly) {
    title = 'Install the App';
    desc = 'Add to your homescreen for instant access and a blazing fast experience.';
    btnText = 'Install App';
    Icon = DownloadCloud;
  } else if (isNotifOnly) {
    title = 'Enable Lockscreen Alerts';
    desc = 'Get live announcements & urgent alerts straight to your device.';
    btnText = 'Activate Alerts';
    Icon = Bell;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 bg-card border border-border p-5 rounded-2xl shadow-xl z-50 flex flex-col gap-4"
        id="unified-pwa-prompt"
      >
        <div className="flex gap-3">
          <div className="p-3 bg-primary/10 rounded-xl text-primary flex items-center justify-center shrink-0 w-11 h-11">
            <Icon className="animate-bounce" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-foreground">{title}</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {desc}
            </p>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground shrink-0 p-1 rounded-full hover:bg-muted self-start transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex justify-end gap-2.5">
          <button
            onClick={handleDismiss}
            disabled={isProcessing}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-xs font-bold rounded-xl transition-all disabled:opacity-50"
          >
            Maybe Later
          </button>
          <button
            onClick={handleAction}
            disabled={isProcessing}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl shadow-sm transition-all shadow-primary/20 flex items-center gap-2 disabled:opacity-75"
          >
            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : null}
            {isProcessing ? 'Processing...' : btnText}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
