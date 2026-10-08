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
  const check = await checkOllamaAvailable(url, 4000);

  if (!check.available) {
    return NextResponse.json({
      available: false,
      models: [],
      error: check.error,
      message: `Ollama is not running on ${check.workingUrl}. Please make sure Ollama is running.`,
    });
  }

  const { models, workingUrl } = await getOllamaModels(check.workingUrl);
  return NextResponse.json({
    available: true,
    models,
    workingUrl,
    defaultModel: models.includes("qwen3.5:2b") ? "qwen3.5:2b" : models[0] || DEFAULT_OLLAMA_MODEL,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action = "test", url = DEFAULT_OLLAMA_URL, model = DEFAULT_OLLAMA_MODEL } = body;

    if (action === "test") {
      const check = await checkOllamaAvailable(url, 5000);
      if (!check.available) {
        return NextResponse.json(
          {
            error: `Cannot reach Ollama at ${check.workingUrl} (${check.error || "Connection refused"}). Make sure the Ollama application is running.`,
          },
          { status: 503 }
        );
      }

      const { models, workingUrl } = await getOllamaModels(check.workingUrl);
      const chosenModel = models.includes(model) ? model : models[0] || model;

      return NextResponse.json({
        success: true,
        message: `Ollama is active! Connected to model '${chosenModel}'.`,
        models,
        workingUrl,
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
