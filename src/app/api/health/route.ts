import { getHealthPayload } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getHealthPayload(), {
    headers: { "Cache-Control": "no-store" },
  });
}
