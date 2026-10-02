import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  platform: vi.fn(), native: vi.fn(), popup: vi.fn(), credential: vi.fn(), signIn: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: mocks.platform }, registerPlugin: () => ({ signIn: mocks.native }) }));
vi.mock("firebase/auth", () => ({ GoogleAuthProvider: { credential: mocks.credential }, signInWithPopup: mocks.popup, signInWithCredential: mocks.signIn }));
vi.mock("./firebase", () => ({ auth: {}, googleProvider: {} }));
import { googleSignInError, signInGoogleCredential } from "./googleSignIn";

describe("Google login platform boundary", () => {
  beforeEach(() => vi.resetAllMocks());
  it("uses system Google credential on Android and authenticates it with Firebase", async () => {
    mocks.platform.mockReturnValue("android");
    mocks.native.mockResolvedValue({ idToken: "test-google-token" });
    mocks.credential.mockReturnValue({ providerId: "google.com" });
    mocks.signIn.mockResolvedValue({ user: { uid: "test-user" } });
    await expect(signInGoogleCredential()).resolves.toEqual({ user: { uid: "test-user" } });
    expect(mocks.popup).not.toHaveBeenCalled();
    expect(mocks.credential).toHaveBeenCalledWith("test-google-token");
    expect(mocks.signIn).toHaveBeenCalledOnce();
  });
  it("retains browser popup login on web", async () => {
    mocks.platform.mockReturnValue("web");
    await signInGoogleCredential();
    expect(mocks.popup).toHaveBeenCalledOnce();
    expect(mocks.native).not.toHaveBeenCalled();
  });
  it("never falls back to a WebView popup when native login fails", async () => {
    mocks.platform.mockReturnValue("android");
    mocks.native.mockRejectedValue({ code: "GOOGLE_CANCELLED" });
    await expect(signInGoogleCredential()).rejects.toEqual({ code: "GOOGLE_CANCELLED" });
    expect(mocks.popup).not.toHaveBeenCalled();
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
  it("rejects an empty native credential", async () => {
    mocks.platform.mockReturnValue("android");
    mocks.native.mockResolvedValue({ idToken: "" });
    await expect(signInGoogleCredential()).rejects.toMatchObject({ code: "GOOGLE_CREDENTIAL" });
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
  it("distinguishes provider configuration from popup errors", () => {
    expect(googleSignInError("auth/unauthorized-domain")).not.toEqual(googleSignInError("auth/popup-blocked"));
    expect(googleSignInError("auth/operation-not-allowed")).toContain("فعال نیست");
  });
});
