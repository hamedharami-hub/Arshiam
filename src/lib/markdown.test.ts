import { describe, expect, it } from "vitest";
import { htmlToMarkdown, markdownToHtml } from "./markdown";

describe("note formatting round trips", () => {
  it("preserves text color and highlight color when saving rich text", () => {
    const rendered = document.createElement("div");
    rendered.innerHTML = markdownToHtml(htmlToMarkdown('<p><span style="color: red"><strong>Color</strong></span><mark style="background-color: yellow">Highlight</mark></p>'));
    expect(rendered.querySelector("span")?.style.color).toBe("red");
    expect(rendered.querySelector("span strong")?.textContent).toBe("Color");
    expect(rendered.querySelector("mark")?.style.backgroundColor).toBe("yellow");
  });
  it("retains underline and highlight alongside nested bold", () => {
    const saved = htmlToMarkdown("<p><u><strong>Important</strong></u> <mark>remember</mark></p>");
    const rendered = document.createElement("div");
    rendered.innerHTML = markdownToHtml(saved);
    expect(rendered.querySelector("u strong")?.textContent).toBe("Important");
    expect(rendered.querySelector("mark")?.textContent).toBe("remember");
  });
  it("retains paragraph alignment", () => {
    const rendered = document.createElement("div");
    rendered.innerHTML = markdownToHtml(htmlToMarkdown('<p style="text-align: right"><u>Note</u></p>'));
    expect(rendered.querySelector("p")?.style.textAlign).toBe("right");
    expect(rendered.querySelector("u")?.textContent).toBe("Note");
  });
});
