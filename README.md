# SRM Portal Auto-Login 🚀

A lightweight automation script using [Playwright](https://playwright.dev/) to log into the SRM Institute of Science and Technology campus network portal (`iac.srmist.edu.in`) from the command line.

---

## 📋 Features

- **Headless Automation**: Runs silently in the background without opening a browser window.
- **Credential Masking**: Automatically masks usernames and passwords in terminal logs for privacy.
- **Fast Execution**: Uses Playwright Chromium to bypass tedious manual portal logins.
- **Status Verification**: Checks portal responses to verify login status and reports errors.

---

## 🛠️ Prerequisites

Before getting started, make sure you have:

1. **Active SRM Campus Network**: You must be connected to SRM Wi-Fi or campus Ethernet so that `https://iac.srmist.edu.in` is reachable.
2. **Node.js**: Installed on your machine (Node.js 18+ recommended).
   - Check with: `node -v` and `npm -v`

---

## 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/itzayush18/srm-login.git
   cd srm-login
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install Chromium browser binary**:
   Playwright requires browser binaries to operate:
   ```bash
   npx playwright install chromium
   ```

> [!NOTE]
> **ES Module Support**: `index.js` uses ES module syntax (`import`). Make sure your `package.json` contains:
> ```json
> "type": "module"
> ```
> If your `package.json` has `"type": "commonjs"`, update it to `"type": "module"`, or replace `import { chromium } from "playwright";` with `const { chromium } = require("playwright");` in `index.js`.

---

## 🚀 Usage

Run the script by passing your NetID / SRM username and password as arguments:

```bash
node index.js "<username>" "<password>"
```

### Example

```bash
node index.js "ab1234" "YourPasswordHere"
```

### Expected Output

```text
Opening SRM network portal...
Credentials entered.
Login submitted. Waiting for response...
Result URL: https://iac.srmist.edu.in/Connect/PortalMain
Page title: SRM Institute of Science and Technology
Portal response:
 ...
The login form is no longer visible. Check the portal response to confirm authentication.
```

---

## ⚙️ Configuration & Tips

### 1. View the Browser (Headed Mode)
If you want to watch the browser perform the login, open `index.js` and change `headless: true` to `false`:
```javascript
const browser = await chromium.launch({
  headless: false,
});
```

### 2. Enable Debug Screenshots
To save a screenshot after submission for debugging:
Uncomment the screenshot lines in `index.js`:
```javascript
await page.screenshot({
  path: "srm-result.png",
  fullPage: true,
});
console.log("Screenshot saved to srm-result.png");
```

---

## ❓ Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `Cannot use import statement outside a module` | `package.json` is set to CommonJS | Change `"type": "commonjs"` to `"type": "module"` in `package.json`. |
| `Executable doesn't exist at ...` | Chromium browser binary not installed | Run `npx playwright install chromium`. |
| `Timeout 30000ms exceeded` | SRM portal is unreachable | Ensure you are connected to the SRM Wi-Fi / campus network. |
| `The login form remains visible` | Incorrect credentials or portal session limit | Double check your username/password or verify if max device limit is reached. |

---

## 🔒 Security & Privacy

- Passwords passed via the command line might be saved in your shell history.
- If you share terminal recordings or logs, credentials are automatically masked by the script (`[USERNAME]`, `[PASSWORD]`).
- Do not commit your credentials to any file or public repository.

---

## 📄 License

ISC License. See `package.json` for details.

