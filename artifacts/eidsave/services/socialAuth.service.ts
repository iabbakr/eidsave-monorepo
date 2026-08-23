// Requires:
//   npx expo install expo-auth-session expo-apple-authentication expo-crypto expo-web-browser
//
// Env vars (app.config / .env, EXPO_PUBLIC_ prefix so they reach the client):
//   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
//   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
//   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID   (used as the "expoClientId" / web fallback)

import { useState, useCallback } from "react";
import { Platform } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import { useSocialAuthenticate, type SocialAuthResponse } from "@workspace/api-client-react";

WebBrowser.maybeCompleteAuthSession();

export function useSocialAuth() {
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState("");
  const socialMutation = useSocialAuthenticate();

  const [, googleResponse, googlePromptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  const signInWithGoogle = useCallback(async (): Promise<SocialAuthResponse | null> => {
    setError("");
    setLoading("google");
    try {
      const result = await googlePromptAsync();
      if (result.type !== "success") {
        if (result.type !== "cancel") setError("Google sign-in was cancelled or failed");
        return null;
      }
      const idToken = result.authentication?.idToken ?? result.params?.id_token;
      if (!idToken) {
        setError("Google did not return an ID token");
        return null;
      }
      return await socialMutation.mutateAsync({ provider: "google", idToken });
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Google sign-in failed";
      setError(msg);
      return null;
    } finally {
      setLoading(null);
    }
  }, [googlePromptAsync, socialMutation]);

  const signInWithApple = useCallback(async (): Promise<SocialAuthResponse | null> => {
    if (Platform.OS !== "ios") {
      setError("Apple sign-in is only available on iOS");
      return null;
    }
    setError("");
    setLoading("apple");
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        setError("Apple did not return an identity token");
        return null;
      }

      const name = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(" ")
        .trim();

      return await socialMutation.mutateAsync({
        provider: "apple",
        idToken: credential.identityToken,
        name: name || undefined,
      });
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === "ERR_REQUEST_CANCELED") return null;
      setError("Apple sign-in failed");
      return null;
    } finally {
      setLoading(null);
    }
  }, [socialMutation]);

  return { signInWithGoogle, signInWithApple, loading, error, setError, isAppleAvailable: Platform.OS === "ios" };
}
