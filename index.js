import { chromium } from "playwright";

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  console.error(
    'Usage: node index.js "<username>" "<password>"'
  );
  process.exit(1);
}

const LOGIN_URL =
  "https://iac.srmist.edu.in/Connect/PortalMain";

const USERNAME_SELECTOR =
  "#LoginUserPassword_auth_username";

const PASSWORD_SELECTOR =
  "#LoginUserPassword_auth_password";

const SUCCESS_TEXT = "Network Access Granted";

async function dumpPage(page) {
  console.log("\n========== PAGE DEBUG ==========");
  console.log("URL:", page.url());
  console.log("Title:", await page.title());

  console.log(
    "\nPAGE TEXT:\n",
    (await page.locator("body").innerText().catch(() => ""))
      .slice(0, 5000)
  );

  console.log(
    "\nINPUTS:\n",
    JSON.stringify(
      await page.locator("input").evaluateAll((elements) =>
        elements.map((element) => ({
          id: element.id,
          name: element.name,
          type: element.type,
          visible: !!(
            element.offsetWidth ||
            element.offsetHeight ||
            element.getClientRects().length
          ),
        }))
      ),
      null,
      2
    )
  );

  console.log(
    "\nBUTTONS/LINKS:\n",
    JSON.stringify(
      await page
        .locator("button, a, input[type=submit], input[type=button]")
        .evaluateAll((elements) =>
          elements.map((element) => ({
            tag: element.tagName,
            id: element.id,
            text: element.innerText || element.value || "",
            visible: !!(
              element.offsetWidth ||
              element.offsetHeight ||
              element.getClientRects().length
            ),
          }))
        ),
      null,
      2
    )
  );

  const html = await page.content();

  console.log("\n========== FULL HTML ==========\n");
  console.log(html);

  await page.screenshot({
    path: "srm-debug.png",
    fullPage: true,
  });

  console.log("\nHTML debug complete.");
  console.log("Screenshot: srm-debug.png");
}

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

    await page.waitForTimeout(2000);

    let bodyText = await page
      .locator("body")
      .innerText()
      .catch(() => "");

    if (bodyText.includes(SUCCESS_TEXT)) {
      console.log("Network access is already granted.");
      return;
    }

    const usernameField = page.locator(USERNAME_SELECTOR);

    const loginFormVisible = await usernameField
      .isVisible()
      .catch(() => false);

    if (!loginFormVisible) {
      console.log(
        "Could not identify the login form or authenticated state."
      );

      await dumpPage(page);

      process.exitCode = 1;
      return;
    }

    console.log("Login required. Entering credentials...");

    await usernameField.fill(username);

    await page
      .locator(PASSWORD_SELECTOR)
      .fill(password);

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

    await page.waitForTimeout(5000);

    bodyText = await page
      .locator("body")
      .innerText()
      .catch(() => "");

    if (bodyText.includes(SUCCESS_TEXT)) {
      console.log("SUCCESS: Network access granted.");
    } else {
      console.log("Login could not be confirmed.");
      await dumpPage(page);
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