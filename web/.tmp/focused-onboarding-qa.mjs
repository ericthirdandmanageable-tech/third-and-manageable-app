import { chromium } from "/tmp/tm-visual-qa.sgOVKU/node_modules/playwright-core/index.mjs";

const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
});
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const user = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "fresh@example.com",
    display_name: "Fresh Athlete",
    school: "Bowling Green State University",
    status: "transitioning",
    headline: null,
    verified: false,
};
const calls = [];
const errors = [];

page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
});
page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
await page.route("**/bridge/**", async (route) => {
    const request = route.request();
    const endpoint = new URL(request.url()).pathname.replace(/^\/bridge/, "");
    calls.push({
        endpoint,
        method: request.method(),
        body: request.postDataJSON?.() ?? null,
    });
    const body =
        endpoint === "/auth/me"
            ? user
            : endpoint === "/game-plan"
              ? {
                    intake_done: false,
                    skill_map: [],
                    path_fit: [],
                    committed_path_id: null,
                    weekly_actions: [],
                    completed_action_ids: [],
                    day: 0,
                    streak: 0,
                    total_days: 90,
                    phase: { id: "foundation", name: "Foundation" },
                    check_in_count: 0,
                }
              : endpoint === "/profile" && request.method() === "PATCH"
                ? user
                : { status: "ok" };
    await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
    });
});
await page.addInitScript(
    ({ storedUser }) => {
        localStorage.setItem("tm_access_token", "visual-qa-token");
        localStorage.setItem("tm_user", JSON.stringify(storedUser));
    },
    { storedUser: user },
);
await page.goto("http://127.0.0.1:3001/onboarding", {
    waitUntil: "networkidle",
    timeout: 30_000,
});
await page.getByRole("button", { name: /get started/i }).click();
await page.getByRole("button", { name: /transitioned or am transitioning/i }).click();
await page.getByRole("button", { name: /^next/i }).click();

await page.getByRole("button", { name: "Football", exact: true }).click();
await page.getByRole("button", { name: /^next/i }).click();
await page.getByRole("button", { name: /captain/i }).click();
await page.getByRole("button", { name: /^next/i }).click();
await page.getByRole("button", { name: "5–9 years", exact: true }).click();
await page.getByRole("button", { name: /^next/i }).click();
await page.getByRole("textbox").fill("When the game was close and the team needed calm.");
await page.getByRole("button", { name: /^next/i }).click();
await page.getByRole("button", { name: "The team", exact: true }).click();
await page.getByRole("button", { name: /build my skill map/i }).click();

await page.getByRole("button", { name: /count me in/i }).click();
await page.getByRole("button", { name: /finish/i }).click();
await page.getByRole("heading", { name: /you.re in the game/i }).waitFor();
await page.waitForTimeout(400);
await page.screenshot({
    path: "/Users/lucascardoso/Documents/GitHub/3rd_and_manageable/.tmp/browser-shots/onboarding-complete-mobile.png",
    fullPage: false,
});

console.log(
    JSON.stringify(
        {
            heading: await page.getByRole("heading", { level: 1 }).textContent(),
            errors,
            writes: calls.filter((call) => call.method !== "GET"),
        },
        null,
        2,
    ),
);

await context.close();
await browser.close().catch(() => {});
process.exit(0);
