import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_OLLAMA_URL,
  DEFAULT_OLLAMA_MODEL,
  checkOllamaAvailable,
  generateOllamaContent,
  streamOllamaChatAsGeminiSSE,
} from "@/lib/ollama";

export async function POST(req: NextRequest) {
  try {
    const geminiKey =
      req.headers.get("x-gemini-key") || process.env.GEMINI_API_KEY || "";
    const ollamaUrl =
      req.headers.get("x-ollama-url") ||
      process.env.OLLAMA_BASE_URL ||
      DEFAULT_OLLAMA_URL;
    const ollamaModel =
      req.headers.get("x-ollama-model") ||
      process.env.OLLAMA_MODEL ||
      DEFAULT_OLLAMA_MODEL;
    const aiProvider =
      req.headers.get("x-ai-provider") || "auto"; // "auto" | "gemini" | "ollama"

    const body = await req.json().catch(() => ({}));
    let {
      action = "generate",
      model = "gemini-3.8-flash",
      contents = [],
      systemInstruction,
    } = body;

    // Auto-remap deprecated models
    if (!model || model === "gemini-2.0-flash") {
      model = "gemini-3.8-flash";
    }

    // Helper: Execute Ollama fallback
    const runOllamaFallback = async (triggerReason?: string) => {
      const isOllamaUp = await checkOllamaAvailable(ollamaUrl, 2500);
      if (!isOllamaUp) {
        return null;
      }

      console.log(
        `[LLM Route] Using Ollama fallback (${ollamaModel}) at ${ollamaUrl}. Reason: ${triggerReason || "default"}`
      );

      if (action === "chat_stream") {
        return await streamOllamaChatAsGeminiSSE({
          baseUrl: ollamaUrl,
          model: ollamaModel,
          contents,
          systemInstruction,
        });
      }

      if (action === "generate") {
        const reply = await generateOllamaContent({
          baseUrl: ollamaUrl,
          model: ollamaModel,
          contents,
          systemInstruction,
        });
        return NextResponse.json({
          reply,
          provider: "ollama",
          model: ollamaModel,
          note: triggerReason ? `Generated via local Ollama (${ollamaModel})` : undefined,
        });
      }

      if (action === "test") {
        return NextResponse.json({
          success: true,
          provider: "ollama",
          message: `Local Ollama (${ollamaModel}) is active and ready as your AI backup!`,
        });
      }

      return null;
    };

    // Mode 1: User explicitly requested Local Ollama
    if (aiProvider === "ollama") {
      const ollamaRes = await runOllamaFallback("User preferred Ollama");
      if (ollamaRes) return ollamaRes;

      return NextResponse.json(
        {
          error: `Ollama is not reachable at ${ollamaUrl}. Please make sure Ollama is running.`,
        },
        { status: 503 }
      );
    }

    // Mode 2: No Gemini API Key provided
    if (!geminiKey.trim()) {
      if (aiProvider === "auto") {
        const ollamaRes = await runOllamaFallback("No Gemini API key provided");
        if (ollamaRes) return ollamaRes;
      }

      return NextResponse.json(
        {
          error:
            "Gemini API key is missing, and local Ollama is not running. Please add your Gemini key in Settings or start Ollama.",
        },
        { status: 401 }
      );
    }

    // Mode 3: Test Key
    if (action === "test") {
      try {
        const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const res = await fetch(testUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Hello! Reply with 'OK'." }] }],
          }),
        });

        if (res.ok) {
          return NextResponse.json({
            success: true,
            provider: "gemini",
            message: "Gemini API Key is valid and active!",
          });
        }

        // If Gemini test fails and auto mode is enabled, test if Ollama can be backup
        if (aiProvider === "auto") {
          const fallbackRes = await runOllamaFallback("Gemini key test rejected");
          if (fallbackRes) {
            return NextResponse.json({
              success: true,
              provider: "ollama_fallback",
              message:
                "Gemini key failed, but Local Ollama is connected & will automatically handle your study requests!",
            });
          }
        }

        const errorData = await res.json().catch(() => ({}));
        const message =
          errorData?.error?.message ||
          `Gemini API rejected key (Status: ${res.status})`;
        return NextResponse.json({ error: message }, { status: res.status });
      } catch (err: any) {
        if (aiProvider === "auto") {
          const fallbackRes = await runOllamaFallback("Gemini test network failure");
          if (fallbackRes) return fallbackRes;
        }
        return NextResponse.json(
          { error: err?.message || "Gemini connection failed" },
          { status: 500 }
        );
      }
    }

    // Mode 4: Chat Stream via Server-Sent Events (SSE)
    if (action === "chat_stream") {
      try {
        const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${geminiKey}`;

        const payload: any = {
          contents: contents || [],
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        };

        if (systemInstruction) {
          payload.systemInstruction = {
            parts: [{ text: systemInstruction }],
          };
        }

        const geminiRes = await fetch(streamUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!geminiRes.ok) {
          const errJson = await geminiRes.json().catch(() => ({}));
          const errMsg = errJson?.error?.message || `Gemini status ${geminiRes.status}`;

          // Try Ollama fallback on Gemini failure (400, 429 quota, 500, etc.)
          if (aiProvider === "auto") {
            const fallbackRes = await runOllamaFallback(`Gemini error: ${errMsg}`);
            if (fallbackRes) return fallbackRes;
          }

          let clientErrMsg = errMsg;
          if (geminiRes.status === 400 && errMsg.includes("API key not valid")) {
            clientErrMsg = "Invalid Gemini API key. Please check your key in Settings.";
          } else if (geminiRes.status === 429) {
            clientErrMsg = "Gemini API rate limit exceeded. Please wait a few moments or use Ollama.";
          }
          return NextResponse.json({ error: clientErrMsg }, { status: geminiRes.status });
        }

        // Stream the response back to client using TransformStream
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const readable = new ReadableStream({
          async start(controller) {
            const reader = geminiRes.body?.getReader();
            if (!reader) {
              controller.close();
              return;
            }

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                controller.enqueue(encoder.encode(chunk));
              }
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
            "X-AI-Provider": "gemini",
          },
        });
      } catch (streamErr: any) {
        // Network error contacting Gemini
        if (aiProvider === "auto") {
          const fallbackRes = await runOllamaFallback("Gemini network error");
          if (fallbackRes) return fallbackRes;
        }
        return NextResponse.json(
          { error: streamErr?.message || "Gemini streaming failed" },
          { status: 500 }
        );
      }
    }

    // Mode 5: Non-streaming generate content
    if (action === "generate") {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const payload: any = {
          contents: contents || [],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        };

        if (systemInstruction) {
          payload.systemInstruction = {
            parts: [{ text: systemInstruction }],
          };
        }

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          const errMsg = errJson?.error?.message || `Gemini status ${res.status}`;

          if (aiProvider === "auto") {
            const fallbackRes = await runOllamaFallback(`Gemini error: ${errMsg}`);
            if (fallbackRes) return fallbackRes;
          }

          return NextResponse.json({ error: errMsg }, { status: res.status });
        }

        const data = await res.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return NextResponse.json({ reply, provider: "gemini" });
      } catch (genErr: any) {
        if (aiProvider === "auto") {
          const fallbackRes = await runOllamaFallback("Gemini network failure");
          if (fallbackRes) return fallbackRes;
        }
        return NextResponse.json(
          { error: genErr?.message || "Generation failed" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("LLM API route error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
