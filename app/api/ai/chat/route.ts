import { NextResponse } from "next/server";
import {
  handleHydroSenseChat,
  type ChatRequestBody,
} from "@/lib/ai/groq-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: ChatRequestBody = {};
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { status, body: payload } = await handleHydroSenseChat(body, process.env);
  return NextResponse.json(payload, { status });
}
