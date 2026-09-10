import { beforeEach, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
const mocks = vi.hoisted(() => ({
  permission: vi.fn(async () => true),
  configure: vi.fn(async () => ({
    panelEnabled: true,
    notificationsAllowed: true,
    exactAllowed: false,
    scheduledCount: 2,
  })),
  status: vi.fn(async () => ({
    panelEnabled: false,
    notificationsAllowed: true,
    exactAllowed: false,
    scheduledCount: 2,
  })),
  haptic: vi.fn(),
}));
vi.mock("@/lib/nativeExperience", () => ({
  isAndroid: () => true,
  nativeExperience: {
    status: mocks.status,
    configure: mocks.configure,
    haptic: mocks.haptic,
  },
}));
vi.mock("@/lib/notify", () => ({
  ensureNotificationPermission: mocks.permission,
}));
vi.mock("@/lib/haptics", () => ({ haptic: mocks.haptic }));
vi.mock("@capacitor/app", () => ({
  App: { addListener: async () => ({ remove: async () => {} }) },
}));
import AndroidSettings from "./AndroidSettings";
beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
  mocks.permission.mockResolvedValue(true);
});
it("enables the native panel only after notification permission", async () => {
  render(<AndroidSettings />);
  const button = await screen.findByRole("button", {
    name: "فعال کردن پنل تسک‌ها در اعلان",
  });
  await waitFor(() => expect(button).not.toBeDisabled());
  fireEvent.click(button);
  await screen.findByRole("button", { name: "خاموش کردن پنل تسک‌ها در اعلان" });
  expect(mocks.configure).toHaveBeenCalledWith({ panelEnabled: true });
});
it("does not enable the panel when permission is denied", async () => {
  mocks.permission.mockResolvedValue(false);
  render(<AndroidSettings />);
  const button = screen.getByRole("button", {
    name: "فعال کردن پنل تسک‌ها در اعلان",
  });
  await waitFor(() => expect(button).not.toBeDisabled());
  fireEvent.click(button);
  await waitFor(() => expect(mocks.permission).toHaveBeenCalled());
  expect(mocks.configure).not.toHaveBeenCalled();
});
