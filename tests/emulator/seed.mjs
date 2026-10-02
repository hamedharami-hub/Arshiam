// Seeds the local Firestore emulator with a cascading plan for QA (never touches the real project).
// Usage: node tests/emulator/seed.mjs <uid>
import { startOfYear, endOfYear, startOfQuarter, endOfQuarter, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays } from "date-fns-jalali";
import fs from "fs";

const uid = process.argv[2];
const cfg = JSON.parse(fs.readFileSync(new URL("../../firebase-applet-config.json", import.meta.url)));
const base = `http://localhost:8085/v1/projects/demo-arshnaz/databases/${cfg.firestoreDatabaseId || "(default)"}/documents/users/${uid}`;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const now = new Date();
const P = {
  year: [startOfYear(now), endOfYear(now)],
  quarter: [startOfQuarter(now), endOfQuarter(now)],
  month: [startOfMonth(now), endOfMonth(now)],
  week: [startOfWeek(now, { weekStartsOn: 6 }), endOfWeek(now, { weekStartsOn: 6 })],
  lastWeek: [startOfWeek(addDays(now, -7), { weekStartsOn: 6 }), endOfWeek(addDays(now, -7), { weekStartsOn: 6 })],
  day: [now, now],
};
const plan = (h, key = h) => ({ planning_horizon: h, planning_start: iso(P[key][0]), planning_end: iso(P[key][1]), planning_calendar: "jalali" });
const val = (v) => v === null ? { nullValue: null } : typeof v === "boolean" ? { booleanValue: v } : typeof v === "number" ? { integerValue: String(v) } : { stringValue: String(v) };
const ts = new Date().toISOString();
const task = (id, title, extra = {}) => ({ id, user_id: uid, title, priority: "none", completed: false, status: "todo", parent_id: null, folder_id: null, position: 0, created_at: ts, updated_at: ts, ...extra });
const docs = [
  task("y1", "یادگیری کامل داروسازی بالینی", plan("year")),
  task("y2", "سلامتی: ۵۰ کیلومتر دویدن در ماه", plan("year")),
  task("q1", "تمام کردن فصل‌های ۱ تا ۴", { ...plan("quarter"), plan_parent_id: "y1" }),
  task("m1", "مرور فصل ۲ و حل تمرین‌ها", { ...plan("month"), plan_parent_id: "q1" }),
  task("m2", "ثبت‌نام باشگاه", { ...plan("month"), plan_parent_id: "y2" }),
  task("w1", "خواندن ۳۰ صفحه از فصل ۲", { ...plan("week"), plan_parent_id: "m1" }),
  task("w2", "دویدن سه جلسه", { ...plan("week"), plan_parent_id: "m2", completed: true, status: "done" }),
  task("old1", "تماس با بانک", plan("week", "lastWeek")),
  task("d1", "خلاصه‌نویسی صفحات ۱ تا ۱۰", { ...plan("day"), plan_parent_id: "w1" }),
  task("u1", "خرید هدیهٔ تولد"),
  task("u2", "تعمیر دوچرخه"),
];
for (const d of docs) {
  const fields = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, val(v)]));
  const r = await fetch(`${base}/tasks/${d.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer owner" }, body: JSON.stringify({ fields }) });
  if (!r.ok) console.error(d.id, r.status, await r.text());
}
console.log("seeded", docs.length);
