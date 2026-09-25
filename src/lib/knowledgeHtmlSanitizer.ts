import DOMPurify from "dompurify";

const KNOWLEDGE_HTML_DATA_ATTRIBUTES = [
  "data-doc-link",
  "data-correct",
  "data-rationale",
  "data-pairs-total",
  "data-pairs-count",
  "data-pair-id",
  "data-side",
  "data-next-step",
  "data-step",
  "data-answer",
  "data-target-node",
  "data-node-id",
  "data-current-node",
  "data-card-id",
  "data-type",
  "data-checked",
] as const;

const ORDERED_LIST_DIGITS: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

function getConsecutiveNumberedItems(text: string) {
  const markerPattern = /(^|[\s\u00a0])([0-9۰-۹٠-٩]{1,3})[.)][\t \u00a0]+/gu;
  const markers = Array.from(text.matchAll(markerPattern));
  if (markers.length < 2) return null;

  const numbers = markers.map((marker) =>
    Number(marker[2].replace(/[۰-۹٠-٩]/g, (digit) => ORDERED_LIST_DIGITS[digit]))
  );
  if (numbers.some((number, index) => index > 0 && number !== numbers[index - 1] + 1)) return null;

  const firstMarker = markers[0];
  const prefixEnd = (firstMarker.index ?? 0) + firstMarker[1].length;
  const prefix = text.slice(0, prefixEnd).trim();
  const items = markers.map((marker, index) => {
    const start = (marker.index ?? 0) + marker[0].length;
    const end = index + 1 < markers.length ? markers[index + 1].index ?? text.length : text.length;
    return text.slice(start, end).trim();
  });
  if (items.some((item) => item.length < 3)) return null;
  return { prefix, items, start: numbers[0] };
}

function formatInlineNumberedLists(sanitizedHtml: string): string {
  if (!sanitizedHtml || typeof DOMParser === "undefined") return sanitizedHtml;
  const quickMarkers = sanitizedHtml.match(/(?:^|[\s>])[0-9۰-۹٠-٩]{1,3}[.)][\t \u00a0]+/gu);
  if (!quickMarkers || quickMarkers.length < 2) return sanitizedHtml;

  const parsed = new DOMParser().parseFromString(sanitizedHtml, "text/html");
  const blocks = Array.from(parsed.body.querySelectorAll("p, blockquote, div"));
  let changed = false;

  for (const block of blocks) {
    if (block.childNodes.length !== 1 || block.firstChild?.nodeType !== 3) continue;
    const sequence = getConsecutiveNumberedItems(block.textContent || "");
    if (!sequence) continue;

    const list = parsed.createElement("ol");
    if (sequence.start !== 1) list.start = sequence.start;
    for (const itemText of sequence.items) {
      const item = parsed.createElement("li");
      item.textContent = itemText;
      list.append(item);
    }

    const prefixElement = sequence.prefix
      ? block.tagName === "P"
        ? (block.cloneNode(false) as HTMLElement)
        : parsed.createElement("p")
      : null;
    if (prefixElement) prefixElement.textContent = sequence.prefix;

    if (block.tagName === "P") {
      const replacement = parsed.createDocumentFragment();
      if (prefixElement) replacement.append(prefixElement);
      replacement.append(list);
      block.replaceWith(replacement);
    } else {
      block.replaceChildren();
      if (prefixElement) block.append(prefixElement);
      block.append(list);
    }
    changed = true;
  }

  return changed ? parsed.body.innerHTML : sanitizedHtml;
}

/** Sanitize imported/generated lesson HTML and retain only app-supported data attributes. */
export function sanitizeKnowledgeHtml(rawHtml: string): string {
  if (!rawHtml) return "";

  const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: [...KNOWLEDGE_HTML_DATA_ATTRIBUTES],
    FORBID_TAGS: ["style", "iframe", "form"],
    FORBID_ATTR: ["style"],
  });

  return formatInlineNumberedLists(sanitizedHtml);
}
