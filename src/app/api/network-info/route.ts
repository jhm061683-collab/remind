import { networkInterfaces } from "os";
import { NextResponse } from "next/server";

export async function GET() {
  const urls: string[] = [];

  for (const entries of Object.values(networkInterfaces())) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      urls.push(`http://${entry.address}:3000`);
    }
  }

  return NextResponse.json({ urls });
}
