// Development-only harness: local synthetic data; never connects to Firebase.
if (!import.meta.env.DEV) throw new Error("Test harness is development-only");
const status = { notificationsAllowed: true, exactAllowed: false, panelEnabled: false, remindersEnabled: true, scheduledCount: 2 };
Object.assign(window, { Capacitor: {
  getPlatform: () => "android", isNativePlatform: () => true,
  Plugins: {
    NativeExperience: {
      status: async () => ({ ...status }),
      configure: async (patch: object) => Object.assign(status, patch),
      haptic: async () => ({ performed: false }),
      openExactSettings: async () => {}, openNotificationSettings: async () => {},
    },
    App: { addListener: async () => ({ remove: async () => {} }) },
    LocalNotifications: { checkPermissions: async () => ({ display: "granted" }), registerActionTypes: async () => {}, addListener: async () => ({ remove: async () => {} }) },
  },
} });
async function mount() {
  const { Capacitor, registerPlugin } = await import("@capacitor/core");
  const mocks = (window as unknown as { Capacitor: { Plugins: Record<string, object> } }).Capacitor.Plugins;
  for (const name of ["NativeExperience", "App", "LocalNotifications"]) registerPlugin(name, { web: mocks[name] });
  Capacitor.getPlatform = () => "android";
  Capacitor.isNativePlatform = () => true;
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { BrowserRouter, useLocation } = await import("react-router-dom");
  const { SidebarProvider, Sidebar, SidebarTrigger } = await import("@/components/ui/sidebar");
  const { default: AndroidSettings } = await import("@/components/AndroidSettings");
  const { default: AndroidGestures } = await import("@/components/AndroidGestures");
  await import("../index.css");
  function Harness() {
    const location = useLocation();
    return <SidebarProvider><Sidebar side="right"><p className="p-6">پوشه‌های آزمایشی</p></Sidebar>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
        <p>محیط آزمون رابط — داده‌های ساختگی؛ بدون اتصال به حساب</p>
        <SidebarTrigger/><p>{location.pathname}</p><AndroidSettings/>
      </main><AndroidGestures/></SidebarProvider>;
  }
  createRoot(document.getElementById("root")!).render(<BrowserRouter><Harness/></BrowserRouter>);
}
void mount();
