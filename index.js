import { chromium } from "playwright";

const username = process.argv[2];
const password = process.argv[3];

const LOGIN_URL =
  "https://iac.srmist.edu.in/Connect/PortalMain";

const USERNAME_SELECTOR =
  "#LoginUserPassword_auth_username";

const PASSWORD_SELECTOR =
  "#LoginUserPassword_auth_password";

const SUCCESS_TEXT = "Network Access Granted";

async function main() {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    // Explicit context keeps the session isolated from other browsers.
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(LOGIN_URL, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await page.waitForTimeout(1500);

    let text = await page.locator("body").innerText();

    // Check the current portal state BEFORE attempting login.
    if (text.includes(SUCCESS_TEXT)) {
      console.log("Already authenticated.");
      console.log(
        text.trim().slice(0, 1500)
      );
      return;
    }

    const usernameField = page.locator(USERNAME_SELECTOR);
    const passwordField = page.locator(PASSWORD_SELECTOR);

    const loginFormVisible = await usernameField
      .isVisible()
      .catch(() => false);

    if (!loginFormVisible) {
      console.error("Unknown portal state.");
      console.log("URL:", page.url());
      console.log("Title:", await page.title());
      console.log("HTML:\n", await page.content());
      process.exitCode = 1;
      return;
    }

    // Do not attempt authentication with missing credentials.
    if (!username || !password) {
      console.error(
        'Login required. Run: node index.js "<username>" "<password>"'
      );
      process.exitCode = 1;
      return;
    }

    console.log("Login required. Submitting credentials.");

    await usernameField.fill(username);
    await passwordField.fill(password);

    await page.evaluate(() => {
      if (
        typeof oAuthentication === "undefined" ||
        typeof oAuthentication.submitActiveForm !== "function"
      ) {
        throw new Error("Login handler not found.");
      }

      oAuthentication.submitActiveForm();
    });

    await page.waitForTimeout(4000);

    text = await page.locator("body").innerText();

    if (text.includes(SUCCESS_TEXT)) {
      console.log("Portal reports network access granted.");
    } else {
      console.error("Authentication not confirmed.");
      console.log("Portal response:\n", text.slice(0, 2000));
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exitCode = 1;
});