import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const ARTIFACT_DIR = process.env.LAYOUT_ARTIFACT_DIR ?? path.resolve(process.cwd(), "artifacts", "layout");
const TEMP_USER_DATA = path.join(os.tmpdir(), `chrome-temp-profile-${Date.now()}`);

function findChrome() {
  if (process.env.TEST_SIMULATE_NO_CHROME === "1") return null;

  // 1. Check explicit environment variables
  const envCandidates = [
    process.env.CHROME_BIN,
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
  ].filter(Boolean);

  for (const p of envCandidates) {
    if (fs.existsSync(p)) return p;
  }

  // 2. Platform-specific standard paths
  const platform = os.platform();
  const candidates = [];

  if (platform === "win32") {
    candidates.push(
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    );
  } else if (platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
    );
  } else {
    // Linux / Unix
    candidates.push(
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/snap/bin/chromium",
      "/usr/bin/google-chrome-unstable",
      "/usr/bin/google-chrome-beta"
    );
  }

  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }

  return null;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { resolve, reject } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

async function runTests() {
  console.log("Artifact output directory:", ARTIFACT_DIR);
  try {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  } catch (err) {
    console.error("❌ ERROR: Failed to create artifact directory:", ARTIFACT_DIR, err);
    process.exit(1);
  }

  const chromePath = findChrome();
  if (!chromePath) {
    console.error("❌ ERROR: Chrome or Chromium executable not found on this system.");
    console.error("Please install Chrome/Chromium or set CHROME_PATH / CHROME_BIN environment variable.");
    process.exit(1);
  }

  console.log(`Using Chrome binary: ${chromePath}`);

  const devServerUrl = process.env.DEV_SERVER_URL ?? "http://localhost:3000/src/test/layout-test.html";

  // Verify that Vite dev server is running on port 3000
  try {
    const devServerRes = await fetch(devServerUrl);
    if (!devServerRes.ok) {
      console.error(`❌ ERROR: Dev server responded with status ${devServerRes.status}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`❌ ERROR: Dev server not reachable on ${devServerUrl}. Please start Vite dev server first.`);
    console.error(err.message);
    process.exit(1);
  }

  console.log("Launching headless Chrome...");
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--remote-debugging-port=9222",
    `--user-data-dir=${TEMP_USER_DATA}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-features=TranslateUI",
    "--disable-extensions",
  ]);

  let chromeFailed = false;
  chrome.on("error", (err) => {
    chromeFailed = true;
    console.error("❌ Chrome spawn error:", err);
    process.exit(1);
  });

  // Wait for Chrome remote debugging port to become active
  let versionData = null;
  for (let i = 0; i < 35; i++) {
    try {
      const res = await fetch("http://127.0.0.1:9222/json/version");
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch {}
    await sleep(200);
  }

  if (!versionData) {
    console.error("❌ ERROR: Failed to connect to Chrome DevTools port (9222) within timeout.");
    chrome.kill();
    process.exit(1);
  }

  console.log("Connected to Chrome:", versionData.Browser);

  // Open dedicated test tab
  let newTab = null;
  try {
    const res = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(devServerUrl)}`, {
      method: "PUT",
    });
    newTab = await res.json();
  } catch (err) {
    console.error("❌ ERROR: Failed to open new tab via DevTools API:", err);
    chrome.kill();
    process.exit(1);
  }

  console.log("Opened test page tab:", newTab.id);

  const client = new CDPClient(newTab.webSocketDebuggerUrl);
  try {
    await client.connect();
  } catch (err) {
    console.error("❌ ERROR: WebSocket connection to page target failed:", err);
    chrome.kill();
    process.exit(1);
  }

  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("DOM.enable");

  const results = [];

  const testConfigs = [
    // 1. RTL + Right Sidebar (Default Persian configuration)
    {
      name: "RTL + Right Sidebar (1280x800) - Expanded",
      width: 1280,
      height: 800,
      dir: "rtl",
      pos: "right",
      collapsed: false,
      screenshotName: "today_rtl_right_1280_expanded.png",
    },
    {
      name: "RTL + Right Sidebar (1280x800) - Collapsed",
      width: 1280,
      height: 800,
      dir: "rtl",
      pos: "right",
      collapsed: true,
      screenshotName: "today_rtl_right_1280_collapsed.png",
    },
    // 2. RTL + Left Sidebar
    {
      name: "RTL + Left Sidebar (1280x800) - Expanded",
      width: 1280,
      height: 800,
      dir: "rtl",
      pos: "left",
      collapsed: false,
      screenshotName: "today_rtl_left_1280_expanded.png",
    },
    {
      name: "RTL + Left Sidebar (1280x800) - Collapsed",
      width: 1280,
      height: 800,
      dir: "rtl",
      pos: "left",
      collapsed: true,
      screenshotName: "today_rtl_left_1280_collapsed.png",
    },
    // 3. LTR + Right Sidebar
    {
      name: "LTR + Right Sidebar (1280x800) - Expanded",
      width: 1280,
      height: 800,
      dir: "ltr",
      pos: "right",
      collapsed: false,
      screenshotName: "today_ltr_right_1280_expanded.png",
    },
    {
      name: "LTR + Right Sidebar (1280x800) - Collapsed",
      width: 1280,
      height: 800,
      dir: "ltr",
      pos: "right",
      collapsed: true,
      screenshotName: "today_ltr_right_1280_collapsed.png",
    },
    // 4. LTR + Left Sidebar (Standard English configuration)
    {
      name: "LTR + Left Sidebar (1280x800) - Expanded",
      width: 1280,
      height: 800,
      dir: "ltr",
      pos: "left",
      collapsed: false,
      screenshotName: "today_ltr_left_1280_expanded.png",
    },
    {
      name: "LTR + Left Sidebar (1280x800) - Collapsed",
      width: 1280,
      height: 800,
      dir: "ltr",
      pos: "left",
      collapsed: true,
      screenshotName: "today_ltr_left_1280_collapsed.png",
    },
    // 5. Higher resolutions (1440x900 and 2048x1152)
    {
      name: "RTL + Right Sidebar (1440x900) - Expanded",
      width: 1440,
      height: 900,
      dir: "rtl",
      pos: "right",
      collapsed: false,
      screenshotName: "today_rtl_right_1440_expanded.png",
    },
    {
      name: "RTL + Right Sidebar (2048x1152) - Expanded",
      width: 2048,
      height: 1152,
      dir: "rtl",
      pos: "right",
      collapsed: false,
      screenshotName: "today_rtl_right_2048_expanded.png",
    },
  ];

  for (const cfg of testConfigs) {
    console.log(`\nTesting: ${cfg.name}...`);
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: cfg.width,
      height: cfg.height,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await client.send("Page.navigate", { url: devServerUrl });
    await sleep(1200);

    // Apply configuration to storage and DOM
    await client.send("Runtime.evaluate", {
      expression: `
        (() => {
          localStorage.setItem('arshnaz_sidebar_position', '${cfg.pos}');
          localStorage.setItem('arshnaz_app_language', '${cfg.dir === 'rtl' ? 'fa' : 'en'}');
          document.documentElement.dir = '${cfg.dir}';
          document.documentElement.lang = '${cfg.dir === 'rtl' ? 'fa' : 'en'}';
          window.dispatchEvent(new CustomEvent('arshnaz:sidebar-position-changed', { detail: '${cfg.pos}' }));
        })()
      `,
    });
    await sleep(500);

    // Toggle collapse state if requested
    if (cfg.collapsed) {
      await client.send("Runtime.evaluate", {
        expression: `
          (() => {
            const btn = document.querySelector('button[data-sidebar="trigger"]') || document.querySelector('button[title*="بستن"]');
            if (btn) btn.click();
          })()
        `,
      });
      await sleep(500);
    }

    // Evaluate layout geometry: Sidebar vs Main vs Today Split View & Tasks
    const evalRes = await client.send("Runtime.evaluate", {
      expression: `
        (() => {
          const sidebar = document.querySelector('[data-sidebar="sidebar"]');
          const sidebarWrapper = document.querySelector('[data-sidebar="sidebar"]')?.closest('.group');
          const spacer = sidebarWrapper?.querySelector('.bg-transparent');
          const main = document.querySelector('main');
          const taskListSection = document.querySelector('[data-testid="task-list-section"]');
          const taskDetailPanel = document.querySelector('[data-testid="task-detail-panel"]');
          const taskItems = Array.from(document.querySelectorAll('[data-testid^="task-item-"]'));

          const sRect = sidebar ? sidebar.getBoundingClientRect() : null;
          const spRect = spacer ? spacer.getBoundingClientRect() : null;
          const mRect = main ? main.getBoundingClientRect() : null;
          const tlRect = taskListSection ? taskListSection.getBoundingClientRect() : null;
          const tdRect = taskDetailPanel ? taskDetailPanel.getBoundingClientRect() : null;

          // Check overlay with main
          let mainOverlay = false;
          let mainOverlayPx = 0;
          if (sRect && mRect) {
            const overlapX = Math.max(0, Math.min(sRect.right, mRect.right) - Math.max(sRect.left, mRect.left));
            if (overlapX > 2) {
              mainOverlay = true;
              mainOverlayPx = overlapX;
            }
          }

          // Check overlay with task list section
          let taskListOverlay = false;
          let taskListOverlayPx = 0;
          if (sRect && tlRect) {
            const overlapX = Math.max(0, Math.min(sRect.right, tlRect.right) - Math.max(sRect.left, tlRect.left));
            if (overlapX > 2) {
              taskListOverlay = true;
              taskListOverlayPx = overlapX;
            }
          }

          // Check individual task items overlay
          let anyTaskItemObscured = false;
          let obscuredCount = 0;
          if (sRect && taskItems.length > 0) {
            for (const item of taskItems) {
              const r = item.getBoundingClientRect();
              const overlapX = Math.max(0, Math.min(sRect.right, r.right) - Math.max(sRect.left, r.left));
              if (overlapX > 2) {
                anyTaskItemObscured = true;
                obscuredCount++;
              }
            }
          }

          const spacerAligned =
            sRect && spRect ? Math.abs(sRect.left - spRect.left) < 3 : false;

          return {
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            sidebar: sRect ? { left: Math.round(sRect.left), right: Math.round(sRect.right), width: Math.round(sRect.width) } : null,
            spacer: spRect ? { left: Math.round(spRect.left), right: Math.round(spRect.right), width: Math.round(spRect.width) } : null,
            main: mRect ? { left: Math.round(mRect.left), right: Math.round(mRect.right), width: Math.round(mRect.width) } : null,
            taskList: tlRect ? { left: Math.round(tlRect.left), right: Math.round(tlRect.right), width: Math.round(tlRect.width) } : null,
            taskDetail: tdRect ? { left: Math.round(tdRect.left), right: Math.round(tdRect.right), width: Math.round(tdRect.width) } : null,
            totalTaskItems: taskItems.length,
            mainOverlay,
            mainOverlayPx,
            taskListOverlay,
            taskListOverlayPx,
            anyTaskItemObscured,
            obscuredCount,
            spacerAligned,
          };
        })()
      `,
      returnByValue: true,
    });

    const geo = evalRes.result.value;
    const hasAnyOverlay = geo.mainOverlay || geo.taskListOverlay || geo.anyTaskItemObscured;
    const pass = !hasAnyOverlay && geo.sidebar && geo.main && geo.spacerAligned && geo.totalTaskItems >= 20;

    console.log(`  Sidebar:   left=${geo.sidebar?.left}, right=${geo.sidebar?.right}, width=${geo.sidebar?.width}`);
    console.log(`  Spacer:    left=${geo.spacer?.left}, right=${geo.spacer?.right}, width=${geo.spacer?.width}`);
    console.log(`  Main:      left=${geo.main?.left}, right=${geo.main?.right}, width=${geo.main?.width}`);
    console.log(`  Task List: left=${geo.taskList?.left}, right=${geo.taskList?.right}, width=${geo.taskList?.width} (Items: ${geo.totalTaskItems})`);
    console.log(`  Spacer Aligned: ${geo.spacerAligned ? "YES" : "NO"}`);
    console.log(`  Tasks Obscured: ${geo.anyTaskItemObscured ? `YES (${geo.obscuredCount} tasks)` : "NO (0 tasks)"}`);
    console.log(`  Result: ${pass ? "✅ PASS" : "❌ FAIL"}`);

    // Take screenshot
    const screenshotRes = await client.send("Page.captureScreenshot", { format: "png" });
    const screenshotPath = path.join(ARTIFACT_DIR, cfg.screenshotName);
    try {
      fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
      fs.writeFileSync(screenshotPath, Buffer.from(screenshotRes.data, "base64"));
      console.log(`  Screenshot saved: ${cfg.screenshotName}`);
    } catch (err) {
      console.error(`❌ ERROR: Failed to save screenshot to ${screenshotPath}:`, err);
      process.exit(1);
    }

    results.push({
      config: cfg.name,
      width: cfg.width,
      pass,
      ...geo,
      screenshot: cfg.screenshotName,
    });
  }

  client.close();
  chrome.kill();

  console.log("\n==================== TEST SUMMARY ====================");
  let allPass = true;
  for (const r of results) {
    const status = r.pass ? "✅ PASS" : "❌ FAIL";
    if (!r.pass) allPass = false;
    console.log(
      `${status} | ${r.config.padEnd(46)} | Main Width: ${String(r.main?.width).padStart(4)}px | Sidebar Width: ${String(r.sidebar?.width).padStart(3)}px | Tasks Obscured: ${r.obscuredCount}`
    );
  }
  console.log("======================================================\n");

  try {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, "layout_verification_results.json"),
      JSON.stringify(results, null, 2)
    );
  } catch (err) {
    console.error(`❌ ERROR: Failed to write layout verification results to ${ARTIFACT_DIR}:`, err);
    process.exit(1);
  }

  try {
    fs.rmSync(TEMP_USER_DATA, { recursive: true, force: true });
  } catch {}

  if (!allPass) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("❌ Test execution failed with unhandled exception:", err);
  process.exit(1);
});
