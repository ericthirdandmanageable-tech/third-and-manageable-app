/** Push-token registration through the authenticated product API. */
import { mobileApi } from "@/lib/mobile-api";

export async function storePushToken(
  _userId: string,
  token: string,
): Promise<void> {
  await mobileApi<{ registered: boolean }>("/notifications/push-token", {
    method: "POST",
    body: { token },
  });
}

export async function removePushToken(_userId: string): Promise<void> {
  await mobileApi<{ registered: boolean }>("/notifications/push-token", {
    method: "DELETE",
  });
}
