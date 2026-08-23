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

const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// Google's hook throws if the client ID for the current platform is
// missing, which would otherwise crash the whole login screen whenever
// OAuth env vars aren't configured yet (e.g. local dev without Google
// Cloud credentials set up). Only pass real client IDs once the
// platform-relevant one is actually present.
const isGoogleConfigured =
  Platform.OS === "android"
    ? Boolean(GOOGLE_ANDROID_CLIENT_ID)
    : Platform.OS === "ios"
      ? Boolean(GOOGLE_IOS_CLIENT_ID)
      : Boolean(GOOGLE_WEB_CLIENT_ID);

export function useSocialAuth() {
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState("");
  const socialMutation = useSocialAuthenticate();

  const [, googleResponse, googlePromptAsync] = Google.useIdTokenAuthRequest(
    isGoogleConfigured
      ? {
          iosClientId: GOOGLE_IOS_CLIENT_ID,
          androidClientId: GOOGLE_ANDROID_CLIENT_ID,
          clientId: GOOGLE_WEB_CLIENT_ID,
        }
      : // Placeholder request so the hook never receives an undefined
        // client ID for the active platform. promptAsync() is never
        // called for this state (see signInWithGoogle below), so this
        // config is inert.
        { iosClientId: undefined, androidClientId: undefined, clientId: "unconfigured" },
  );

  const signInWithGoogle = useCallback(async (): Promise<SocialAuthResponse | null> => {
    if (!isGoogleConfigured) {
      setError("Google sign-in isn't configured yet. Set EXPO_PUBLIC_GOOGLE_*_CLIENT_ID in your .env.");
      return null;
    }
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

  return {
    signInWithGoogle,
    signInWithApple,
    loading,
    error,
    setError,
    isGoogleAvailable: isGoogleConfigured,
    isAppleAvailable: Platform.OS === "ios",
  };
}