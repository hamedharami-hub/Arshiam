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

  it("retains HTML tables instead of flattening their cells into prose", () => {
    const table = '<table class="legacy-grid"><thead><tr><th scope="col">Step</th><th>Owner</th></tr></thead><tbody><tr><td rowspan="2">Review</td><td>Sam</td></tr><tr><td><strong>Rae</strong></td></tr></tbody></table>';
    const markdown = htmlToMarkdown(`<p>Before</p>${table}<p>After</p>`);
    const rendered = document.createElement("div");
    rendered.innerHTML = markdownToHtml(markdown);

    expect(markdown).toContain('<table class="legacy-grid">');
    expect(rendered.querySelector("table.legacy-grid th")?.textContent).toBe("Step");
    expect(rendered.querySelector("td[rowspan='2']")?.textContent).toBe("Review");
    expect(rendered.querySelector("td strong")?.textContent).toBe("Rae");
  });

  it("retains YouTube embeds in raw HTML through Markdown", () => {
    const embed = '<div data-youtube-video=""><iframe src="https://www.youtube-nocookie.com/embed/abc123" title="Lesson"></iframe></div>';
    const markdown = htmlToMarkdown(`<p>Before</p>${embed}<p>After</p>`);
    const rendered = document.createElement("div");
    rendered.innerHTML = markdownToHtml(markdown);

    expect(markdown).toContain('data-youtube-video');
    expect(rendered.querySelector("[data-youtube-video] iframe")?.getAttribute("src")).toContain("abc123");
    expect(rendered.querySelector("iframe")?.getAttribute("title")).toBe("Lesson");
  });

  it("retains legacy base64 images and safely serializes attachment names", () => {
    const source = '<p><img alt="diagram ](review).png" title="review &quot;draft&quot;" src="https://cdn.example.test/diagram.png"></p><p><img alt="old image" src="data:image/png;base64,aGVsbG8="></p><p><a href="https://cdn.example.test/files/final%20report.pdf">📎 final [review] report.pdf</a></p>';
    const markdown = htmlToMarkdown(source);
    const rendered = document.createElement("div");
    rendered.innerHTML = markdownToHtml(markdown);

    expect(markdown).toContain("diagram \\](review)");
    expect(rendered.querySelector('img[src="https://cdn.example.test/diagram.png"]')?.getAttribute("alt")).toBe("diagram ](review).png");
    expect(rendered.querySelector('img[src="https://cdn.example.test/diagram.png"]')?.getAttribute("title")).toBe('review "draft"');
    expect(rendered.querySelector('img[src^="data:image/png;base64,"]')?.getAttribute("src")).toBe("data:image/png;base64,aGVsbG8=");
    expect(rendered.querySelector("a")?.textContent).toBe("📎 final [review] report.pdf");
    expect(rendered.querySelector("a")?.getAttribute("href")).toBe("https://cdn.example.test/files/final%20report.pdf");
  });

  it("converts old Markdown data-image links back to editable raw image markup", () => {
    const rendered = document.createElement("div");
    rendered.innerHTML = markdownToHtml("![old \\] image](data:image/png;base64,aGVsbG8=)");
    expect(rendered.querySelector("img")?.getAttribute("alt")).toBe("old ] image");
    expect(rendered.querySelector("img")?.getAttribute("src")).toBe("data:image/png;base64,aGVsbG8=");
  });

  it("recovers an escaped legacy base64 image without decoding other inline examples", () => {
    const rendered = document.createElement("div");
    rendered.innerHTML = markdownToHtml('&lt;img alt=&quot;scan&quot; src=&quot;data:image/png;base64,aGVsbG8=&quot;&gt;');
    expect(rendered.querySelector("img")?.getAttribute("alt")).toBe("scan");
    expect(rendered.querySelector("img")?.getAttribute("src")).toBe("data:image/png;base64,aGVsbG8=");
    expect(markdownToHtml("Example: &lt;img src=&quot;data:image/png;base64,aGVsbG8=&quot;&gt;")).not.toContain("<img src=\"data:image/png");
  });
});
