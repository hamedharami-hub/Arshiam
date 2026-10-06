export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

const MAX_API_BODY_BYTES = 1024 * 1024;

export class ApiRequestBodyError extends Error {
  constructor(
    readonly statusCode: 400 | 413,
    readonly code: "INVALID_JSON" | "PAYLOAD_TOO_LARGE",
    message: string,
  ) {
    super(message);
    this.name = "ApiRequestBodyError";
  }
}

/** Convert a bounded JSON-body parse failure into a safe client response. */
export function sendRequestBodyError(res: any, error: unknown): boolean {
  if (!(error instanceof ApiRequestBodyError)) return false;
  sendError(res, error.statusCode, error.code, error.message);
  return true;
}

export function handleCors(req: any, res: any): boolean {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key, X-Idempotency-Key");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}

export function sendJson(res: any, statusCode: number, data: any): void {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key, X-Idempotency-Key");
  res.end(JSON.stringify(data));
}

export function sendError(
  res: any,
  statusCode: number,
  code: string,
  message: string,
  details?: any
): void {
  sendJson(res, statusCode, {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  });
}

export async function parseBody<T = any>(req: any): Promise<T> {
  const contentLength = Number(req.headers?.["content-length"]);
  if (Number.isFinite(contentLength) && contentLength > MAX_API_BODY_BYTES) {
    throw new ApiRequestBodyError(413, "PAYLOAD_TOO_LARGE", "Request body exceeds the 1 MiB limit.");
  }

  const validateSize = (raw: string) => {
    if (new TextEncoder().encode(raw).byteLength > MAX_API_BODY_BYTES) {
      throw new ApiRequestBodyError(413, "PAYLOAD_TOO_LARGE", "Request body exceeds the 1 MiB limit.");
    }
  };
  const parseJson = (raw: string): T => {
    validateSize(raw);
    if (!raw.trim()) return {} as T;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new ApiRequestBodyError(400, "INVALID_JSON", "Request body must contain a JSON object.");
      }
      return parsed as T;
    } catch (error) {
      if (error instanceof ApiRequestBodyError) throw error;
      throw new ApiRequestBodyError(400, "INVALID_JSON", "Request body must contain valid JSON.");
    }
  };

  const validateParsedObject = (body: unknown): body is Record<string, unknown> => {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ApiRequestBodyError(400, "INVALID_JSON", "Request body must contain a JSON object.");
    }
    return true;
  };

  if (typeof req.body === "string") return parseJson(req.body);
  if (req.body && typeof req.body === "object") {
    validateParsedObject(req.body);
    let serialized: string;
    try {
      serialized = JSON.stringify(req.body);
    } catch {
      throw new ApiRequestBodyError(400, "INVALID_JSON", "Request body must contain valid JSON.");
    }
    validateSize(serialized);
    return req.body as T;
  }
  if (req.body !== undefined && req.body !== null) {
    throw new ApiRequestBodyError(400, "INVALID_JSON", "Request body must contain a JSON object.");
  }

  return new Promise((resolve, reject) => {
    let raw = "";
    let receivedBytes = 0;
    let settled = false;
    const decoder = new TextDecoder();
    if (typeof req.on !== "function") {
      resolve({} as T);
      return;
    }
    req.on("data", (chunk: any) => {
      if (settled) return;
      const isTextChunk = typeof chunk === "string";
      const text = isTextChunk ? chunk : decoder.decode(chunk, { stream: true });
      receivedBytes += typeof chunk?.byteLength === "number"
        ? chunk.byteLength
        : new TextEncoder().encode(text).byteLength;
      if (receivedBytes > MAX_API_BODY_BYTES) {
        settled = true;
        reject(new ApiRequestBodyError(413, "PAYLOAD_TOO_LARGE", "Request body exceeds the 1 MiB limit."));
        req.resume?.();
        return;
      }
      raw += text;
    });
    req.on("end", () => {
      if (settled) return;
      settled = true;
      try { raw += decoder.decode(); resolve(parseJson(raw)); }
      catch (error) { reject(error); }
    });
    req.on("error", (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
  });
}
