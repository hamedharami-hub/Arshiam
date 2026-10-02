/** One-time cleanup of keys that referenced removed features; leaves every other user choice untouched. */
export function purgeRetiredFeatureKeys() {
  if (typeof localStorage === "undefined") return;
  try {
    const retired = (v: unknown) => typeof v === "string" && /socratic/i.test(v);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (!k) continue;
      const isPins = k.startsWith("mind_pinned_tools_v2_");
      const isQuick = k.includes("sidebar_quick_links") || k.includes("sidebarQuickLinks");
      if (!isPins && !isQuick) continue;
      const raw = localStorage.getItem(k);
      if (!raw || !/socratic/i.test(raw)) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) localStorage.setItem(k, JSON.stringify(parsed.filter((x) => !retired(x))));
    }
  } catch {
    /* storage is optional */
  }
}
