/**
 * Robust, fault-tolerant JSON parser and repair engine designed specifically
 * for smaller/weaker LLM models (e.g., Llama 8B, Gemma 9B, Mixtral, Qwen, etc.)
 * that might output conversational preambles, unescaped quotes, trailing commas, or markdown.
 */

export function sanitizeAndRepairJson(raw: string): string {
  if (!raw || typeof raw !== 'string') return '{}';

  let cleaned = raw.trim();

  // 0. Remove DeepSeek-R1 <think>...</think> reasoning blocks completely
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 1. Remove Markdown code fence wrappers (```json ... ``` or ``` ...)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');

  // 2. Find the outermost JSON boundary: first '{' or '[' to last '}' or ']'
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;

  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  if (startIdx !== -1) {
    const isObject = cleaned[startIdx] === '{';
    const lastMatchingEnd = isObject ? cleaned.lastIndexOf('}') : cleaned.lastIndexOf(']');
    if (lastMatchingEnd !== -1 && lastMatchingEnd > startIdx) {
      cleaned = cleaned.slice(startIdx, lastMatchingEnd + 1);
    } else {
      cleaned = cleaned.slice(startIdx);
    }
  }

  // 3. Remove single-line JS comments (// ...) and multi-line comments (/* ... */)
  cleaned = cleaned.replace(/\/\/.*$/gm, '');
  cleaned = cleaned.replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '');

  // 4. Remove trailing commas in objects and arrays: , } -> } and , ] -> ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  // 5. If JSON was truncated at the end, attempt to auto-close brackets/braces
  cleaned = autoCloseJson(cleaned);

  return cleaned;
}

/**
 * Automatically balances and closes unclosed braces and brackets in case the model's output was cut off
 */
function autoCloseJson(str: string): string {
  const stack: string[] = [];
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (char === '\\' && inString) {
      isEscaped = !isEscaped;
      continue;
    }

    if (char === '"' && !isEscaped) {
      inString = !inString;
    }

    if (!inString) {
      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}') {
        if (stack.length > 0 && stack[stack.length - 1] === '{') {
          stack.pop();
        }
      } else if (char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === '[') {
          stack.pop();
        }
      }
    }

    isEscaped = false;
  }

  // If we ended while inside an unclosed string, close the quote
  let closed = str;
  if (inString) {
    closed += '"';
  }

  // Close remaining open brackets and braces in reverse order
  while (stack.length > 0) {
    const open = stack.pop();
    if (open === '{') {
      closed += '}';
    } else if (open === '[') {
      closed += ']';
    }
  }

  // Remove any newly created trailing comma before closing
  closed = closed.replace(/,\s*([}\]])/g, '$1');

  return closed;
}

/**
 * Primary resilient JSON parsing function with multiple progressive fallback recovery strategies
 */
export function robustJsonParse<T = any>(rawText: string, fallbackValue?: T): T {
  if (!rawText || typeof rawText !== 'string') {
    if (fallbackValue !== undefined) return fallbackValue;
    throw new Error('Empty AI response received');
  }

  // Attempt 1: Direct parse
  try {
    return JSON.parse(rawText.trim());
  } catch {}

  // Attempt 2: Sanitize and repair
  const repaired = sanitizeAndRepairJson(rawText);
  try {
    return JSON.parse(repaired);
  } catch {}

  // Attempt 3: Fix unescaped control characters & raw newlines within strings
  try {
    const sanitizedControl = repaired.replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => {
      if (c === '\n') return '\\n';
      if (c === '\r') return '\\r';
      if (c === '\t') return '\\t';
      return '';
    });
    return JSON.parse(sanitizedControl);
  } catch {}

  // Attempt 4: If text contains "cards": [ ... ], extract the array directly
  try {
    const cardsIndex = rawText.indexOf('"cards"');
    if (cardsIndex !== -1) {
      const arrayStart = rawText.indexOf('[', cardsIndex);
      const arrayEnd = rawText.lastIndexOf(']');
      if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
        const arrayStr = rawText.slice(arrayStart, arrayEnd + 1);
        const parsedArray = JSON.parse(sanitizeAndRepairJson(arrayStr));
        return { cards: parsedArray } as unknown as T;
      }
    }
  } catch {}

  // Attempt 5: Regex extraction of individual flashcard objects
  try {
    const objectMatches = rawText.match(/\{[^{}]*"question"[^{}]*"answer"[^{}]*\}/g);
    if (objectMatches && objectMatches.length > 0) {
      const recoveredCards = objectMatches
        .map((objStr) => {
          try {
            return JSON.parse(sanitizeAndRepairJson(objStr));
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      if (recoveredCards.length > 0) {
        return { cards: recoveredCards } as unknown as T;
      }
    }
  } catch {}

  if (fallbackValue !== undefined) {
    return fallbackValue;
  }

  throw new Error(`Failed to parse AI output into valid JSON. Raw output:\n${rawText.slice(0, 300)}...`);
}
