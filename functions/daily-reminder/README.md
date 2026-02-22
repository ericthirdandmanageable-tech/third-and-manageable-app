# Daily Reminder - Appwrite Function

This function sends daily check-in reminders to all registered users via the Expo Push API.

## Setup

1. Deploy this function to your Appwrite project.
2. Set up a CRON schedule: `0 9 * * *` (runs daily at 9:00 AM UTC).
3. Set the following environment variables in the Appwrite console:
   - `APPWRITE_DATABASE_ID` - Your database ID
   - `PUSH_TOKENS_COLLECTION_ID` - The collection storing push tokens

## How It Works

1. Queries the `push_tokens` collection to get all registered device tokens.
2. Sends a push notification to each token via the Expo Push API (`https://exp.host/--/api/v2/push/send`).
3. Logs results and removes invalid tokens.

## Expo Push API

The function uses the Expo Push API directly - no additional SDK needed.
Payload format:
```json
{
  "to": "ExponentPushToken[xxx]",
  "title": "Time to Check In",
  "body": "Take a moment to reflect on your day. Your journey matters.",
  "data": { "screen": "check-in" },
  "sound": "default"
}
```
