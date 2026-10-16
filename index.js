import { chromium } from "playwright";

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
    console.error(
        'Usage: node index.js "<username>" "<password>"'
    );
    process.exit(1);
}

const LOGIN_URL = "https://iac.srmist.edu.in/Connect/PortalMain";

const USERNAME_SELECTOR = "#LoginUserPassword_auth_username";

const PASSWORD_SELECTOR = "#LoginUserPassword_auth_password";

const SUCCESS_TEXT = "Network Access Granted";

async function main() {
    const browser = await chromium.launch({
        headless: true,
    });

    try {
        const page = await browser.newPage();

        page.setDefaultTimeout(15000);

        console.log("Opening SRM network portal...");

        await page.goto(LOGIN_URL, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
        });

        // Read the current portal state.
        let bodyText = await page
            .locator("body")
            .innerText()
            .catch(() => "");

        // Already authenticated: no need to log in again.
        if (bodyText.includes(SUCCESS_TEXT)) {
            console.log(
                "Network access is already granted. No action needed."
            );
            return;
        }

        const usernameField = page.locator(USERNAME_SELECTOR);
        const passwordField = page.locator(PASSWORD_SELECTOR);

        const loginFormVisible = await usernameField
            .isVisible()
            .catch(() => false);

        if (!loginFormVisible) {
            console.error(
                "Could not identify the login form or authenticated state."
            );
            console.error("Page title:", await page.title());
            process.exitCode = 1;
            return;
        }

        console.log("Login required. Entering credentials...");

        await usernameField.fill(username);
        await passwordField.fill(password);

        // Use the portal's actual JavaScript submit handler.
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

        console.log("Login submitted. Waiting for response...");

        // Wait for either a successful login or an error.
        await page.waitForFunction(
            ({ successText, usernameSelector }) => {
                const text =
                    document.body?.innerText ?? "";

                const usernameInput =
                    document.querySelector(usernameSelector);

                return (
                    text.includes(successText) ||
                    !usernameInput ||
                    text.toLowerCase().includes("invalid") ||
                    text.toLowerCase().includes("failed")
                );
            },
            {
                successText: SUCCESS_TEXT,
                usernameSelector: USERNAME_SELECTOR,
            },
            { timeout: 15000 }
        ).catch(() => { });

        bodyText = await page
            .locator("body")
            .innerText()
            .catch(() => "");

        if (bodyText.includes(SUCCESS_TEXT)) {
            console.log("SUCCESS: Network access granted.");
        } else {
            console.error("Login could not be confirmed.");
            console.error(
                bodyText
                    .replaceAll(username, "[USERNAME]")
                    .replaceAll(password, "[PASSWORD]")
                    .slice(0, 2000)
            );

            process.exitCode = 1;
        }
    } finally {
        await browser.close();
    }
}

main().catch((error) => {
    console.error("Automation failed:", error.message);
    process.exitCode = 1;
});