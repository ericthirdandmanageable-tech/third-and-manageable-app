import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const isExpoGo = Constants.appOwnership === "expo";

// Configure notification handler (skip in Expo Go where it's unsupported)
try {
  if (!isExpoGo) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch {
  // Silently ignore in environments where notifications aren't available
}

/**
 * Register for push notifications and return the Expo push token.
 * Returns null if permissions are denied or running in simulator.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications are not available in Expo Go (SDK 53+)
  if (isExpoGo) {
    console.log(
      "Push notifications are not supported in Expo Go. Use a development build.",
    );
    return null;
  }

  if (!Device.isDevice) {
    console.log("Push notifications require a physical device.");
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request if not granted
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permission not granted.");
      return null;
    }

    // Android channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("daily-reminder", {
        name: "Daily Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#040485",
      });
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch (err) {
    console.log("Push notification setup skipped:", err);
    return null;
  }
}

/**
 * Schedule a daily check-in reminder at a given hour (local time).
 * Cancels any existing daily reminders first.
 */
export async function scheduleDailyReminder(hour: number = 9): Promise<void> {
  if (isExpoGo) return;
  try {
    // Cancel existing daily reminders
    await cancelDailyReminder();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time to Check In",
        body: "Take a moment to reflect on your day. Your journey matters.",
        data: { screen: "check-in" },
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
      },
    });
  } catch {
    // Silently ignore scheduling errors in unsupported environments
  }
}

/**
 * Cancel all scheduled daily reminder notifications.
 */
export async function cancelDailyReminder(): Promise<void> {
  if (isExpoGo) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Silently ignore
  }
}

/**
 * Get all currently scheduled notifications (for debugging).
 */
export async function getScheduledNotifications() {
  if (isExpoGo) return [];
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch {
    return [];
  }
}
