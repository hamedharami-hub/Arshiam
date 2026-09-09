/**
 * Sanitizes rich card content before it is rendered with
 * `dangerouslySetInnerHTML`. Card content can come from local edits, synced
 * Firestore data, and AI output, so it must not be treated as trusted HTML.
 */
export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined' || !html) return '';

  const allowedTags = new Set([
    'a', 'b', 'blockquote', 'br', 'code', 'del', 'div', 'em', 'h1', 'h2', 'h3',
    'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 'span', 'strong',
    'table', 'tbody', 'td', 'th', 'thead', 'tr', 'u', 'ul',
  ]);
  const allowedAttributes = new Set(['alt', 'class', 'colspan', 'dir', 'href', 'rowspan', 'src', 'target', 'title']);

  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const elements = Array.from(doc.body.querySelectorAll('*'));

    for (const element of elements) {
      const tag = element.tagName.toLowerCase();
      if (!allowedTags.has(tag)) {
        element.replaceWith(...Array.from(element.childNodes));
        continue;
      }

      for (const attribute of Array.from(element.attributes)) {
        const name = attribute.name.toLowerCase();
        if (!allowedAttributes.has(name)) {
          element.removeAttribute(attribute.name);
          continue;
        }

        if ((name === 'href' || name === 'src') && !isSafeUrl(attribute.value, name === 'src')) {
          element.removeAttribute(attribute.name);
        }
      }

      if (tag === 'a' && element.getAttribute('target') === '_blank') {
        element.setAttribute('rel', 'noopener noreferrer');
      }
    }

    return doc.body.innerHTML;
  } catch {
    // Rendering plain text is safer than returning unsanitized markup when
    // browser parsing fails unexpectedly.
    return escapeHtml(html);
  }
}

function isSafeUrl(value: string, isImage: boolean): boolean {
  try {
    const url = new URL(value, window.location.origin);
    if (url.protocol === 'http:' || url.protocol === 'https:') return true;
    return isImage && url.protocol === 'data:' && /^data:image\/(?:png|gif|jpe?g|webp);base64,/i.test(value);
  } catch {
    return false;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] || character);
}
