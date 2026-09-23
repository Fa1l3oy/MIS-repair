import { prisma } from "@/lib/prisma";
import { canViewRequest } from "@/lib/requests";
import { currentUser } from "@/lib/session";
import { readImage } from "@/lib/uploads";

export async function GET(req: Request, ctx: RouteContext<"/api/uploads/[filename]">) {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { filename } = await ctx.params;
  const image = await prisma.repairImage.findUnique({
    where: { filename },
    select: { mimeType: true, request: { select: { reporterId: true } } },
  });
  if (!image || !canViewRequest(user, image.request)) return new Response("Not found", { status: 404 });

  // Files never change, so the name works as an ETag. "no-cache" makes the browser
  // revalidate every time, so permissions are re-checked (e.g. after logout on a
  // shared computer) while unchanged images still come back as a cheap 304.
  const etag = `"${filename}"`;
  const headers = {
    "Cache-Control": "private, no-cache",
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
  };
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });

  const data = await readImage(filename);
  if (!data) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(data), { headers: { ...headers, "Content-Type": image.mimeType } });
}
