import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\hamed\\.gemini\\antigravity\\brain\\dde53c6b-9f20-449f-8f45-2bd02c77300f";
const TEMP_USER_DATA = path.join(os.tmpdir(), "chrome-temp-profile-" + Date.now());

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
    this.ws.close();
  }
}

async function runTests() {
  console.log("Launching headless Chrome...");
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9222",
    `--user-data-dir=${TEMP_USER_DATA}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-features=TranslateUI",
    "--disable-extensions",
  ]);

  chrome.on("error", (err) => console.error("Chrome error:", err));

  // Wait for Chrome to listen on port 9222
  let versionData = null;
  for (let i = 0; i < 30; i++) {
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
    console.error("Failed to connect to Chrome remote debugging port.");
    chrome.kill();
    process.exit(1);
  }

  console.log("Connected to Chrome:", versionData.Browser);

  // Open dedicated new tab for test harness
  const newTab = await (
    await fetch("http://127.0.0.1:9222/json/new?http://localhost:3000/src/test/layout-test.html", {
      method: "PUT",
    })
  ).json();

  console.log("Opened test page tab:", newTab.id);

  const client = new CDPClient(newTab.webSocketDebuggerUrl);
  await client.connect();

  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("DOM.enable");

  const results = [];

  const testConfigs = [
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
      name: "LTR + Right Sidebar (1280x800) - Expanded",
      width: 1280,
      height: 800,
      dir: "ltr",
      pos: "right",
      collapsed: false,
      screenshotName: "today_ltr_right_1280_expanded.png",
    },
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

    // Set configuration in localStorage prior to navigation
    await client.send("Page.navigate", { url: "http://localhost:3000/src/test/layout-test.html" });
    await sleep(1500);

    // Set configuration in localStorage and DOM
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
    await sleep(600);

    // If collapsed mode requested, toggle sidebar state
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

    // Evaluate layout geometry
    const evalRes = await client.send("Runtime.evaluate", {
      expression: `
        (() => {
          const sidebar = document.querySelector('[data-sidebar="sidebar"]');
          const sidebarWrapper = document.querySelector('[data-sidebar="sidebar"]')?.closest('.group');
          const spacer = sidebarWrapper?.querySelector('.bg-transparent');
          const main = document.querySelector('main');
          const header = document.querySelector('header');
          const windowWidth = window.innerWidth;
          const windowHeight = window.innerHeight;

          const sRect = sidebar ? sidebar.getBoundingClientRect() : null;
          const spRect = spacer ? spacer.getBoundingClientRect() : null;
          const mRect = main ? main.getBoundingClientRect() : null;
          const hRect = header ? header.getBoundingClientRect() : null;

          // Check for overlay:
          let hasOverlay = false;
          let overlayPixels = 0;

          if (sRect && mRect) {
            // Horizontal overlap between main and sidebar
            const overlapX = Math.max(0, Math.min(sRect.right, mRect.right) - Math.max(sRect.left, mRect.left));
            if (overlapX > 2) { // more than 2px tolerance for borders
              hasOverlay = true;
              overlayPixels = overlapX;
            }
          }

          const spacerAlignedWithSidebar =
            sRect && spRect ? Math.abs(sRect.left - spRect.left) < 3 : false;

          return {
            windowWidth,
            windowHeight,
            sidebar: sRect ? { left: Math.round(sRect.left), right: Math.round(sRect.right), width: Math.round(sRect.width) } : null,
            spacer: spRect ? { left: Math.round(spRect.left), right: Math.round(spRect.right), width: Math.round(spRect.width) } : null,
            main: mRect ? { left: Math.round(mRect.left), right: Math.round(mRect.right), width: Math.round(mRect.width) } : null,
            header: hRect ? { left: Math.round(hRect.left), right: Math.round(hRect.right), width: Math.round(hRect.width) } : null,
            hasOverlay,
            overlayPixels,
            spacerAlignedWithSidebar,
          };
        })()
      `,
      returnByValue: true,
    });

    const geo = evalRes.result.value;
    const pass = !geo.hasOverlay && geo.sidebar && geo.main && geo.spacerAlignedWithSidebar;
    console.log(`  Sidebar: left=${geo.sidebar?.left}, right=${geo.sidebar?.right}, width=${geo.sidebar?.width}`);
    console.log(`  Spacer:  left=${geo.spacer?.left}, right=${geo.spacer?.right}, width=${geo.spacer?.width}`);
    console.log(`  Main:    left=${geo.main?.left}, right=${geo.main?.right}, width=${geo.main?.width}`);
    console.log(`  Spacer Aligned: ${geo.spacerAlignedWithSidebar ? "YES" : "NO"}`);
    console.log(`  Overlay: ${geo.hasOverlay ? `YES (${geo.overlayPixels}px)` : "NO (0px)"} -> ${pass ? "PASS" : "FAIL"}`);

    // Take screenshot
    const screenshotRes = await client.send("Page.captureScreenshot", { format: "png" });
    const screenshotPath = path.join(ARTIFACT_DIR, cfg.screenshotName);
    fs.writeFileSync(screenshotPath, Buffer.from(screenshotRes.data, "base64"));
    console.log(`  Screenshot saved: ${cfg.screenshotName}`);

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

  console.log("\n================ TEST SUMMARY ================");
  let allPass = true;
  for (const r of results) {
    const status = r.pass ? "✅ PASS" : "❌ FAIL";
    if (!r.pass) allPass = false;
    console.log(`${status} | ${r.config} | Overlay: ${r.hasOverlay ? `${r.overlayPixels}px` : "None"} | Main Width: ${r.main?.width}px | Sidebar Width: ${r.sidebar?.width}px`);
  }
  console.log("==============================================\n");

  // Save report to json
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, "layout_verification_results.json"),
    JSON.stringify(results, null, 2)
  );

  try {
    fs.rmSync(TEMP_USER_DATA, { recursive: true, force: true });
  } catch {}

  if (!allPass) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
