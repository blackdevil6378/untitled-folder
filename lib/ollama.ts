// Utility functions for Local LLM (Ollama) integration with automatic fallback

export const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
export const DEFAULT_OLLAMA_MODEL = "qwen3.5:2b";

export interface OllamaModelInfo {
  name: string;
  size: number;
  modified_at: string;
}

/**
 * Check if local Ollama daemon is reachable
 */
export async function checkOllamaAvailable(
  baseUrl: string = DEFAULT_OLLAMA_URL,
  timeoutMs: number = 2500
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch installed models from local Ollama
 */
export async function getOllamaModels(
  baseUrl: string = DEFAULT_OLLAMA_URL
): Promise<string[]> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data.models)) return [];
    const names = data.models
      .map((m: any) => m.name || m.model)
      .filter(Boolean) as string[];
    // Remove duplicates
    return Array.from(new Set(names));
  } catch {
    return [];
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
  const baseUrl = params.baseUrl || DEFAULT_OLLAMA_URL;
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
  const baseUrl = params.baseUrl || DEFAULT_OLLAMA_URL;
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
