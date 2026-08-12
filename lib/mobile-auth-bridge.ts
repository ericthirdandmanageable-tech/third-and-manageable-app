import { account } from "@/lib/appwrite";
import { auth } from "@/lib/firebase";
import {
  signInWithCustomToken,
  signOut as signOutFirebase,
} from "firebase/auth";
import { createMobileAuthBridge } from "@/lib/mobile-auth-bridge-core";

export const {
  bootstrapFirebaseSession,
  clearFirebaseSession,
  revokeFirebaseSession,
} = createMobileAuthBridge({
  account,
  auth,
  signInWithCustomToken,
  signOutFirebase,
});
