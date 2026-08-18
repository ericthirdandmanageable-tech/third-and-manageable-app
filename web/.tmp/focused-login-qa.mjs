import { chromium } from "/tmp/tm-visual-qa.sgOVKU/node_modules/playwright-core/index.mjs";

const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
});

for (const viewport of [
    { key: "iphone-se", width: 375, height: 667 },
    { key: "iphone-14", width: 390, height: 844 },
]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3001/login", {
        waitUntil: "networkidle",
        timeout: 30_000,
    });
    await page.getByRole("tab", { name: "Create account" }).click();
    await page.waitForTimeout(250);
    const metrics = await page.evaluate(() => {
        const main = document.querySelector("main");
        const panel = document.querySelector('[role="tabpanel"]');
        const submit = document.querySelector('button[type="submit"]');
        const panelRect = panel?.getBoundingClientRect();
        const submitRect = submit?.getBoundingClientRect();
        return {
            viewport: { width: innerWidth, height: innerHeight },
            body: {
                clientHeight: document.body.clientHeight,
                scrollHeight: document.body.scrollHeight,
            },
            main: main
                ? {
                      clientHeight: main.clientHeight,
                      scrollHeight: main.scrollHeight,
                      overflowY: getComputedStyle(main).overflowY,
                  }
                : null,
            panel: panelRect
                ? {
                      top: Math.round(panelRect.top),
                      bottom: Math.round(panelRect.bottom),
                  }
                : null,
            submit: submitRect
                ? {
                      top: Math.round(submitRect.top),
                      bottom: Math.round(submitRect.bottom),
                  }
                : null,
        };
    });
    await page.screenshot({
        path: `/Users/lucascardoso/Documents/GitHub/3rd_and_manageable/.tmp/browser-shots/register-${viewport.key}.png`,
        fullPage: false,
    });
    console.log(JSON.stringify({ key: viewport.key, ...metrics }));
    await context.close();
}

await browser.close().catch(() => {});
process.exit(0);
