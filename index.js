
import { chromium } from "playwright";

const PORTAL_URL =
    "https://iac.srmist.edu.in/Connect/PortalMain";

const INTERNET_CHECK_URL = "https://example.com";

const USERNAME_SELECTOR =
    "#LoginUserPassword_auth_username";

const PASSWORD_SELECTOR =
    "#LoginUserPassword_auth_password";

const SUCCESS_TEXT = "Network Access Granted";

const username = process.env.SRM_USERNAME || process.argv[2];
const password = process.env.SRM_PASSWORD || process.argv[3];

async function hasInternet() {
    try {
        const response = await fetch(INTERNET_CHECK_URL, {
            method: "HEAD",
            redirect: "manual",
            signal: AbortSignal.timeout(8000),
        });

        return response.status >= 200 && response.status < 300;
    } catch {
        return false;
    }
}

async function waitForInternet(attempts = 5) {
    for (let i = 0; i < attempts; i++) {
        if (await hasInternet()) {
            return true;
        }

        if (i < attempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
    }

    return false;
}

async function main() {
    console.log("Checking internet connectivity...");

    if (await hasInternet()) {
        console.log(
            "Internet access already working. Skipping login."
        );
        return;
    }

    console.log(
        "Internet unavailable. Opening SRM portal..."
    );

    if (!username || !password) {
        throw new Error(
            "Credentials required. Set SRM_USERNAME and SRM_PASSWORD, " +
            'or run node index.js "<username>" "<password>".'
        );
    }

    const browser = await chromium.launch({
        headless: true,
    });

    try {
        const context = await browser.newContext();
        const page = await context.newPage();

        page.setDefaultTimeout(20000);

        console.log("Opening SRM login page...");

        await page.goto(PORTAL_URL, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
        });

        const usernameField = page.locator(USERNAME_SELECTOR);
        const passwordField = page.locator(PASSWORD_SELECTOR);

        // Wait for the portal to render both fields.
        try {
            console.log("Waiting for the login form...");

            await usernameField.waitFor({
                state: "visible",
                timeout: 20000,
            });

            await passwordField.waitFor({
                state: "visible",
                timeout: 20000,
            });
        } catch {
            console.error("SRM login form not found.");
            console.error("Current URL:", page.url());
            console.error(
                "Page title:",
                await page.title().catch(() => "(unavailable)")
            );

            const pageText = await page
                .locator("body")
                .innerText()
                .catch(() => "(Unable to read page text)");

            console.error(
                "Page content:",
                pageText.slice(0, 2000)
            );

            await page.screenshot({
                path: "/home/tp604/Ayush/srm-login/srm-debug.png",
                fullPage: true,
            }).catch(() => {});

            throw new Error(
                "Login form did not appear within 20 seconds."
            );
        }

        console.log("SRM login form detected.");
        console.log("Submitting credentials...");

        await usernameField.fill(username);
        await passwordField.fill(password);

        // Invoke the portal's actual JavaScript authentication handler.
        await page.evaluate(() => {
            if (
                typeof oAuthentication === "undefined" ||
                typeof oAuthentication.submitActiveForm !== "function"
            ) {
                throw new Error(
                    "SRM authentication handler not found."
                );
            }

            oAuthentication.submitActiveForm();
        });

        console.log("Waiting for authentication response...");

        await page.waitForTimeout(5000);

        const bodyText = await page
            .locator("body")
            .innerText()
            .catch(() => "");

        if (bodyText.includes(SUCCESS_TEXT)) {
            console.log(
                "Portal reports: Network Access Granted."
            );
        } else {
            console.log(
                "Expected success message not found."
            );
            console.log("Current URL:", page.url());
            console.log(
                "Page title:",
                await page.title().catch(() => "(unavailable)")
            );
            console.log(
                "Page response:",
                bodyText.slice(0, 2000)
            );
        }

        console.log("Checking internet access again...");

        if (await waitForInternet()) {
            console.log("Internet access confirmed.");
        } else {
            throw new Error(
                "Internet remains unavailable after login. " +
                "Check the portal response and network connection."
            );
        }

        await context.close();
    } finally {
        await browser.close();
    }
}

main().catch((error) => {
    console.error("Error:", error.message);
    process.exitCode = 1;
});