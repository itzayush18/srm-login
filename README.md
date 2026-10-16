# SRM Portal Auto-Login

A lightweight automation tool and background service powered by [Playwright](https://playwright.dev/) to log into the SRM Institute of Science and Technology campus network portal (`iac.srmist.edu.in`).

---

## Features

- **Smart Connectivity Check**: Probes internet connectivity before launching the browser—skips login if you are already connected.
- **Automated Verification**: Re-checks internet access post-login to confirm network activation.
- **Background Daemon (Linux `systemd`)**: Includes `setup-srm.sh` to run automatically at boot and check/re-login every 30 minutes.
- **Headless Execution**: Fast, headless Chromium browser with clean, isolated temporary sessions.
- **Flexible Credentials**: Supports both CLI arguments and environment variables (`SRM_USERNAME`, `SRM_PASSWORD`).
- **Secure Service Config**: Stores credentials in systemd service units with restricted file permissions (`chmod 600`).

---

## Prerequisites

1. **Active SRM Campus Network**: You must be connected to SRM Wi-Fi or campus Ethernet so that `https://iac.srmist.edu.in` is reachable.
2. **Node.js**: Node.js 18+ installed on your machine.
   - Check with: `node -v` and `npm -v`

---

## Installation

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

---

## Automated Setup with `setup-srm.sh` (Linux / systemd)

For Linux systems (Ubuntu, Debian, Arch, Fedora, Raspberry Pi, etc.), an interactive setup script `setup-srm.sh` is provided to run auto-login in the background via `systemd`.

### What it does:
- Creates a `systemd` oneshot service (`/etc/systemd/system/srm-login.service`) with your credentials safely configured (`chmod 600`).
- Configures a `systemd` timer (`/etc/systemd/system/srm-login.timer`) to run **2 minutes after boot** and **every 30 minutes** thereafter.
- Because `index.js` checks connectivity first, it will only attempt portal authentication when internet access is down.

### How to use:

1. **Make the script executable**:
   ```bash
   chmod +x setup-srm.sh
   ```

2. **Run the setup script**:
   ```bash
   ./setup-srm.sh
   ```

3. **Menu Options**:
   ```text
   ================================
        SRM Login Setup Utility
   ================================
   1. Install / Configure
   2. Remove from systemd
   3. Exit
   ```
   - **Option 1 (Install / Configure)**: Prompts for your SRM username and password securely, installs the systemd service & timer, enables them, and triggers an initial test run.
   - **Option 2 (Remove from systemd)**: Stops and unregisters the timer and service, removing the systemd files cleanly without deleting your project files.

### Useful `systemd` Commands

- **Check timer schedule & next run**:
  ```bash
  systemctl list-timers srm-login.timer
  ```

- **Check service status**:
  ```bash
  systemctl status srm-login.service
  ```

- **View service logs**:
  ```bash
  journalctl -u srm-login.service -n 50 --no-pager
  ```

- **Run manually via systemd**:
  ```bash
  sudo systemctl start srm-login.service
  ```

---

## Manual Usage

You can also run the login script manually anytime.

### Option A: Command Line Arguments
```bash
node index.js "<username>" "<password>"
```
Example:
```bash
node index.js "ab1234" "YourPasswordHere"
```

### Option B: Environment Variables
```bash
export SRM_USERNAME="ab1234"
export SRM_PASSWORD="YourPasswordHere"
node index.js
```
Or inline:
```bash
SRM_USERNAME="ab1234" SRM_PASSWORD="YourPasswordHere" node index.js
```

### Expected Output

**When internet is already working:**
```text
Checking internet connectivity...
Internet access already working. Skipping login.
```

**When logging in through portal:**
```text
Checking internet connectivity...
Internet unavailable. Opening SRM portal...
Submitting credentials...
Portal reports: Network Access Granted.
Checking internet access again...
Internet access confirmed.
```

---

## Configuration & Tips

### View the Browser (Headed Mode)
If you want to view the browser window during manual runs, open `index.js` and change `headless: true` to `false`:
```javascript
const browser = await chromium.launch({ headless: false });
```

---

## Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `SRM login form not found` / `Timeout exceeded` | Portal is unreachable or not connected to SRM network | Ensure you are connected to the SRM Wi-Fi / LAN. |
| `Executable doesn't exist at ...` | Chromium browser binary not installed | Run `npx playwright install chromium`. |
| `Credentials required` | No credentials provided | Pass username & password as arguments or set `SRM_USERNAME` & `SRM_PASSWORD`. |
| `Internet remains unavailable after login` | Invalid credentials, session limit reached, or captive portal error | Check your SRM credentials or check if maximum concurrent devices limit is exceeded. |
| `Cannot find module 'playwright'` | Dependencies not installed | Run `npm install` in the project directory. |

---

## Security & Privacy

- `setup-srm.sh` restricts service file permissions to `chmod 600` so only `root` can view the stored credentials.
- Do not commit your credentials or custom `.service` files to git.
- If running manually via arguments, be mindful that arguments may appear in shell history. Prefer using environment variables or the `setup-srm.sh` script.

---

## License

ISC License. See `package.json` for details.
