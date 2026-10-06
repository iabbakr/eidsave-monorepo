import { useEffect } from "react";
import { useRouter } from "expo-router";

// /edit-profile has moved to /profile-settings as part of the new
// Profile IA (account details are now view-only + locked; only the
// avatar stays editable in-app). Kept as a redirect so any existing
// router.push("/edit-profile") calls — e.g. in profile.tsx and
// complete-profile.tsx — don't 404 while call sites get migrated.
export default function EditProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/profile-settings");
  }, [router]);

  return null;
}