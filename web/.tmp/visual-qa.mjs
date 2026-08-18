import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "/tmp/tm-visual-qa.sgOVKU/node_modules/playwright-core/index.mjs";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const outputDir =
    "/Users/lucascardoso/Documents/GitHub/3rd_and_manageable/.tmp/browser-shots";

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
});

const results = [];

async function inspectPage(page, name) {
    await page.waitForTimeout(350);
    const metrics = await page.evaluate(() => {
        const root = document.documentElement;
        const body = document.body;
        const interactive = [...document.querySelectorAll("a, button, input, select, textarea")];
        const clipped = interactive
            .map((element) => {
                const rect = element.getBoundingClientRect();
                return {
                    tag: element.tagName.toLowerCase(),
                    text:
                        element.getAttribute("aria-label") ||
                        element.getAttribute("placeholder") ||
                        element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ||
                        "",
                    left: Math.round(rect.left),
                    right: Math.round(rect.right),
                    top: Math.round(rect.top),
                    bottom: Math.round(rect.bottom),
                };
            })
            .filter(
                ({ left, right, top, bottom }) =>
                    right > window.innerWidth + 1 ||
                    left < -1 ||
                    (bottom > window.innerHeight + 1 && top < window.innerHeight) ||
                    top < -1,
            );
        return {
            title: document.title,
            url: location.href,
            viewport: { width: window.innerWidth, height: window.innerHeight },
            scroll: {
                width: Math.max(root.scrollWidth, body.scrollWidth),
                height: Math.max(root.scrollHeight, body.scrollHeight),
                horizontalOverflow:
                    Math.max(root.scrollWidth, body.scrollWidth) > window.innerWidth + 1,
            },
            headings: [...document.querySelectorAll("h1,h2,h3")]
                .map((element) => element.textContent?.trim().replace(/\s+/g, " "))
                .filter(Boolean),
            clipped,
        };
    });

    const screenshot = path.join(outputDir, `${name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    results.push({ name, screenshot, ...metrics });
}

async function mockCurrentBridge(page, { intakeDone, school, posts = [] }) {
    const user = {
        id: "11111111-1111-4111-8111-111111111111",
        email: "fresh@example.com",
        display_name: "Fresh Athlete",
        school,
        status: "transitioning",
        headline: null,
        verified: false,
    };
    const forums = [
        {
            id: "22222222-2222-4222-8222-222222222222",
            title: "Athlete Life",
            category: "Support",
            description: "A community for the whole athlete.",
            member_count: 0,
            active_now: 0,
            icon: "Users",
        },
    ];
    const gamePlan = {
        intake_done: intakeDone,
        skill_map: [],
        path_fit: [],
        committed_path_id: null,
        weekly_actions: [],
        completed_action_ids: [],
        day: intakeDone ? 1 : 0,
        streak: 0,
        total_days: 90,
        phase: { id: "foundation", name: "Foundation" },
        check_in_count: 0,
    };

    await page.route("**/bridge/**", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const endpoint = url.pathname.replace(/^\/bridge/, "");
        let body = {};

        if (endpoint === "/auth/me") body = user;
        else if (endpoint === "/game-plan") body = gamePlan;
        else if (endpoint === "/profile") {
            body =
                request.method() === "PATCH"
                    ? user
                    : {
                          user_id: user.id,
                          intake_done: intakeDone,
                          intake_answers: null,
                          skill_map: [],
                      };
        } else if (endpoint === "/profile/intake") body = { status: "ok" };
        else if (endpoint === "/check-ins/today") body = null;
        else if (endpoint === "/check-ins") body = [];
        else if (endpoint === "/clipboard/history") body = { messages: [] };
        else if (endpoint === "/artifacts") body = [];
        else if (endpoint === "/community/forums") body = forums;
        else if (endpoint.includes("/community/forums/") && endpoint.endsWith("/posts")) {
            body = posts;
        } else if (endpoint === "/auth/logout") body = { status: "ok" };
        else body = {};

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
}

async function runPublicChecks() {
    for (const viewport of [
        { key: "mobile", width: 390, height: 844 },
        { key: "desktop", width: 1440, height: 1000 },
    ]) {
        const context = await browser.newContext({
            viewport: { width: viewport.width, height: viewport.height },
            colorScheme: "light",
        });
        const page = await context.newPage();
        const errors = [];
        page.on("console", (message) => {
            if (message.type() === "error") errors.push(`console: ${message.text()}`);
        });
        page.on("pageerror", (error) => errors.push(`page: ${error.message}`));

        await page.goto("http://127.0.0.1:3001/login", {
            waitUntil: "networkidle",
            timeout: 30_000,
        });
        await inspectPage(page, `current-login-${viewport.key}`);

        await page.goto("http://127.0.0.1:5174", {
            waitUntil: "networkidle",
            timeout: 30_000,
        });
        await inspectPage(page, `old-entry-${viewport.key}`);
        results.at(-1).errors = errors;
        await context.close();
    }
}

async function runCurrentAuthenticatedChecks() {
    for (const viewport of [
        { key: "mobile", width: 390, height: 844 },
        { key: "desktop", width: 1440, height: 1000 },
    ]) {
        const context = await browser.newContext({
            viewport: { width: viewport.width, height: viewport.height },
            colorScheme: "light",
        });
        const page = await context.newPage();
        const errors = [];
        page.on("console", (message) => {
            if (message.type() === "error") errors.push(`console: ${message.text()}`);
        });
        page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
        await mockCurrentBridge(page, {
            intakeDone: true,
            school: "Bowling Green State University",
        });

        for (const [route, name] of [
            ["/", "fresh-home"],
            ["/game-plan", "fresh-game-plan"],
            ["/clipboard", "fresh-clipboard"],
            ["/community", "fresh-community-bgsu"],
            ["/progress", "fresh-progress"],
            ["/profile", "fresh-profile"],
        ]) {
            await page.goto(`http://127.0.0.1:3001${route}`, {
                waitUntil: "networkidle",
                timeout: 30_000,
            });
            await inspectPage(page, `${name}-${viewport.key}`);
        }

        results.at(-1).errors = errors;
        await context.close();
    }
}

async function runOnboardingChecks() {
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        colorScheme: "dark",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => {
        if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
    page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
    await mockCurrentBridge(page, {
        intakeDone: false,
        school: "Bowling Green State University",
    });

    await page.goto("http://127.0.0.1:3001/onboarding", {
        waitUntil: "networkidle",
        timeout: 30_000,
    });
    await inspectPage(page, "onboarding-welcome-mobile");
    await page.getByRole("button", { name: /get started/i }).click();
    await inspectPage(page, "onboarding-status-mobile");
    await page.getByRole("button", { name: /currently competing/i }).click();
    await page.getByRole("button", { name: /^next/i }).click();
    await inspectPage(page, "onboarding-intake-first-mobile");

    results.at(-1).errors = errors;
    await context.close();
}

try {
    await runPublicChecks();
    await runCurrentAuthenticatedChecks();
    await runOnboardingChecks();
} finally {
    await browser.close();
}

await fs.writeFile(
    path.join(outputDir, "visual-qa-report.json"),
    JSON.stringify(results, null, 2),
);

console.log(
    JSON.stringify(
        {
            screenshots: results.length,
            horizontalOverflow: results
                .filter((result) => result.scroll.horizontalOverflow)
                .map((result) => result.name),
            clipped: results
                .filter((result) => result.clipped.length)
                .map((result) => ({ name: result.name, clipped: result.clipped })),
            errors: results
                .filter((result) => result.errors?.length)
                .map((result) => ({ name: result.name, errors: result.errors })),
            report: path.join(outputDir, "visual-qa-report.json"),
        },
        null,
        2,
    ),
);
