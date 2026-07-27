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
const forum = {
    id: "22222222-2222-4222-8222-222222222222",
    title: "Athlete Life",
    category: "Support",
    description: "A community for the whole athlete.",
    member_count: 0,
    active_now: 0,
    icon: "Users",
};
const post = {
    id: "33333333-3333-4333-8333-333333333333",
    forum_id: forum.id,
    author_name: "Jordan Lee",
    flair: "QUESTION",
    title: "How are you rebuilding a routine after your season?",
    body: "I am starting with one small commitment each morning. What has helped you make the new rhythm stick?",
    upvotes: 0,
    comment_count: 0,
    time_ago: "now",
};

await page.route("**/bridge/**", async (route) => {
    const endpoint = new URL(route.request().url()).pathname.replace(/^\/bridge/, "");
    const body =
        endpoint === "/auth/me"
            ? user
            : endpoint === "/game-plan"
              ? {
                    intake_done: true,
                    skill_map: [],
                    path_fit: [],
                    committed_path_id: null,
                    weekly_actions: [],
                    completed_action_ids: [],
                    day: 1,
                    streak: 0,
                    total_days: 90,
                    phase: { id: "foundation", name: "Foundation" },
                    check_in_count: 0,
                }
              : endpoint === "/community/forums"
                ? [forum]
                : endpoint.includes("/community/forums/") && endpoint.endsWith("/posts")
                  ? [post]
                  : {};
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

await page.goto("http://127.0.0.1:3001/community", {
    waitUntil: "networkidle",
    timeout: 30_000,
});
await page.waitForTimeout(500);

const metrics = await page.evaluate(() => {
    const scroller = document.querySelector("main > div");
    const all = [...document.querySelectorAll("h1,header button,header div,nav a")].map((element) => {
        const rect = element.getBoundingClientRect();
        return {
            tag: element.tagName,
            text: element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80),
            rect: {
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                top: Math.round(rect.top),
                bottom: Math.round(rect.bottom),
                width: Math.round(rect.width),
            },
        };
    });
    return {
        viewport: { width: innerWidth, height: innerHeight },
        rootWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        scroller: scroller
            ? {
                  clientWidth: scroller.clientWidth,
                  scrollWidth: scroller.scrollWidth,
                  clientHeight: scroller.clientHeight,
                  scrollHeight: scroller.scrollHeight,
                  scrollTop: scroller.scrollTop,
              }
            : null,
        all,
    };
});

await page.screenshot({
    path: "/Users/lucascardoso/Documents/GitHub/3rd_and_manageable/.tmp/browser-shots/focused-community-mobile.png",
    fullPage: false,
});
await page.evaluate(() => {
    const scroller = document.querySelector("main > div");
    if (scroller) scroller.scrollTop = 610;
});
await page.waitForTimeout(100);
await page.screenshot({
    path: "/Users/lucascardoso/Documents/GitHub/3rd_and_manageable/.tmp/browser-shots/focused-community-feed-mobile.png",
    fullPage: false,
});
console.log(JSON.stringify(metrics, null, 2));
await context.close();
await browser.close().catch(() => {});
process.exit(0);
