export type MiniAppTemplateId = "calculator" | "checklist" | "timer";
export type MiniAppTemplateLanguage = "fa" | "en";

export interface MiniAppTemplate {
  id: MiniAppTemplateId;
  name: { fa: string; en: string };
  description: { fa: string; en: string };
}

export const MINI_APP_TEMPLATES: MiniAppTemplate[] = [
  {
    id: "calculator",
    name: { fa: "ماشین‌حساب", en: "Calculator" },
    description: {
      fa: "ماشین‌حساب آفلاین برای چهار عمل اصلی با دو عدد.",
      en: "An offline calculator for the four basic operations with two numbers.",
    },
  },
  {
    id: "checklist",
    name: { fa: "فهرست بررسی", en: "Checklist" },
    description: {
      fa: "فهرست بررسی ساده برای افزودن و تکمیل کارها.",
      en: "A simple checklist for adding and completing tasks.",
    },
  },
  {
    id: "timer",
    name: { fa: "زمان‌سنج", en: "Timer" },
    description: {
      fa: "زمان‌سنج آفلاین با شروع، مکث و بازنشانی.",
      en: "An offline timer with start, pause, and reset controls.",
    },
  },
];

type Copy = Record<string, string>;

function createDocument(
  language: MiniAppTemplateLanguage,
  fallbackTitle: string,
  body: string,
  appScript: string,
): string {
  const direction = language === "fa" ? "rtl" : "ltr";

  return `<!doctype html>
<html lang="${language}" dir="${direction}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${fallbackTitle}</title>
  <style>
    :root {
      color-scheme: light dark;
      --app-bg: hsl(0 0% 100%);
      --app-surface: hsl(0 0% 98%);
      --app-fg: hsl(222 47% 11%);
      --app-muted: hsl(215 16% 47%);
      --app-border: hsl(214 32% 91%);
      --app-primary: hsl(221 83% 53%);
      --app-primary-contrast: hsl(0 0% 100%);
      --app-danger: hsl(0 72% 51%);
      --app-radius: 0.75rem;
    }
    * { box-sizing: border-box; }
    html, body { min-height: 100%; }
    body {
      margin: 0;
      background: var(--app-bg);
      color: var(--app-fg);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }
    .mini-app { width: min(100%, 42rem); margin: 0 auto; padding: clamp(1rem, 4vw, 2rem); }
    .app-header { margin-bottom: 1.5rem; }
    h1 { margin: 0; font-size: clamp(1.45rem, 4vw, 2rem); }
    .hint, .memory-note, .status, .remaining { color: var(--app-muted); opacity: 0.8; }
    .memory-note { margin: 0.5rem 0 0; font-size: 0.9rem; }
    .panel {
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: var(--app-radius);
      padding: clamp(1rem, 3vw, 1.5rem);
      box-shadow: 0 1px 2px hsl(222 47% 11% / 0.06);
    }
    .field { display: grid; gap: 0.4rem; margin-bottom: 1rem; }
    .field-row, .action-row { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: end; }
    .field-row > .field { flex: 1 1 9rem; }
    label { font-weight: 650; }
    input, select, button {
      min-height: 2.75rem;
      border-radius: 0.55rem;
      font: inherit;
    }
    input, select {
      width: 100%;
      border: 1px solid var(--app-border);
      background: var(--app-bg);
      color: var(--app-fg);
      padding: 0.55rem 0.7rem;
    }
    button {
      border: 1px solid transparent;
      background: var(--app-primary);
      color: var(--app-primary-contrast);
      cursor: pointer;
      padding: 0.55rem 0.9rem;
      font-weight: 650;
    }
    button.secondary { background: transparent; border-color: var(--app-border); color: var(--app-fg); }
    button.danger { background: var(--app-danger); }
    button:disabled { cursor: not-allowed; opacity: 0.55; }
    input:focus-visible, select:focus-visible, button:focus-visible {
      outline: 3px solid hsl(221 83% 53% / 0.4);
      outline-offset: 2px;
    }
    output.result, .timer-display {
      display: block;
      margin-top: 1rem;
      padding: 0.85rem 1rem;
      border: 1px solid var(--app-border);
      border-radius: 0.55rem;
      background: var(--app-bg);
      font-variant-numeric: tabular-nums;
    }
    .timer-display { font-size: clamp(2rem, 10vw, 4rem); font-weight: 750; letter-spacing: 0.04em; text-align: center; }
    .status { min-height: 1.5rem; margin: 0.85rem 0 0; }
    .task-list { display: grid; gap: 0.65rem; padding: 0; margin: 1rem 0; list-style: none; }
    .task-item {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      border: 1px solid var(--app-border);
      border-radius: 0.55rem;
      padding: 0.55rem 0.65rem;
      background: var(--app-bg);
    }
    .task-item input { width: 1.15rem; min-height: 1.15rem; flex: 0 0 auto; }
    .task-text { overflow-wrap: anywhere; flex: 1; }
    .task-item.done .task-text { color: var(--app-muted); text-decoration: line-through; }
    .task-item button { min-height: 2.25rem; padding: 0.35rem 0.6rem; }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    @media (max-width: 28rem) {
      .field-row > .field { flex-basis: 100%; }
      .action-row > button { flex: 1 1 8rem; }
    }
  </style>
</head>
<body>
  ${body}
  <script>
    (() => {
      "use strict";
      const root = document.documentElement;
      const fallbackLanguage = "${language}";
      let context = {};
      try {
        context = typeof window.Arshiam?.getContext === "function" ? (window.Arshiam.getContext() || {}) : {};
      } catch (_) {
        context = {};
      }
      if (!context || typeof context !== "object") context = {};

      const language = context.language === "fa" || context.language === "en" ? context.language : fallbackLanguage;
      const direction = context.direction === "rtl" || context.direction === "ltr"
        ? context.direction
        : (language === "fa" ? "rtl" : "ltr");
      const theme = context.theme === "dark" ? "dark" : "light";
      const fallbackColors = theme === "dark"
        ? { background: "222 47% 11%", surface: "222 47% 14%", foreground: "210 40% 96%", muted: "215 20% 70%", border: "217 33% 25%", primary: "217 91% 60%", primaryContrast: "222 47% 11%", danger: "0 72% 61%" }
        : { background: "0 0% 100%", surface: "0 0% 98%", foreground: "222 47% 11%", muted: "215 16% 47%", border: "214 32% 91%", primary: "221 83% 53%", primaryContrast: "0 0% 100%", danger: "0 72% 51%" };
      const palette = context.colors && typeof context.colors === "object" ? context.colors : {};
      const asHsl = (value, fallback) => {
        if (typeof value !== "string") return "hsl(" + fallback + ")";
        const color = value.trim();
        if (/^hsla?\\([^()]+\\)$/i.test(color)) return color;
        if (/^[-+]?\\d+(?:\\.\\d+)?(?:deg)?\\s+\\d+(?:\\.\\d+)?%\\s+\\d+(?:\\.\\d+)?%(?:\\s*\\/\\s*\\d+(?:\\.\\d+)?%?)?$/i.test(color)) return "hsl(" + color + ")";
        return "hsl(" + fallback + ")";
      };
      const color = (name) => asHsl(palette[name] || context[name], fallbackColors[name]);
      root.lang = language;
      root.dir = direction;
      root.dataset.theme = theme;
      root.dataset.contextLanguage = language;
      root.style.setProperty("--app-bg", color("background"));
      root.style.setProperty("--app-surface", color("surface"));
      root.style.setProperty("--app-fg", color("foreground"));
      // The host's "muted" token is a background, not readable text.
      root.style.setProperty("--app-muted", asHsl(palette.mutedForeground || context.mutedForeground || palette.foreground || context.foreground, fallbackColors.muted));
      root.style.setProperty("--app-border", color("border"));
      root.style.setProperty("--app-primary", color("primary"));
      root.style.setProperty("--app-primary-contrast", color("primaryContrast"));
      root.style.setProperty("--app-danger", color("danger"));

      const byId = (id) => {
        const element = document.getElementById(id);
        if (!element) throw new Error("Missing mini app element: " + id);
        return element;
      };
      const setText = (id, value) => { byId(id).textContent = value; };
      ${appScript}
    })();
  </script>
</body>
</html>`;
}

function calculatorTemplate(language: MiniAppTemplateLanguage): string {
  const fallback: Copy = language === "fa"
    ? { title: "ماشین‌حساب", first: "عدد اول", operation: "عملیات", second: "عدد دوم", calculate: "محاسبه", note: "این ابزار آفلاین است و با اجرای دوباره بازنشانی می‌شود.", result: "نتیجه اینجا نمایش داده می‌شود." }
    : { title: "Calculator", first: "First number", operation: "Operation", second: "Second number", calculate: "Calculate", note: "This offline tool resets when it is run again.", result: "Your result will appear here." };

  return createDocument(language, fallback.title, `
    <main class="mini-app" aria-labelledby="app-title" aria-describedby="memory-note">
      <header class="app-header">
        <h1 id="app-title">${fallback.title}</h1>
        <p id="memory-note" class="memory-note">${fallback.note}</p>
      </header>
      <div id="calculator-form" class="panel" role="group" aria-labelledby="app-title">
        <p id="calculator-help" class="hint">${fallback.result}</p>
        <div class="field-row">
          <div class="field">
            <label id="first-label" for="first-number">${fallback.first}</label>
            <input id="first-number" type="number" step="any" inputmode="decimal" aria-describedby="calculator-help">
          </div>
          <div class="field">
            <label id="operation-label" for="operation">${fallback.operation}</label>
            <select id="operation">
              <option value="+">+</option>
              <option value="-">−</option>
              <option value="*">×</option>
              <option value="/">÷</option>
            </select>
          </div>
          <div class="field">
            <label id="second-label" for="second-number">${fallback.second}</label>
            <input id="second-number" type="number" step="any" inputmode="decimal" aria-describedby="calculator-help">
          </div>
        </div>
        <div class="action-row"><button id="calculate-button" type="button">${fallback.calculate}</button></div>
        <output id="calculator-result" class="result" role="status" aria-live="polite">${fallback.result}</output>
      </div>
    </main>`, `
      const copy = {
        fa: {
          title: "ماشین‌حساب", first: "عدد اول", operation: "عملیات", second: "عدد دوم", calculate: "محاسبه",
          note: "این ابزار آفلاین است و با اجرای دوباره بازنشانی می‌شود.", prompt: "دو عدد معتبر وارد کنید.",
          divideByZero: "تقسیم بر صفر ممکن نیست.", result: "نتیجه: ", waiting: "نتیجه اینجا نمایش داده می‌شود."
        },
        en: {
          title: "Calculator", first: "First number", operation: "Operation", second: "Second number", calculate: "Calculate",
          note: "This offline tool resets when it is run again.", prompt: "Enter two valid numbers.",
          divideByZero: "Division by zero is not possible.", result: "Result: ", waiting: "Your result will appear here."
        }
      }[language];
      document.title = copy.title;
      setText("app-title", copy.title);
      setText("memory-note", copy.note);
      setText("first-label", copy.first);
      setText("operation-label", copy.operation);
      setText("second-label", copy.second);
      setText("calculate-button", copy.calculate);
      const form = byId("calculator-form");
      const firstInput = byId("first-number");
      const secondInput = byId("second-number");
      const operation = byId("operation");
      const result = byId("calculator-result");
      const numberFrom = (input) => {
        const raw = input.value.trim();
        if (raw === "") return null;
        const value = Number(raw);
        return Number.isFinite(value) ? value : null;
      };
      const calculate = (event) => {
        event.preventDefault();
        const first = numberFrom(firstInput);
        const second = numberFrom(secondInput);
        if (first === null || second === null) {
          result.textContent = copy.prompt;
          return;
        }
        if (operation.value === "/" && second === 0) {
          result.textContent = copy.divideByZero;
          return;
        }
        let value = 0;
        if (operation.value === "+") value = first + second;
        else if (operation.value === "-") value = first - second;
        else if (operation.value === "*") value = first * second;
        else if (operation.value === "/") value = first / second;
        if (!Number.isFinite(value)) {
          result.textContent = copy.prompt;
          return;
        }
        result.textContent = copy.result + String(value);
      };
      // Native form submission is disabled by the host's sandbox. Use explicit
      // button/Enter actions instead, without weakening allow-scripts isolation.
      byId("calculate-button").addEventListener("click", calculate);
      form.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.isComposing && event.target.tagName === "INPUT") calculate(event);
      });
    `);
}

function checklistTemplate(language: MiniAppTemplateLanguage): string {
  const fallback: Copy = language === "fa"
    ? { title: "فهرست بررسی", task: "کار جدید", add: "افزودن", clear: "پاک کردن تکمیل‌شده‌ها", note: "فهرست فقط در حافظه است و با اجرای دوباره بازنشانی می‌شود.", remaining: "۰ کار باقی مانده" }
    : { title: "Checklist", task: "New task", add: "Add", clear: "Clear completed", note: "This list stays only in memory and resets when it is run again.", remaining: "0 tasks remaining" };

  return createDocument(language, fallback.title, `
    <main class="mini-app" aria-labelledby="app-title" aria-describedby="memory-note">
      <header class="app-header">
        <h1 id="app-title">${fallback.title}</h1>
        <p id="memory-note" class="memory-note">${fallback.note}</p>
      </header>
      <section class="panel" aria-labelledby="app-title">
        <div id="checklist-form" role="group" aria-labelledby="task-label">
          <label id="task-label" class="sr-only" for="task-input">${fallback.task}</label>
          <div class="action-row">
            <input id="task-input" type="text" maxlength="120" autocomplete="off" aria-describedby="checklist-status" placeholder="${fallback.task}">
            <button id="add-task" type="button">${fallback.add}</button>
          </div>
        </div>
        <p id="checklist-status" class="status" role="status" aria-live="polite"></p>
        <p id="remaining-count" class="remaining" aria-live="polite">${fallback.remaining}</p>
        <ul id="task-list" class="task-list" aria-label="${fallback.title}"></ul>
        <div class="action-row"><button id="clear-completed" class="secondary" type="button" disabled>${fallback.clear}</button></div>
      </section>
    </main>`, `
      const copy = {
        fa: {
          title: "فهرست بررسی", task: "کار جدید", add: "افزودن", clear: "پاک کردن تکمیل‌شده‌ها",
          note: "فهرست فقط در حافظه است و با اجرای دوباره بازنشانی می‌شود.", empty: "یک کار بنویسید.",
          tooLong: "هر کار می‌تواند حداکثر ۱۲۰ نویسه باشد.", limit: "حداکثر ۶۰ کار می‌توانید اضافه کنید.",
          added: "کار اضافه شد.", deleted: "کار حذف شد.", cleared: "کارهای تکمیل‌شده پاک شدند.",
          completed: "تکمیل شد", remaining: "کار باقی مانده", delete: "حذف", list: "فهرست بررسی"
        },
        en: {
          title: "Checklist", task: "New task", add: "Add", clear: "Clear completed",
          note: "This list stays only in memory and resets when it is run again.", empty: "Write a task first.",
          tooLong: "Each task can be at most 120 characters.", limit: "You can add up to 60 tasks.",
          added: "Task added.", deleted: "Task deleted.", cleared: "Completed tasks cleared.",
          completed: "Completed", remaining: "tasks remaining", delete: "Delete", list: "Checklist"
        }
      }[language];
      const maximumTasks = 60;
      const maximumLength = 120;
      const tasks = [];
      const form = byId("checklist-form");
      const input = byId("task-input");
      const list = byId("task-list");
      const status = byId("checklist-status");
      const remaining = byId("remaining-count");
      const clearButton = byId("clear-completed");
      document.title = copy.title;
      setText("app-title", copy.title);
      setText("memory-note", copy.note);
      setText("task-label", copy.task);
      setText("add-task", copy.add);
      setText("clear-completed", copy.clear);
      list.setAttribute("aria-label", copy.list);
      input.setAttribute("placeholder", copy.task);
      const update = () => {
        list.replaceChildren();
        let remainingCount = 0;
        tasks.forEach((task, index) => {
          if (!task.done) remainingCount += 1;
          const item = document.createElement("li");
          item.className = "task-item" + (task.done ? " done" : "");
          const check = document.createElement("input");
          check.type = "checkbox";
          check.checked = task.done;
          check.setAttribute("aria-label", copy.completed + ": " + task.text);
          check.addEventListener("change", () => {
            task.done = check.checked;
            update();
            list.children[index]?.querySelector("input")?.focus();
          });
          const text = document.createElement("span");
          text.className = "task-text";
          text.textContent = task.text;
          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "secondary";
          remove.textContent = copy.delete;
          remove.setAttribute("aria-label", copy.delete + ": " + task.text);
          remove.addEventListener("click", () => {
            tasks.splice(index, 1);
            status.textContent = copy.deleted;
            update();
          });
          item.append(check, text, remove);
          list.append(item);
        });
        remaining.textContent = String(remainingCount) + " " + copy.remaining;
        clearButton.disabled = !tasks.some((task) => task.done);
      };
      const addTask = (event) => {
        event.preventDefault();
        const text = input.value.trim();
        if (text === "") {
          status.textContent = copy.empty;
          input.focus();
          return;
        }
        if (text.length > maximumLength) {
          status.textContent = copy.tooLong;
          input.focus();
          return;
        }
        if (tasks.length >= maximumTasks) {
          status.textContent = copy.limit;
          input.focus();
          return;
        }
        tasks.push({ text, done: false });
        input.value = "";
        status.textContent = copy.added;
        update();
        input.focus();
      };
      byId("add-task").addEventListener("click", addTask);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.isComposing) addTask(event);
      });
      clearButton.addEventListener("click", () => {
        const before = tasks.length;
        for (let index = tasks.length - 1; index >= 0; index -= 1) {
          if (tasks[index].done) tasks.splice(index, 1);
        }
        status.textContent = before === tasks.length ? "" : copy.cleared;
        update();
      });
      update();
    `);
}

function timerTemplate(language: MiniAppTemplateLanguage): string {
  const fallback: Copy = language === "fa"
    ? { title: "زمان‌سنج", minutes: "دقیقه", seconds: "ثانیه", start: "شروع", pause: "مکث", reset: "بازنشانی", note: "زمان‌سنج فقط در همین اجرا فعال است و با اجرای دوباره بازنشانی می‌شود." }
    : { title: "Timer", minutes: "Minutes", seconds: "Seconds", start: "Start", pause: "Pause", reset: "Reset", note: "This timer only runs in this session and resets when it is run again." };

  return createDocument(language, fallback.title, `
    <main class="mini-app" aria-labelledby="app-title" aria-describedby="memory-note">
      <header class="app-header">
        <h1 id="app-title">${fallback.title}</h1>
        <p id="memory-note" class="memory-note">${fallback.note}</p>
      </header>
      <section class="panel" aria-labelledby="app-title">
        <div class="field-row">
          <div class="field">
            <label id="minutes-label" for="timer-minutes">${fallback.minutes}</label>
            <input id="timer-minutes" type="number" min="0" max="180" step="1" inputmode="numeric" value="0" aria-describedby="timer-status">
          </div>
          <div class="field">
            <label id="seconds-label" for="timer-seconds">${fallback.seconds}</label>
            <input id="timer-seconds" type="number" min="0" max="59" step="1" inputmode="numeric" value="30" aria-describedby="timer-status">
          </div>
        </div>
        <p id="timer-display" class="timer-display" role="timer" aria-live="polite" aria-atomic="true">00:30</p>
        <p id="timer-status" class="status" role="status" aria-live="polite"></p>
        <div class="action-row">
          <button id="timer-start" type="button">${fallback.start}</button>
          <button id="timer-pause" class="secondary" type="button" disabled>${fallback.pause}</button>
          <button id="timer-reset" class="secondary" type="button">${fallback.reset}</button>
        </div>
      </section>
    </main>`, `
      const copy = {
        fa: {
          title: "زمان‌سنج", minutes: "دقیقه", seconds: "ثانیه", start: "شروع", resume: "ادامه", pause: "مکث", reset: "بازنشانی",
          note: "زمان‌سنج فقط در همین اجرا فعال است و با اجرای دوباره بازنشانی می‌شود.", ready: "آماده", running: "در حال اجرا", paused: "مکث شد", completed: "زمان تمام شد.",
          invalid: "دقیقه باید بین ۰ تا ۱۸۰ و ثانیه بین ۰ تا ۵۹ باشد.", zero: "مدت باید بیشتر از صفر باشد.", capped: "مدت به حداکثر ۱۸۰ دقیقه محدود شد."
        },
        en: {
          title: "Timer", minutes: "Minutes", seconds: "Seconds", start: "Start", resume: "Resume", pause: "Pause", reset: "Reset",
          note: "This timer only runs in this session and resets when it is run again.", ready: "Ready", running: "Running", paused: "Paused", completed: "Time is complete.",
          invalid: "Minutes must be 0–180 and seconds must be 0–59.", zero: "Duration must be greater than zero.", capped: "Duration was capped at 180 minutes."
        }
      }[language];
      const maximumSeconds = 180 * 60;
      const minutesInput = byId("timer-minutes");
      const secondsInput = byId("timer-seconds");
      const display = byId("timer-display");
      const status = byId("timer-status");
      const startButton = byId("timer-start");
      const pauseButton = byId("timer-pause");
      const resetButton = byId("timer-reset");
      let running = false;
      let started = false;
      let remainingMilliseconds = 0;
      let deadline = 0;
      let intervalId = null;
      document.title = copy.title;
      setText("app-title", copy.title);
      setText("memory-note", copy.note);
      setText("minutes-label", copy.minutes);
      setText("seconds-label", copy.seconds);
      setText("timer-pause", copy.pause);
      setText("timer-reset", copy.reset);
      const format = (milliseconds) => {
        const total = Math.max(0, Math.ceil(milliseconds / 1000));
        const minutes = Math.floor(total / 60);
        const seconds = total % 60;
        return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
      };
      const render = (milliseconds) => { display.textContent = format(milliseconds); };
      const readDuration = () => {
        if (!minutesInput.value.trim() || !secondsInput.value.trim()) {
          status.textContent = copy.invalid;
          return null;
        }
        const minutes = Number(minutesInput.value);
        const seconds = Number(secondsInput.value);
        if (!Number.isInteger(minutes) || !Number.isInteger(seconds) || minutes < 0 || minutes > 180 || seconds < 0 || seconds > 59) {
          status.textContent = copy.invalid;
          return null;
        }
        const total = Math.min(maximumSeconds, minutes * 60 + seconds);
        if (total === 0) {
          status.textContent = copy.zero;
          return null;
        }
        return { milliseconds: total * 1000, capped: minutes * 60 + seconds > maximumSeconds };
      };
      const stopInterval = () => {
        if (intervalId !== null) {
          window.clearInterval(intervalId);
          intervalId = null;
        }
      };
      const updateControls = () => {
        minutesInput.disabled = started;
        secondsInput.disabled = started;
        startButton.disabled = running;
        pauseButton.disabled = !running;
        startButton.textContent = started && !running ? copy.resume : copy.start;
      };
      const finish = () => {
        stopInterval();
        running = false;
        started = false;
        remainingMilliseconds = 0;
        render(0);
        status.textContent = copy.completed;
        updateControls();
      };
      const tick = () => {
        remainingMilliseconds = Math.max(0, deadline - Date.now());
        render(remainingMilliseconds);
        if (remainingMilliseconds === 0) finish();
      };
      startButton.addEventListener("click", () => {
        if (running) return;
        let capped = false;
        if (!started) {
          const duration = readDuration();
          if (!duration) return;
          remainingMilliseconds = duration.milliseconds;
          started = true;
          capped = duration.capped;
          if (capped) { minutesInput.value = "180"; secondsInput.value = "0"; }
        }
        deadline = Date.now() + remainingMilliseconds;
        running = true;
        stopInterval();
        intervalId = window.setInterval(tick, 250);
        tick();
        status.textContent = copy.running + (capped ? " · " + copy.capped : "");
        updateControls();
      });
      pauseButton.addEventListener("click", () => {
        if (!running) return;
        remainingMilliseconds = Math.max(0, deadline - Date.now());
        if (remainingMilliseconds === 0) { finish(); return; }
        running = false;
        stopInterval();
        render(remainingMilliseconds);
        status.textContent = copy.paused;
        updateControls();
      });
      const previewDuration = () => {
        if (started) return;
        const minutes = Number(minutesInput.value);
        const seconds = Number(secondsInput.value);
        if (Number.isInteger(minutes) && Number.isInteger(seconds) && minutes >= 0 && minutes <= 180 && seconds >= 0 && seconds <= 59) {
          render(Math.min(maximumSeconds, minutes * 60 + seconds) * 1000);
          status.textContent = "";
        }
      };
      minutesInput.addEventListener("input", previewDuration);
      secondsInput.addEventListener("input", previewDuration);
      resetButton.addEventListener("click", () => {
        stopInterval();
        running = false;
        started = false;
        remainingMilliseconds = 0;
        previewDuration();
        status.textContent = copy.ready;
        updateControls();
        minutesInput.focus();
      });
      updateControls();
    `);
}

export function buildMiniAppTemplate(id: MiniAppTemplateId, language: MiniAppTemplateLanguage): string {
  if (id === "calculator") return calculatorTemplate(language);
  if (id === "checklist") return checklistTemplate(language);
  return timerTemplate(language);
}
