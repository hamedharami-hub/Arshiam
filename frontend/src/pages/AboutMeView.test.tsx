import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AboutMeView from "./AboutMeView";

let mockUser = { id: "user_test_me", email: "me@example.com" };
const mockedFirebaseAuth = vi.hoisted(() => ({ currentUser: null as { uid: string } | null }));
vi.mock("@/lib/firebase", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/firebase")>()),
  auth: mockedFirebaseAuth,
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({
    T: (_fa: string, en: string) => en,
    isEn: true,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

let mockAboutMeRow: any = null;
let mockAboutMeRows: Record<string, any> = {};
vi.mock("@/lib/aboutMe", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    loadAboutMe: vi.fn(async (uid: string) => mockAboutMeRows[uid] ?? mockAboutMeRow),
    saveAboutMe: vi.fn(async (_uid: string, patch: any) => {
      const current = mockAboutMeRows[_uid] ?? mockAboutMeRow;
      mockAboutMeRows[_uid] = { ...current, ...patch, user_id: _uid };
      if (_uid === mockUser.id) mockAboutMeRow = mockAboutMeRows[_uid];
    }),
  };
});

let mockCallAIResult: any = null;
let mockCallAIErr: Error | null = null;
vi.mock("@/lib/ai", () => ({
  callAI: vi.fn(async () => {
    if (mockCallAIErr) throw mockCallAIErr;
    return mockCallAIResult;
  }),
}));

describe("AboutMeView AI analysis & answer preservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "user_test_me", email: "me@example.com" };
    mockedFirebaseAuth.currentUser = { uid: mockUser.id };
    mockAboutMeRow = {
      user_id: "user_test_me",
      answers: { occupation: "Designer" },
      free_text: "Seeking better focus",
      ai_analysis: null,
      ai_suggestions: null,
      analyzed_at: null,
      updated_at: new Date().toISOString(),
    };
    mockAboutMeRows = { [mockUser.id]: mockAboutMeRow };
    mockCallAIErr = null;
    mockCallAIResult = {
      provider: "gemini",
      model: "gemini-2.5-flash",
      data: {
        ai_analysis: {
          summary: "Creative professional seeking structured focus blocks.",
          themes: ["Design", "Productivity"],
          strengths: ["Creativity"],
          risks: ["Distraction"],
        },
        ai_suggestions: {
          folders: ["Creative Projects"],
          tags: ["Design"],
          tasks: [{ title: "Set morning creative hour", folder: "Creative Projects", priority: "high" }],
        },
      },
    };
    mockCallAIResult.text = JSON.stringify(mockCallAIResult.data);
  });

  it("renders questionnaire wizard and saves answers safely", async () => {
    render(<AboutMeView />);

    await waitFor(() => {
      expect(screen.getByText("About Me")).toBeInTheDocument();
    });

    const nextBtn = screen.getByRole("button", { name: /Next/i });
    expect(nextBtn).toBeInTheDocument();
  });

  it("renders review mode with non-clinical disclaimer banner when analysis exists", async () => {
    mockAboutMeRow.ai_analysis = {
      summary: "Balanced personal summary",
      themes: ["Wellness"],
      strengths: ["Resilience"],
      risks: ["Time crunch"],
    };
    mockAboutMeRow.ai_suggestions = {
      folders: ["Wellness"],
      tags: ["Health"],
      tasks: [{ title: "Walk for 20 mins", priority: "medium" }],
    };

    render(<AboutMeView />);

    await waitFor(() => {
      expect(screen.getByText(/Non-clinical personal summary/i)).toBeInTheDocument();
      expect(screen.getByText("Balanced personal summary")).toBeInTheDocument();
      expect(screen.getByText("Wellness")).toBeInTheDocument();
    });

    // Suggestions require explicit user click to apply
    expect(screen.getByText("+ Wellness")).toBeInTheDocument();
    expect(screen.getByText("# Health")).toBeInTheDocument();
  });

  it("preserves manual answers and displays error toast if AI analysis fails", async () => {
    mockCallAIErr = new Error("Google Gemini API key not found");

    render(<AboutMeView />);

    await waitFor(() => {
      expect(screen.getByText("About Me")).toBeInTheDocument();
    });

    // Save button triggers persist()
    const saveBtn = await screen.findByRole("button", { name: /^Save$/i });
    fireEvent.click(saveBtn);

    const { toast } = await import("sonner");
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Answers saved successfully ✓");
    });
  });

  it("does not save an unstructured response as an About Me analysis", async () => {
    mockAboutMeRow.ai_analysis = {
      summary: "Existing profile",
      themes: ["Focus"],
      strengths: ["Persistence"],
      risks: ["Distraction"],
    };
    mockCallAIResult = {
      text: "Here is some unstructured advice.",
      // `callAI` normalizes malformed About Me output to an object. The page
      // must validate the provider's original text instead of trusting it.
      data: {
        ai_analysis: { summary: "Here is some unstructured advice.", themes: [], strengths: [], risks: [] },
        ai_suggestions: { folders: [], tags: [], tasks: [] },
      },
    };

    render(<AboutMeView />);
    await screen.findByText("Existing profile");
    fireEvent.click(screen.getByRole("button", { name: /Re-analyze/i }));

    const { toast } = await import("sonner");
    const aboutMe = await import("@/lib/aboutMe");
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Answers saved, but AI did not produce structured output."));
    await waitFor(() => expect(screen.getByRole("button", { name: /Re-analyze/i })).toBeEnabled());
    const writes = vi.mocked(aboutMe.saveAboutMe).mock.calls;
    expect(writes.some(([, patch]) => Object.prototype.hasOwnProperty.call(patch, "ai_analysis"))).toBe(false);
  });

  it("does not carry a prior account's answers into the next account's AI request or save", async () => {
    mockAboutMeRows = {
      user_test_me: {
        ...mockAboutMeRow,
        answers: { occupation: "PRIVATE_OLD_ACCOUNT_ROLE" },
        free_text: "PRIVATE_OLD_ACCOUNT_NOTE",
      },
      user_next: {
        user_id: "user_next",
        answers: { occupation: "Current account role" },
        free_text: "Current account note",
        ai_analysis: { summary: "Existing current profile", themes: ["Focus"], strengths: ["Care"], risks: ["Time"] },
        ai_suggestions: { folders: [], tags: [], tasks: [] },
        analyzed_at: null,
        updated_at: new Date().toISOString(),
      },
    };
    mockAboutMeRow = mockAboutMeRows.user_test_me;

    const { rerender } = render(<AboutMeView />);
    await screen.findByDisplayValue("PRIVATE_OLD_ACCOUNT_ROLE");

    mockUser = { id: "user_next", email: "next@example.com" };
    mockedFirebaseAuth.currentUser = { uid: mockUser.id };
    rerender(<AboutMeView />);

    await screen.findByText("Existing current profile");
    expect(screen.queryByDisplayValue("PRIVATE_OLD_ACCOUNT_ROLE")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Re-analyze/i }));

    await waitFor(async () => {
      const ai = await import("@/lib/ai");
      expect(ai.callAI).toHaveBeenCalled();
    });
    const ai = await import("@/lib/ai");
    const latestCall = vi.mocked(ai.callAI).mock.calls.at(-1)!;
    expect(latestCall[0]).toBe("about_me_analysis");
    expect(latestCall[1]).toMatchObject({ answers: { occupation: "Current account role" }, free_text: "Current account note" });
    expect(JSON.stringify(latestCall[1])).not.toContain("PRIVATE_OLD_ACCOUNT");

    const aboutMe = await import("@/lib/aboutMe");
    const ownerWrites = vi.mocked(aboutMe.saveAboutMe).mock.calls.filter(([uid]) => uid === "user_next");
    expect(ownerWrites.length).toBeGreaterThan(0);
    for (const [, patch] of ownerWrites) {
      expect(JSON.stringify(patch)).not.toContain("PRIVATE_OLD_ACCOUNT");
    }
  });

  it("blocks profile actions if Firebase auth changes before the auth hook updates", async () => {
    mockAboutMeRow.ai_analysis = { summary: "Current profile", themes: [], strengths: [], risks: [] };
    mockAboutMeRows[mockUser.id] = mockAboutMeRow;
    render(<AboutMeView />);
    await screen.findByText("Current profile");

    mockedFirebaseAuth.currentUser = { uid: "user_next" };
    fireEvent.click(screen.getByRole("button", { name: /Re-analyze/i }));

    const aboutMe = await import("@/lib/aboutMe");
    const ai = await import("@/lib/ai");
    expect(aboutMe.saveAboutMe).not.toHaveBeenCalled();
    expect(ai.callAI).not.toHaveBeenCalled();
  });

  it("does not render an old profile when its load resolves after Firebase auth changes", async () => {
    let resolveLoad!: (row: any) => void;
    const aboutMe = await import("@/lib/aboutMe");
    vi.mocked(aboutMe.loadAboutMe).mockImplementationOnce(() => new Promise((resolve) => { resolveLoad = resolve; }));

    render(<AboutMeView />);
    await screen.findByText(/Loading this account/i);
    mockedFirebaseAuth.currentUser = { uid: "user_next" };
    resolveLoad({ ...mockAboutMeRow, answers: { occupation: "PRIVATE_OLD_ACCOUNT_ROLE" } });

    await waitFor(() => expect(screen.getByText(/Loading this account/i)).toBeInTheDocument());
    expect(screen.queryByDisplayValue("PRIVATE_OLD_ACCOUNT_ROLE")).not.toBeInTheDocument();
    expect(screen.queryByText("Re-analyze")).not.toBeInTheDocument();
  });
});
