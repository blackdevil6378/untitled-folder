// Utility functions for Local LLM (Ollama) integration with automatic fallback

export const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
export const DEFAULT_OLLAMA_MODEL = "qwen3.5:2b";

export interface OllamaModelInfo {
  name: string;
  size: number;
  modified_at: string;
}

/**
 * Normalizes host URL by adding protocol and stripping trailing slashes
 */
export function normalizeOllamaUrl(rawUrl?: string): string {
  if (!rawUrl || !rawUrl.trim()) return DEFAULT_OLLAMA_URL;
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }
  return url.replace(/\/+$/, "");
}

/**
 * Check if local Ollama daemon is reachable.
 * Tries both 127.0.0.1 and localhost for bulletproof Windows compatibility.
 */
export async function checkOllamaAvailable(
  baseUrl: string = DEFAULT_OLLAMA_URL,
  timeoutMs: number = 5000
): Promise<{ available: boolean; error?: string; workingUrl: string }> {
  const normalized = normalizeOllamaUrl(baseUrl);
  const candidates = [normalized];

  if (normalized.includes("localhost")) {
    candidates.push(normalized.replace("localhost", "127.0.0.1"));
  } else if (normalized.includes("127.0.0.1")) {
    candidates.push(normalized.replace("127.0.0.1", "localhost"));
  }

  let lastError = "";

  for (const target of candidates) {
    try {
      const res = await fetch(`${target}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) {
        return { available: true, workingUrl: target };
      }
      lastError = `Server returned HTTP ${res.status}`;
    } catch (err: any) {
      lastError = err?.message || "Connection refused";
    }
  }

  return { available: false, error: lastError, workingUrl: normalized };
}

/**
 * Fetch installed models from local Ollama
 */
export async function getOllamaModels(
  baseUrl: string = DEFAULT_OLLAMA_URL
): Promise<{ models: string[]; workingUrl: string }> {
  const check = await checkOllamaAvailable(baseUrl, 5000);
  if (!check.available) {
    return { models: [], workingUrl: check.workingUrl };
  }

  try {
    const res = await fetch(`${check.workingUrl}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { models: [], workingUrl: check.workingUrl };
    const data = await res.json();
    if (!Array.isArray(data.models)) return { models: [], workingUrl: check.workingUrl };

    const names = data.models
      .map((m: any) => m.name || m.model)
      .filter((n: string) => n && !n.startsWith("llamacpp:")); // Filter internal hashes

    return {
      models: Array.from(new Set(names)),
      workingUrl: check.workingUrl,
    };
  } catch {
    return { models: [], workingUrl: check.workingUrl };
  }
}

/**
 * Convert Gemini-style contents payload to Ollama messages array
 */
export function convertGeminiToOllamaMessages(
  contents: Array<{ role: string; parts: Array<{ text: string }> }>,
  systemInstruction?: string
) {
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

  if (systemInstruction?.trim()) {
    messages.push({
      role: "system",
      content: systemInstruction.trim(),
    });
  }

  for (const c of contents || []) {
    const role = c.role === "model" ? "assistant" : "user";
    const text = c.parts?.map((p) => p.text).join("\n") || "";
    if (text) {
      messages.push({ role, content: text });
    }
  }

  return messages;
}

/**
 * Non-streaming chat generation using Ollama
 */
export async function generateOllamaContent(params: {
  baseUrl?: string;
  model?: string;
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  systemInstruction?: string;
  timeoutMs?: number;
}): Promise<string> {
  const targetCheck = await checkOllamaAvailable(params.baseUrl || DEFAULT_OLLAMA_URL, 5000);
  const baseUrl = targetCheck.workingUrl;
  const model = params.model || DEFAULT_OLLAMA_MODEL;
  const messages = convertGeminiToOllamaMessages(params.contents, params.systemInstruction);

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature: 0.7,
      },
    }),
    signal: AbortSignal.timeout(params.timeoutMs || 45000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Ollama generation failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data?.message?.content || "";
}

/**
 * Streaming chat with Ollama, converted to Gemini SSE chunks
 * for seamless frontend compatibility with AI Mentor.
 */
export async function streamOllamaChatAsGeminiSSE(params: {
  baseUrl?: string;
  model?: string;
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  systemInstruction?: string;
}): Promise<Response> {
  const targetCheck = await checkOllamaAvailable(params.baseUrl || DEFAULT_OLLAMA_URL, 5000);
  const baseUrl = targetCheck.workingUrl;
  const model = params.model || DEFAULT_OLLAMA_MODEL;
  const messages = convertGeminiToOllamaMessages(params.contents, params.systemInstruction);

  const ollamaRes = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      options: {
        temperature: 0.7,
      },
    }),
  });

  if (!ollamaRes.ok) {
    const errText = await ollamaRes.text().catch(() => "");
    throw new Error(`Ollama returned error ${ollamaRes.status}: ${errText}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = ollamaRes.body?.getReader();

  if (!reader) {
    throw new Error("Unable to read Ollama response stream.");
  }

  const readable = new ReadableStream({
    async start(controller) {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep unparsed trailing chunk

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            try {
              const parsed = JSON.parse(trimmed);
              const content = parsed.message?.content || "";

              if (content) {
                // Format matching Gemini SSE chunk
                const ssePayload = {
                  candidates: [
                    {
                      content: {
                        parts: [{ text: content }],
                        role: "model",
                      },
                    },
                  ],
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(ssePayload)}\n\n`)
                );
              }

              if (parsed.done) {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              }
            } catch {
              // Ignore partial json parse error and continue
            }
          }
        }

        // Process leftover buffer if any
        if (buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer.trim());
            const content = parsed.message?.content || "";
            if (content) {
              const ssePayload = {
                candidates: [
                  {
                    content: {
                      parts: [{ text: content }],
                      role: "model",
                    },
                  },
                ],
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(ssePayload)}\n\n`)
              );
            }
          } catch {
            // ignore
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err: any) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-AI-Provider": "ollama",
      "X-AI-Model": model,
    },
  });
}
