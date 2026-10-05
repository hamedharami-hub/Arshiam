import { describe, expect, it } from "vitest";
import { resolveAccountDeletionUrl } from "./accountDeletionUrl";

describe("account deletion endpoint", () => {
  it("uses the web app origin even when a separate FastAPI origin exists", () => {
    expect(resolveAccountDeletionUrl("https://arshiam.vercel.app", false, "https://other.example")).toBe("https://arshiam.vercel.app/api/user/delete-account");
  });

  it("requires an explicit HTTPS Vercel origin in a native build", () => {
    expect(() => resolveAccountDeletionUrl("capacitor://localhost", true)).toThrow("VITE_ACCOUNT_API_URL");
    expect(resolveAccountDeletionUrl("capacitor://localhost", true, "https://arshiam.vercel.app")).toBe("https://arshiam.vercel.app/api/user/delete-account");
    expect(() => resolveAccountDeletionUrl("capacitor://localhost", true, "http://insecure.example")).toThrow("HTTPS");
    expect(() => resolveAccountDeletionUrl("capacitor://localhost", true, "https://arshiam.vercel.app/other")).toThrow("HTTPS");
  });
});
