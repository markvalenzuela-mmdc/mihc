import { getCurrentUser } from "@/feature/auth/actions/auth.action";
import { createSmokeRunEventStream } from "@/feature/smoke/services/smoke-run-events.service";
import { err } from "@/utils/server-action-return";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json(err("Unauthorized"), { status: 401 });
  }

  return new Response(createSmokeRunEventStream(request.signal), {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
