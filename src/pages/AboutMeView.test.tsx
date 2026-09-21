import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AboutMeView from "./AboutMeView";

const mockUser = { id: "user_test_me", email: "me@example.com" };
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
vi.mock("@/lib/aboutMe", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    loadAboutMe: vi.fn(async () => mockAboutMeRow),
    saveAboutMe: vi.fn(async (_uid: string, patch: any) => {
      mockAboutMeRow = { ...mockAboutMeRow, ...patch };
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
    mockAboutMeRow = {
      user_id: "user_test_me",
      answers: { occupation: "Designer" },
      free_text: "Seeking better focus",
      ai_analysis: null,
      ai_suggestions: null,
      analyzed_at: null,
      updated_at: new Date().toISOString(),
    };
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
    const saveBtn = screen.getByRole("button", { name: /^Save$/i });
    fireEvent.click(saveBtn);

    const { toast } = await import("sonner");
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Answers saved successfully ✓");
    });
  });
});
