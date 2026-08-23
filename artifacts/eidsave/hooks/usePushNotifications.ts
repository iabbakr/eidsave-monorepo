import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import { useRegisterPushToken } from "@workspace/api-client-react";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useAuth } from "@/hooks/useAuth";

// Detect if running inside the Expo Go sandbox
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === "expo";

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

interface SafePermissionStatus {
  status?: string;
  granted?: boolean;
}

export function usePushNotifications() {
  const { token } = useAuth();
  const registerPushMutation = useRegisterPushToken();
  const { setPushToken, addNotification } = useNotificationStore();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!token) return;

    async function registerForPush() {
      // Bypass remote token registration inside Expo Go
      if (isExpoGo) {
        console.warn(
          "[PushNotifications] Running inside Expo Go: Remote push notifications require a Development Build (EAS/npx expo run:android). Local in-app notifications remain active."
        );
        return;
      }

      if (!Device.isDevice) return;

      try {
        const currentPerms = (await Notifications.getPermissionsAsync()) as unknown as SafePermissionStatus;
        let isGranted = currentPerms.granted ?? (currentPerms.status === "granted");

        if (!isGranted) {
          const requestedPerms = (await Notifications.requestPermissionsAsync()) as unknown as SafePermissionStatus;
          isGranted = requestedPerms.granted ?? (requestedPerms.status === "granted");
        }

        if (!isGranted) return;

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#1A6B3A",
          });
        }

        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId;

        const tokenResponse = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );

        const expoToken = tokenResponse.data;
        setPushToken(expoToken);

        await registerPushMutation.mutateAsync({
          data: { token: expoToken },
        });
      } catch (err) {
        console.warn("Push token registration bypassed or failed:", err);
      }
    }

    registerForPush();

    if (!isExpoGo) {
      notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
        addNotification({
          title: notification.request.content.title ?? "EidSave Alert",
          body: notification.request.content.body ?? "",
          type: "system",
        });
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        const notifData = response.notification.request.content.data;
        console.log("Notification tapped:", notifData);
      });
    }

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, [token]);
}