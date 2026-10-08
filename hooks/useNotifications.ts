import { useState, useEffect, useCallback } from "react";
import { useStudyStore } from "@/store/useStudyStore";
import { toast } from "sonner";
import { format } from "date-fns";

export function useNotifications() {
  const settings = useStudyStore((s) => s.settings);
  const lectures = useStudyStore((s) => s.lectures);
  const sessions = useStudyStore((s) => s.sessions);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Register service worker if supported
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Service worker registered with scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("Service worker registration failed:", err);
        });
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Notifications are not supported on this browser.");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        toast.success("Notifications enabled!");
        return true;
      } else {
        toast.error("Notification permission was denied.");
        return false;
      }
    } catch (e) {
      console.error(e);
      return false;
    }
  }, []);

  const triggerNotification = useCallback((title: string, body: string) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    if (Notification.permission === "granted") {
      try {
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, {
              body,
              icon: "/icon.svg",
              badge: "/icon.svg",
              vibrate: [200, 100, 200],
            } as any);
          });
        } else {
          new Notification(title, {
            body,
            icon: "/icon.svg",
          });
        }
      } catch (err) {
        console.warn("Error firing notification:", err);
      }
    }
  }, []);

  const sendTestNotification = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Notifications are not supported in your browser.");
      return;
    }

    if (Notification.permission !== "granted") {
      toast.error("Please grant notification permission first in Settings.");
      return;
    }

    const todayStr = format(new Date(), "yyyy-MM-dd");
    const todayLectures = lectures.filter((l) => l.scheduledDate === todayStr);
    const pendingCount = todayLectures.filter((l) => !l.completed).length;

    triggerNotification(
      "⚡ Study Tracker Reminder",
      `Aaj ke lectures: ${pendingCount > 0 ? pendingCount : 0} pending. Streak bachaye rakh! Chal uth, padhai kar!`
    );
    toast.success("Test notification fired!");
  }, [lectures, triggerNotification]);

  // Periodic reminder scheduler in browser
  useEffect(() => {
    if (!settings.reminderEnabled || permission !== "granted") return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentHM = format(now, "HH:mm");
      const seconds = now.getSeconds();

      // Trigger within the first 10 seconds of the configured minute
      if (seconds < 10) {
        const todayStr = format(now, "yyyy-MM-dd");
        const todayLectures = lectures.filter((l) => l.scheduledDate === todayStr);
        const pending = todayLectures.filter((l) => !l.completed).length;

        if (currentHM === settings.reminderTime) {
          triggerNotification(
            "📚 Study Tracker: Daily Mission",
            `Aaj ke ${pending} lectures bache hain. Let's conquer them! Chal uth, padhai kar!`
          );
        }

        // Evening Nudge
        if (settings.eveningReminderEnabled && currentHM === settings.eveningReminderTime) {
          const completedToday = lectures.filter(
            (l) => l.completed && l.completedAt && l.completedAt.startsWith(todayStr)
          ).length;

          if (completedToday === 0) {
            triggerNotification(
              "⚠️ Evening Nudge: Streak Danger!",
              "Aaj abhi tak 0 lectures complete hue hain! At least ek video ya 20 min padhke streak bacha lo."
            );
          }
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [settings, permission, lectures, triggerNotification]);

  return {
    permission,
    requestPermission,
    sendTestNotification,
    triggerNotification,
  };
}
