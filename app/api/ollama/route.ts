import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_OLLAMA_URL,
  DEFAULT_OLLAMA_MODEL,
  checkOllamaAvailable,
  getOllamaModels,
  generateOllamaContent,
} from "@/lib/ollama";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") || DEFAULT_OLLAMA_URL;
  const isAvailable = await checkOllamaAvailable(url, 2000);

  if (!isAvailable) {
    return NextResponse.json({
      available: false,
      models: [],
      message: `Ollama is not running on ${url}. Please start Ollama or check URL.`,
    });
  }

  const models = await getOllamaModels(url);
  return NextResponse.json({
    available: true,
    models,
    defaultModel: models.includes("qwen3.5:2b") ? "qwen3.5:2b" : models[0] || DEFAULT_OLLAMA_MODEL,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = "test", url = DEFAULT_OLLAMA_URL, model = DEFAULT_OLLAMA_MODEL } = body;

    if (action === "test") {
      const isAvailable = await checkOllamaAvailable(url, 3000);
      if (!isAvailable) {
        return NextResponse.json(
          {
            error: `Cannot reach Ollama at ${url}. Make sure Ollama application is running.`,
          },
          { status: 503 }
        );
      }

      const models = await getOllamaModels(url);
      const chosenModel = models.includes(model) ? model : models[0] || model;

      return NextResponse.json({
        success: true,
        message: `Ollama is active! Connected to model '${chosenModel}'.`,
        models,
      });
    }

    if (action === "generate") {
      const reply = await generateOllamaContent({
        baseUrl: url,
        model,
        contents: body.contents || [{ role: "user", parts: [{ text: "Hello!" }] }],
        systemInstruction: body.systemInstruction,
      });
      return NextResponse.json({ reply, provider: "ollama" });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Ollama API error" },
      { status: 500 }
    );
  }
}
