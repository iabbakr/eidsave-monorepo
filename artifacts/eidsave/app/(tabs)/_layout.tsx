import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";

  // Safe device notification registration hook
  usePushNotifications();

  // Dynamic bottom padding for device navigation bars and gestures
  const tabBottomPadding = Math.max(insets.bottom, 12);
  const tabHeight = 60 + tabBottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 8,
          height: tabHeight,
          paddingBottom: tabBottomPadding,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint={isDark ? "dark" : "extraLight"}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ),
      }}
    >
      {/* 1. Home Dashboard */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />

      {/* 2. Eid al-Adha Savings */}
      <Tabs.Screen
        name="adha"
        options={{
          title: "Adha",
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="weather-night" size={22} color={color} />,
        }}
      />

      {/* 3. Eid al-Fitr & Group Cow Savings */}
      <Tabs.Screen
        name="fitr"
        options={{
          title: "Fitr",
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="star-crescent" size={22} color={color} />,
        }}
      />

      {/* 4. Animal Catalog */}
      <Tabs.Screen
        name="catalog"
        options={{
          title: "Catalog",
          tabBarIcon: ({ color, size }) => <Feather name="grid" size={size} color={color} />,
        }}
      />

      {/* 5. User Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}