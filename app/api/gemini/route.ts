import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const geminiKey =
      req.headers.get("x-gemini-key") || process.env.GEMINI_API_KEY || "";

    if (!geminiKey.trim()) {
      return NextResponse.json(
        {
          error:
            "Gemini API key is missing. Please add your key in the Settings page.",
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    let { action, model = "gemini-3.8-flash", contents, systemInstruction } = body;

    // Auto-remap deprecated models
    if (!model || model === "gemini-2.0-flash") {
      model = "gemini-3.8-flash";
    }

    // Action 1: Test Key
    if (action === "test") {
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const res = await fetch(testUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hello! Reply with 'OK'." }] }],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message =
          errorData?.error?.message ||
          `Gemini API rejected key (Status: ${res.status})`;
        return NextResponse.json({ error: message }, { status: res.status });
      }

      return NextResponse.json({
        success: true,
        message: "Gemini API Key is valid and active!",
      });
    }

    // Action 2: Chat Stream via Server-Sent Events (SSE)
    if (action === "chat_stream") {
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
        let errMsg = errJson?.error?.message || `Gemini API returned status ${geminiRes.status}`;
        if (geminiRes.status === 400 && errMsg.includes("API key not valid")) {
          errMsg = "Invalid Gemini API key. Please check your key in Settings.";
        } else if (geminiRes.status === 429) {
          errMsg = "Gemini API rate limit exceeded. Please wait a few moments or try again.";
        }
        return NextResponse.json({ error: errMsg }, { status: geminiRes.status });
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
        },
      });
    }

    // Action 3: Non-streaming generate content
    if (action === "generate") {
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
        return NextResponse.json(
          { error: errJson?.error?.message || "Gemini generation failed" },
          { status: res.status }
        );
      }

      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return NextResponse.json({ reply });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("Gemini API route error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
