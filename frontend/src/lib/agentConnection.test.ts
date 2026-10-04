import { describe, expect, it } from "vitest";
import { agentInstructions, agentServerOrigin, readAgentResponse } from "./agentConnection";

describe("agent connection", () => {
  it("uses the Vercel server for local/native apps and preserves deployed web origins", () => {
    expect(agentServerOrigin("http://localhost:3000", "")).toBe("https://arshiam.vercel.app");
    expect(agentServerOrigin("capacitor://localhost", "")).toBe("https://arshiam.vercel.app");
    expect(agentServerOrigin("https://my-app.example", "")).toBe("https://my-app.example");
    expect(agentServerOrigin("http://localhost:3000", "https://agents.example/")).toBe("https://agents.example");
    expect(() => agentServerOrigin("http://localhost", "https://agents.example/api")).toThrow();
    expect(() => agentServerOrigin("http://localhost", "http://agents.example")).toThrow();
  });

  it("explains a static-server response instead of leaking a JSON parser error", async () => {
    await expect(readAgentResponse(new Response("<html>app</html>", { headers: { "Content-Type": "text/html" } }), true)).rejects.toThrow("API is deployed");
    await expect(readAgentResponse(new Response("import x from './x'", { headers: { "Content-Type": "text/javascript" } }), false)).rejects.toThrow("آدرس سرور");
  });

  it("preserves server configuration errors and rejects malformed JSON", async () => {
    await expect(readAgentResponse(new Response(JSON.stringify({ error: { message: "Configure Firebase Admin" } }), { status: 503, headers: { "Content-Type": "application/json" } }), true)).rejects.toThrow("Configure Firebase Admin");
    await expect(readAgentResponse(new Response("{", { headers: { "Content-Type": "application/json" } }), true)).rejects.toThrow("invalid response");
  });

  it("provides a schema and verification instructions without embedding a token", () => {
    const guide = agentInstructions("https://agents.example");
    expect(guide).toContain("https://agents.example/agent-openapi.json");
    expect(guide).toContain("GET /me");
    expect(guide).not.toContain("arshnaz_pat_");
  });
});
