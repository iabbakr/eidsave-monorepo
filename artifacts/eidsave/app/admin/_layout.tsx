import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useGetUserProfile } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

export default function AdminLayout() {
  const colors = useColors();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useGetUserProfile();

  const role = profile?.role ?? user?.role;
  const isAdmin = role === "admin";
  const loading = authLoading || profileLoading;

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      router.replace("/(tabs)/profile");
    }
  }, [loading, isAdmin, router]);

  if (loading || !isAdmin) {
    return (
      <View style={[styles.guard, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  guard: { flex: 1, alignItems: "center", justifyContent: "center" },
});
