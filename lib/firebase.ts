import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeAuth } from "@firebase/auth";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Firebase 12 no longer exposes `getReactNativePersistence` through the
// public `firebase/auth` entrypoint Metro resolves. This is the small adapter
// Firebase documents for React Native: it gives Auth a constructable LOCAL
// persistence implementation backed by AsyncStorage.
function getReactNativePersistence(storage: typeof AsyncStorage) {
  return class {
    static type: "LOCAL" = "LOCAL";
    readonly type = "LOCAL";

    async _isAvailable(): Promise<boolean> {
      try {
        const key = "firebase:auth:storage-available";
        await storage.setItem(key, "1");
        await storage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    }

    _set(key: string, value: unknown): Promise<void> {
      return storage.setItem(key, JSON.stringify(value));
    }

    async _get<T>(key: string): Promise<T | null> {
      const value = await storage.getItem(key);
      return value ? (JSON.parse(value) as T) : null;
    }

    _remove(key: string): Promise<void> {
      return storage.removeItem(key);
    }

    _addListener(): void {}
    _removeListener(): void {}
  };
}

let auth: Auth;
if (Platform.OS === "web") {
  // Expo Router evaluates routes in Node while creating a static web export.
  // The public entrypoint registers the Auth component in both browser and
  // server environments; React Native's AsyncStorage persistence is native-only.
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error: any) {
    // Expo Fast Refresh can re-evaluate this module after Auth already exists.
    // Reuse only that known Firebase initialization condition; configuration and
    // persistence errors must still stop the replacement client from starting.
    if (error?.code !== "auth/already-initialized") throw error;
    auth = getAuth(app);
  }
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
