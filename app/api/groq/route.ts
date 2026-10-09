import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const groqKey =
      req.headers.get("x-groq-key") || process.env.GROQ_API_KEY || "";
    const aiProvider = req.headers.get("x-ai-provider") || "auto";

    if (!groqKey.trim()) {
      return NextResponse.json(
        {
          error: "Groq API key is missing. Please add your Groq key in Settings.",
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      action = "generate",
      model = "llama3-8b-8192",
      contents = [],
      systemInstruction,
    } = body;

    // Convert Gemini payload to OpenAI/Groq style
    const messages = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    contents.forEach((c: any) => {
      messages.push({
        role: c.role === "model" ? "assistant" : "user",
        content: c.parts?.[0]?.text || "",
      });
    });

    if (action === "test") {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: "Hello! Reply with 'OK'." }],
            max_tokens: 10,
          }),
        });

        if (res.ok) {
          return NextResponse.json({
            success: true,
            provider: "groq",
            message: "Groq API Key is valid and active!",
          });
        }

        const errorData = await res.json().catch(() => ({}));
        const message = errorData?.error?.message || `Groq API rejected key (Status: ${res.status})`;
        return NextResponse.json({ error: message }, { status: res.status });
      } catch (err: any) {
        return NextResponse.json(
          { error: err?.message || "Groq connection failed" },
          { status: 500 }
        );
      }
    }

    if (action === "chat_stream") {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.7,
            stream: true,
          }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          const errMsg = errJson?.error?.message || `Groq status ${res.status}`;
          return NextResponse.json({ error: errMsg }, { status: res.status });
        }

        // We need to convert Groq (OpenAI style SSE) back to Gemini style SSE for the frontend parser
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const readable = new ReadableStream({
          async start(controller) {
            const reader = res.body?.getReader();
            if (!reader) {
              controller.close();
              return;
            }

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");
                
                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    const jsonStr = line.replace("data: ", "").trim();
                    if (jsonStr === "[DONE]") {
                      // Optionally send a [DONE] in Gemini style, though our frontend ignores it
                      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                      continue;
                    }
                    try {
                      const parsed = JSON.parse(jsonStr);
                      const deltaContent = parsed.choices?.[0]?.delta?.content || "";
                      
                      // Convert to Gemini format so frontend `app/ai-mentor/page.tsx` parses it seamlessly
                      const geminiFormat = {
                        candidates: [
                          {
                            content: {
                              parts: [{ text: deltaContent }]
                            }
                          }
                        ]
                      };
                      
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify(geminiFormat)}\n\n`)
                      );
                    } catch (e) {
                      // ignore parse errors for partial chunks
                    }
                  }
                }
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
            "X-AI-Provider": "groq",
          },
        });
      } catch (streamErr: any) {
        return NextResponse.json(
          { error: streamErr?.message || "Groq streaming failed" },
          { status: 500 }
        );
      }
    }

    if (action === "generate") {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.7,
          }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          const errMsg = errJson?.error?.message || `Groq status ${res.status}`;
          return NextResponse.json({ error: errMsg }, { status: res.status });
        }

        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || "";
        return NextResponse.json({ reply, provider: "groq" });
      } catch (genErr: any) {
        return NextResponse.json(
          { error: genErr?.message || "Generation failed" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("Groq API route error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
