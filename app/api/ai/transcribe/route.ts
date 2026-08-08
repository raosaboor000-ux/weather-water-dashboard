import { NextResponse } from "next/server";
import {
  handleHydroSenseTranscribe,
  type TranscribeRequestBody,
} from "@/lib/ai/groq-transcribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: TranscribeRequestBody = {};
  try {
    body = (await req.json()) as TranscribeRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { status, body: payload } = await handleHydroSenseTranscribe(
    body,
    process.env
  );
  return NextResponse.json(payload, { status });
}
