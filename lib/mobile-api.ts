import { account } from "@/lib/appwrite";
import { createMobileApi } from "@/lib/mobile-api-core";

export const mobileApi = createMobileApi({ account });
