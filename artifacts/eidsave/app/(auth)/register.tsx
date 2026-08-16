import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Modal,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/useAuth";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT-Abuja","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto",
  "Taraba","Yobe","Zamfara",
];

type Step = 1 | 2 | 3 | 4;

function StepIndicator({ current, total, colors }: { current: Step; total: number; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.stepRow}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={styles.stepSegment}>
          <View style={[styles.stepDot, {
            backgroundColor: i + 1 <= current ? colors.primary : colors.muted,
          }]} />
          {i < total - 1 && (
            <View style={[styles.stepLine, {
              backgroundColor: i + 1 < current ? colors.primary : colors.muted,
            }]} />
          )}
        </View>
      ))}
    </View>
  );
}

function PinPad({ pin, onChange, colors }: {
  pin: string;
  onChange: (p: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  const tap = (k: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (k === "⌫") { onChange(pin.slice(0,-1)); return; }
    if (k === "") return;
    if (pin.length < 6) onChange(pin + k);
  };

  return (
    <View>
      <View style={styles.pinDotsRow}>
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={[styles.pinDot, {
            backgroundColor: i < pin.length ? colors.primary : colors.muted,
            borderColor: colors.border,
          }]} />
        ))}
      </View>
      <View style={styles.pinGrid}>
        {keys.map((k, i) => (
          <Pressable
            key={i}
            style={({ pressed }) => [styles.pinKey, {
              backgroundColor: pressed ? colors.muted : "transparent",
              borderRadius: colors.radius,
            }]}
            onPress={() => tap(k)}
          >
            <Text style={[styles.pinKeyText, { color: k === "⌫" ? colors.destructive : colors.foreground }]}>
              {k}
            </Text>
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
  const registerMutation = useRegister();

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);

  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [town, setTown] = useState("");
  const [street, setStreet] = useState("");
  const [showStateModal, setShowStateModal] = useState(false);

  const [nkName, setNkName] = useState("");
  const [nkPhone, setNkPhone] = useState("");
  const [nkRel, setNkRel] = useState("");

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const nextStep = () => {
    setError("");
    if (step === 1) {
      if (!name || !email || !phone || !password) { setError("All fields are required"); return; }
      if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    }
    if (step === 2) {
      if (!state || !city || !street) { setError("State, city, and street are required"); return; }
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep((s) => (s + 1) as Step);
  };

  const handleSubmit = async () => {
    if (pin.length !== 6) { 
      setError("Enter a 6-digit PIN"); 
      return; 
    }
    setError("");

    try {
      const result = await registerMutation.mutateAsync({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password,
          pin, // Pass 6-digit security PIN
          address: { state, city, town, street },
          nextOfKin: nkName ? { name: nkName, phone: nkPhone, relationship: nkRel } : undefined,
        } as any,
      });

      await login(result.token, result.user as Parameters<typeof login>[1]);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Registration failed. Please verify your details.";
      setError(msg);
    }
  };

  const STEPS = ["Account", "Address", "Next of Kin", "Set PIN"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => step === 1 ? router.back() : setStep(s => (s - 1) as Step)} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {STEPS[step - 1]}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <StepIndicator current={step} total={4} colors={colors} />

      {step !== 4 ? (
        <KeyboardAwareScrollViewCompat
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          bottomOffset={20}
        >
          {step === 1 && (
            <View style={styles.form}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>Create your account</Text>
              <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
                You're one step closer to stress-free Eid planning
              </Text>
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
                  <Pressable onPress={() => setPasswordVisible(v => !v)} style={styles.eyeBtn}>
                    <Feather name={passwordVisible ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.form}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>Delivery address</Text>
              <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
                We'll deliver your Eid animal here
              </Text>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>State</Text>
                <Pressable
                  style={[styles.input, styles.selector, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]}
                  onPress={() => setShowStateModal(true)}
                >
                  <Text style={{ color: state ? colors.foreground : colors.mutedForeground }}>
                    {state || "Select your state"}
                  </Text>
                  <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>
              {[
                { label: "City / LGA", value: city, set: setCity, placeholder: "Kano Municipal" },
                { label: "Town / Area (optional)", value: town, set: setTown, placeholder: "Gwale" },
                { label: "Street Address", value: street, set: setStreet, placeholder: "12 Ibrahim Taiwo Road" },
              ].map((f) => (
                <View key={f.label} style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.foreground }]}>{f.label}</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    value={f.value}
                    onChangeText={f.set}
                    autoCapitalize="words"
                  />
                </View>
              ))}
            </View>
          )}

          {step === 3 && (
            <View style={styles.form}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>Next of kin</Text>
              <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
                Optional — helps us reach someone if we can't contact you
              </Text>
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

          {error ? (
            <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
          ) : null}

          <Pressable
            style={[styles.btn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            onPress={step < 3 ? nextStep : nextStep}
          >
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
              {step === 3 ? "Continue" : "Next"}
            </Text>
            <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
          </Pressable>

          {step === 3 && (
            <Pressable onPress={nextStep} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip for now</Text>
            </Pressable>
          )}
        </KeyboardAwareScrollViewCompat>
      ) : (
        <View style={[styles.pinStep, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={[styles.stepTitle, { color: colors.foreground, textAlign: "center" }]}>
            Set your security PIN
          </Text>
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

      <Modal visible={showStateModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select State</Text>
            <Pressable onPress={() => setShowStateModal(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>
          <FlatList
            data={NIGERIAN_STATES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.stateItem, { borderBottomColor: colors.border }]}
                onPress={() => { setState(item); setShowStateModal(false); }}
              >
                <Text style={[styles.stateItemText, { color: item === state ? colors.primary : colors.foreground }]}>
                  {item}
                </Text>
                {item === state && <Feather name="check" size={16} color={colors.primary} />}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  stepRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingHorizontal: 24, marginBottom: 24, gap: 0 },
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
  selector: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  btn: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  btnText: { fontSize: 16, fontWeight: "600" },
  skipBtn: { alignItems: "center", marginTop: 12 },
  skipText: { fontSize: 14 },
  error: { fontSize: 13, marginTop: 4 },
  pinStep: { flex: 1, paddingHorizontal: 32, justifyContent: "center" },
  pinDotsRow: { flexDirection: "row", justifyContent: "center", gap: 14, marginBottom: 40 },
  pinDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  pinGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  pinKey: { width: "33.33%", height: 72, alignItems: "center", justifyContent: "center" },
  pinKeyText: { fontSize: 24, fontWeight: "400" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 32 },
  modalTitle: { fontSize: 18, fontWeight: "600" },
  stateItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  stateItemText: { fontSize: 16 },
});
