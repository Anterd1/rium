import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json({
    error:
      "Apple Wallet requires a paid Apple Developer account and PassType ID certificate. Configure your certificates to enable this feature.",
    supported: false,
  });
}
