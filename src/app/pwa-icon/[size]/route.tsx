import { ImageResponse } from "next/og";
import { AppIconMark } from "@/lib/brand/app-icon";

export const runtime = "edge";

const ALLOWED = new Set([192, 512]);

type Params = { params: Promise<{ size: string }> };

export async function GET(_req: Request, { params }: Params) {
  const size = Number((await params).size);
  if (!ALLOWED.has(size)) {
    return new Response("Not found", { status: 404 });
  }

  return new ImageResponse(<AppIconMark size={size} />, {
    width: size,
    height: size,
  });
}
