import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: "deposit" | "withdrawal" | "order" | "group" | "security" | "system";
  reference?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  pushToken: string | null;
  settings: {
    depositNotifs: boolean;
    eidReminders: boolean;
    deliveryUpdates: boolean;
    marketingNotifs: boolean;
  };
  setPushToken: (token: string) => void;
  addNotification: (notification: Omit<AppNotification, "id" | "read" | "createdAt">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  updateSetting: (key: keyof NotificationState["settings"], value: boolean) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      pushToken: null,
      settings: {
        depositNotifs: true,
        eidReminders: true,
        deliveryUpdates: true,
        marketingNotifs: false,
      },
      setPushToken: (token) => set({ pushToken: token }),
      addNotification: (notif) => {
        const newNotif: AppNotification = {
          ...notif,
          id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          read: false,
          createdAt: new Date().toISOString(),
        };
        const updated = [newNotif, ...get().notifications];
        set({
          notifications: updated,
          unreadCount: updated.filter((n) => !n.read).length,
        });
      },
      markAsRead: (id) => {
        const updated = get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
        set({
          notifications: updated,
          unreadCount: updated.filter((n) => !n.read).length,
        });
      },
      markAllAsRead: () => {
        const updated = get().notifications.map((n) => ({ ...n, read: true }));
        set({ notifications: updated, unreadCount: 0 });
      },
      updateSetting: (key, value) => {
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        }));
      },
      clearAll: () => set({ notifications: [], unreadCount: 0 }),
    }),
    {
      name: "eidsave-notifications",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);