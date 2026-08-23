import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/hooks/useAuth";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { LocationFilter, type LocationValue } from "@/components/LocationFilter";
import { OtpInput } from "@/components/OtpInput";
import {
  useSendOtp,
  useVerifyOtp,
  useRegisterWithConfirm,
} from "@workspace/api-client-react";

type Step = 1 | 2 | 3 | 4 | 5;
const TOTAL_STEPS = 5;
const STEPS = ["Account", "Verify Email", "Address", "Next of Kin", "Set PIN"];

function StepIndicator({ current, total, colors }: { current: Step; total: number; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.stepRow}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={styles.stepSegment}>
          <View style={[styles.stepDot, { backgroundColor: i + 1 <= current ? colors.primary : colors.muted }]} />
          {i < total - 1 && (
            <View style={[styles.stepLine, { backgroundColor: i + 1 < current ? colors.primary : colors.muted }]} />
          )}
        </View>
      ))}
    </View>
  );
}

function PinPad({ pin, onChange, colors }: { pin: string; onChange: (p: string) => void; colors: ReturnType<typeof useColors> }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
  const tap = (k: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (k === "⌫") { onChange(pin.slice(0, -1)); return; }
    if (k === "") return;
    if (pin.length < 6) onChange(pin + k);
  };
  return (
    <View>
      <View style={styles.pinDotsRow}>
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={[styles.pinDot, { backgroundColor: i < pin.length ? colors.primary : colors.muted, borderColor: colors.border }]} />
        ))}
      </View>
      <View style={styles.pinGrid}>
        {keys.map((k, i) => (
          <Pressable
            key={i}
            style={({ pressed }) => [styles.pinKey, { backgroundColor: pressed ? colors.muted : "transparent", borderRadius: colors.radius }]}
            onPress={() => tap(k)}
          >
            <Text style={[styles.pinKeyText, { color: k === "⌫" ? colors.destructive : colors.foreground }]}>{k}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const sendOtpMutation = useSendOtp();
  const verifyOtpMutation = useVerifyOtp();
  const registerMutation = useRegisterWithConfirm();

  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState("");

  // Step 1 — account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  // Step 2 — OTP
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step 3 — address
  const [location, setLocation] = useState<Partial<LocationValue>>({});
  const [address, setAddress] = useState("");

  // Step 4 — next of kin
  const [nkName, setNkName] = useState("");
  const [nkPhone, setNkPhone] = useState("");
  const [nkRel, setNkRel] = useState("");

  // Step 5 — PIN (kept client-side only for now; wire to /auth/set-pin
  // after registration succeeds, same as your existing flow)
  const [pin, setPin] = useState("");

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startResendTimer = (seconds = 60) => {
    setResendTimer(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const sendOtp = async () => {
    setError("");
    try {
      await sendOtpMutation.mutateAsync({ email: email.trim().toLowerCase() });
      setOtpSent(true);
      startResendTimer(60);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to send verification code";
      setError(msg);
    }
  };

  const verifyOtp = async () => {
    if (otpCode.length !== 6) { setError("Enter the complete 6-digit code"); return; }
    setError("");
    try {
      await verifyOtpMutation.mutateAsync({ email: email.trim().toLowerCase(), code: otpCode });
      setEmailVerified(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Incorrect or expired code";
      setError(msg);
      setOtpCode("");
    }
  };

  const nextStep = () => {
    setError("");
    if (step === 1) {
      if (!name || !email || !phone || !password || !confirmPassword) { setError("All fields are required"); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid email address"); return; }
      if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
      if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    }
    if (step === 2) {
      if (!emailVerified) { setError("Please verify your email to continue"); return; }
    }
    if (step === 3) {
      if (!location.state || !location.city || !location.area) { setError("Please select your state, city, and area"); return; }
      if (!address.trim()) { setError("Please enter your address"); return; }
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep((s) => (s + 1) as Step);
  };

  const handleSubmit = async () => {
    if (pin.length !== 6) { setError("Enter a 6-digit PIN"); return; }
    setError("");

    try {
      const result = await registerMutation.mutateAsync({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        confirmPassword,
        address: {
          state: location.state!,
          city: location.city!,
          area: location.area!,
          address: address.trim(),
        },
        nextOfKin: nkName ? { name: nkName, phone: nkPhone, relationship: nkRel } : undefined,
      });

      await login(result.token, result.user as Parameters<typeof login>[1]);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Registration failed. Please verify your details.";
      setError(msg);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => (step === 1 ? router.back() : setStep((s) => (s - 1) as Step))} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{STEPS[step - 1]}</Text>
        <View style={{ width: 36 }} />
      </View>

      <StepIndicator current={step} total={TOTAL_STEPS} colors={colors} />

      {step !== 5 ? (
        <KeyboardAwareScrollViewCompat style={styles.scroll} contentContainerStyle={styles.scrollContent} bottomOffset={20}>
          {step === 1 && (
            <View style={styles.form}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>Create your account</Text>
              <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>You're one step closer to stress-free Eid planning</Text>

              {[
                { label: "Full Name", value: name, set: setName, placeholder: "Abdullahi Ibrahim", auto: "words" as const },
                { label: "Email Address", value: email, set: setEmail, placeholder: "you@email.com", auto: "none" as const, keyboard: "email-address" as const },
                { label: "Phone Number", value: phone, set: setPhone, placeholder: "08012345678", keyboard: "phone-pad" as const },
              ].map((f) => (
                <View key={f.label} style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.foreground }]}>{f.label}</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    value={f.value}
                    onChangeText={f.set}
                    autoCapitalize={f.auto ?? "none"}
                    keyboardType={(f as { keyboard?: "email-address" | "phone-pad" }).keyboard}
                  />
                </View>
              ))}

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
                <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]}>
                  <TextInput
                    style={[styles.inputInner, { color: colors.foreground }]}
                    placeholder="At least 8 characters"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry={!passwordVisible}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <Pressable onPress={() => setPasswordVisible((v) => !v)} style={styles.eyeBtn}>
                    <Feather name={passwordVisible ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Confirm Password</Text>
                <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]}>
                  <TextInput
                    style={[styles.inputInner, { color: colors.foreground }]}
                    placeholder="Repeat your password"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry={!confirmVisible}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <Pressable onPress={() => setConfirmVisible((v) => !v)} style={styles.eyeBtn}>
                    <Feather name={confirmVisible ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.form}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>Verify your email</Text>
              <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
                We'll send a 6-digit code to {email || "your email"} to confirm it's really you
              </Text>

              {emailVerified ? (
                <View style={[styles.verifiedBadge, { backgroundColor: colors.success + "15", borderColor: colors.success + "30" }]}>
                  <Feather name="check-circle" size={16} color={colors.success} />
                  <Text style={[styles.verifiedText, { color: colors.success }]}>Email verified — you're good to go!</Text>
                </View>
              ) : !otpSent ? (
                <Pressable
                  style={[styles.btn, { backgroundColor: colors.primary, borderRadius: colors.radius, marginTop: 8 }]}
                  onPress={sendOtp}
                  disabled={sendOtpMutation.isPending}
                >
                  {sendOtpMutation.isPending ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                    <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Send Verification Code</Text>
                  )}
                </Pressable>
              ) : (
                <View style={{ gap: 20, marginTop: 8 }}>
                  <OtpInput value={otpCode} onChange={setOtpCode} />
                  <Pressable
                    style={[styles.btn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: otpCode.length < 6 ? 0.5 : 1 }]}
                    onPress={verifyOtp}
                    disabled={otpCode.length < 6 || verifyOtpMutation.isPending}
                  >
                    {verifyOtpMutation.isPending ? (
                      <ActivityIndicator color={colors.primaryForeground} />
                    ) : (
                      <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Confirm Code</Text>
                    )}
                  </Pressable>
                  <Pressable onPress={sendOtp} disabled={resendTimer > 0 || sendOtpMutation.isPending} style={{ alignItems: "center" }}>
                    <Text style={[styles.resendText, { color: resendTimer > 0 ? colors.mutedForeground : colors.primary }]}>
                      {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend code"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {step === 3 && (
            <View style={styles.form}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>Delivery address</Text>
              <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>We'll deliver your Eid animal here</Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>State, City & Area</Text>
                <LocationFilter value={location} onChange={(v) => setLocation(v)} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Address</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
                  placeholder="12 Ibrahim Taiwo Road"
                  placeholderTextColor={colors.mutedForeground}
                  value={address}
                  onChangeText={setAddress}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {step === 4 && (
            <View style={styles.form}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>Next of kin</Text>
              <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>Optional — helps us reach someone if we can't contact you</Text>
              {[
                { label: "Full Name", value: nkName, set: setNkName, placeholder: "Fatimah Ibrahim" },
                { label: "Phone Number", value: nkPhone, set: setNkPhone, placeholder: "08012345678", keyboard: "phone-pad" as const },
                { label: "Relationship", value: nkRel, set: setNkRel, placeholder: "Sister, Father, etc." },
              ].map((f) => (
                <View key={f.label} style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.foreground }]}>{f.label}</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    value={f.value}
                    onChangeText={f.set}
                    keyboardType={(f as { keyboard?: "phone-pad" }).keyboard}
                    autoCapitalize="words"
                  />
                </View>
              ))}
            </View>
          )}

          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

          {step !== 2 && (
            <Pressable style={[styles.btn, { backgroundColor: colors.primary, borderRadius: colors.radius }]} onPress={nextStep}>
              <Text style={[styles.btnText, { color: colors.primaryForeground }]}>{step === 4 ? "Continue" : "Next"}</Text>
              <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
            </Pressable>
          )}

          {step === 4 && (
            <Pressable onPress={nextStep} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip for now</Text>
            </Pressable>
          )}
        </KeyboardAwareScrollViewCompat>
      ) : (
        <View style={[styles.pinStep, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={[styles.stepTitle, { color: colors.foreground, textAlign: "center" }]}>Set your security PIN</Text>
          <Text style={[styles.stepSub, { color: colors.mutedForeground, textAlign: "center", marginBottom: 32 }]}>
            You'll use this to confirm sensitive actions
          </Text>
          <PinPad pin={pin} onChange={setPin} colors={colors} />
          {error ? <Text style={[styles.error, { color: colors.destructive, textAlign: "center" }]}>{error}</Text> : null}
          <Pressable
            style={[styles.btn, { backgroundColor: colors.primary, borderRadius: colors.radius, marginTop: 24 }]}
            onPress={handleSubmit}
            disabled={registerMutation.isPending || pin.length !== 6}
          >
            {registerMutation.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Create Account</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  stepRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingHorizontal: 24, marginBottom: 24 },
  stepSegment: { flexDirection: "row", alignItems: "center", flex: 1 },
  stepDot: { width: 10, height: 10, borderRadius: 5 },
  stepLine: { flex: 1, height: 2, marginHorizontal: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  form: { gap: 16, marginBottom: 24 },
  stepTitle: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  stepSub: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: "500" },
  input: { height: 52, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  inputRow: { height: 52, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingLeft: 16 },
  inputInner: { flex: 1, fontSize: 16 },
  eyeBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  btn: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  btnText: { fontSize: 16, fontWeight: "600" },
  skipBtn: { alignItems: "center", marginTop: 12 },
  skipText: { fontSize: 14 },
  error: { fontSize: 13, marginTop: 4 },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  verifiedText: { fontSize: 14, fontWeight: "600" },
  resendText: { fontSize: 13, fontWeight: "600" },
  pinStep: { flex: 1, paddingHorizontal: 32, justifyContent: "center" },
  pinDotsRow: { flexDirection: "row", justifyContent: "center", gap: 14, marginBottom: 40 },
  pinDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  pinGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  pinKey: { width: "33.33%", height: 72, alignItems: "center", justifyContent: "center" },
  pinKeyText: { fontSize: 24, fontWeight: "400" },
});
