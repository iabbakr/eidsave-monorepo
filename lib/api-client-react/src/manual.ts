// Hand-written hooks that sit alongside the orval-generated client in
// this package. Once /otp/*, /auth/social, and /user/profile (for
// complete-profile) are added to openapi.yaml and `orval` is re-run,
// these can be deleted and call sites pointed at the generated hooks —
// the request/response shapes here match exactly.
//
// Export this file from ./index.ts:
//   export * from "./manual";

import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { UserProfile, AuthResponse } from "./generated/api.schemas";

// ---------- /otp/send-verification ----------

export interface SendOtpRequest {
  email: string;
}

export interface SendOtpResponse {
  message: string;
  success: boolean;
}

export function useSendOtp(): UseMutationResult<SendOtpResponse, unknown, SendOtpRequest> {
  return useMutation({
    mutationFn: (body: SendOtpRequest) =>
      customFetch<SendOtpResponse>("/api/v1/otp/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
  });
}

// ---------- /otp/verify-email ----------

export interface VerifyOtpRequest {
  email: string;
  code: string;
}

export interface VerifyOtpResponse {
  message: string;
  success: boolean;
}

export function useVerifyOtp(): UseMutationResult<VerifyOtpResponse, unknown, VerifyOtpRequest> {
  return useMutation({
    mutationFn: (body: VerifyOtpRequest) =>
      customFetch<VerifyOtpResponse>("/api/v1/otp/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
  });
}

// ---------- /auth/register (with confirmPassword + split address) ----------

export interface RegisterWithConfirmRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  address: {
    state: string;
    city: string;
    area: string;
    address: string;
  };
  nextOfKin?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export function useRegisterWithConfirm(): UseMutationResult<AuthResponse, unknown, RegisterWithConfirmRequest> {
  return useMutation({
    mutationFn: (body: RegisterWithConfirmRequest) =>
      customFetch<AuthResponse>("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
  });
}

// ---------- /auth/social ----------

export interface SocialAuthRequest {
  provider: "google" | "apple";
  idToken: string;
  name?: string;
}

export interface SocialAuthResponse {
  token: string;
  user: UserProfile;
  isNewUser: boolean;
  requiresPin: boolean;
}

export function useSocialAuthenticate(): UseMutationResult<SocialAuthResponse, unknown, SocialAuthRequest> {
  return useMutation({
    mutationFn: (body: SocialAuthRequest) =>
      customFetch<SocialAuthResponse>("/api/v1/auth/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
  });
}

// ---------- /user/profile (gated onboarding submit) ----------

export interface CompleteProfileRequest {
  phone: string;
  address: {
    state: string;
    city: string;
    area: string;
    address: string;
  };
  nextOfKin?: {
    name: string;
    phone: string;
    relationship: string;
  };
  profileSetupCompleted: true;
}

export function useCompleteProfile(): UseMutationResult<UserProfile, unknown, CompleteProfileRequest> {
  return useMutation({
    mutationFn: (body: CompleteProfileRequest) =>
      customFetch<UserProfile>("/api/v1/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
  });
}