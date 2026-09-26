function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const hasContent = (value) => {
  if (value === null || value === undefined || value === '') return false;
  return !Array.isArray(value) || value.some(hasContent);
};

const isLocaleMap = (value) => {
  if (!value || Array.isArray(value) || typeof value !== 'object') return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => key === 'fa' || key === 'en');
};

function languageFallbackNotice(requestedLanguage) {
  return requestedLanguage === 'fa'
    ? 'ترجمهٔ فارسی موجود نیست؛ متن اصلی انگلیسی نمایش داده شده است.'
    : 'English translation is unavailable; showing the Persian source.';
}

function wrapLanguageFallback(value, sourceLanguage, requestedLanguage, sourceLabels, depth) {
  const direction = sourceLanguage === 'fa' ? 'rtl' : 'ltr';
  return `<div class="rounded-lg bg-muted/50 p-3">
    <p class="mb-2 text-xs text-muted-foreground">${escapeHtml(languageFallbackNotice(requestedLanguage))}</p>
    <div lang="${sourceLanguage}" dir="${direction}" class="leading-relaxed">${renderSourceValue(value, sourceLanguage, sourceLabels, depth + 1)}</div>
  </div>`;
}

function labelFor(key, language, sourceLabels) {
  return sourceLabels[key]?.[language === 'fa' ? 0 : 1] || key.replace(/([a-z])([A-Z])/g, '$1 $2');
}

export function renderSourceValue(value, language, sourceLabels = {}, depth = 0) {
  if (!hasContent(value)) return '';
  if (typeof value !== 'object') return `<span>${escapeHtml(value)}</span>`;

  if (Array.isArray(value)) {
    return `<ul class="space-y-2 ps-5 list-disc">${value.map((item) => `<li class="leading-relaxed">${renderSourceValue(item, language, sourceLabels, depth + 1)}</li>`).join('')}</ul>`;
  }

  if (isLocaleMap(value)) {
    const selected = value[language];
    if (hasContent(selected)) return renderSourceValue(selected, language, sourceLabels, depth + 1);

    const fallbackLanguage = language === 'fa' ? 'en' : 'fa';
    const fallback = value[fallbackLanguage];
    return hasContent(fallback)
      ? wrapLanguageFallback(fallback, fallbackLanguage, language, sourceLabels, depth)
      : '';
  }

  const languageSuffix = language === 'fa' ? 'Fa' : 'En';
  const otherSuffix = language === 'fa' ? 'En' : 'Fa';
  const entries = Object.entries(value).map(([key, item]) => {
    const suffix = key.match(/^(.+?)(Fa|En)$/);
    if (suffix) {
      const [, baseKey, keyLanguage] = suffix;
      const counterpart = `${baseKey}${keyLanguage === 'Fa' ? 'En' : 'Fa'}`;
      const hasCounterpart = Object.hasOwn(value, counterpart);
      if (hasCounterpart && keyLanguage !== languageSuffix) return '';

      const displayKey = hasCounterpart ? baseKey : key.slice(0, -2);
      const body = hasCounterpart && !hasContent(item) && hasContent(value[counterpart])
        ? wrapLanguageFallback(value[counterpart], otherSuffix === 'Fa' ? 'fa' : 'en', language, sourceLabels, depth + 1)
        : !hasCounterpart && keyLanguage !== languageSuffix
          ? wrapLanguageFallback(item, keyLanguage === 'Fa' ? 'fa' : 'en', language, sourceLabels, depth + 1)
          : renderSourceValue(item, language, sourceLabels, depth + 1);
      if (!body) return '';
      return `<div class="rounded-xl border border-border/60 bg-card/50 p-3 leading-relaxed"><dt class="font-semibold text-foreground mb-1">${escapeHtml(labelFor(displayKey, language, sourceLabels))}</dt><dd class="text-foreground/85">${body}</dd></div>`;
    }

    const body = renderSourceValue(item, language, sourceLabels, depth + 1);
    if (!body) return '';
    return `<div class="rounded-xl border border-border/60 bg-card/50 p-3 leading-relaxed"><dt class="font-semibold text-foreground mb-1">${escapeHtml(labelFor(key, language, sourceLabels))}</dt><dd class="text-foreground/85">${body}</dd></div>`;
  });

  return `<dl class="space-y-2">${entries.join('')}</dl>`;
}
