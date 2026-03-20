import { NextResponse } from "next/server";

// Endpoint for CSP violations (CSP Report-Only).
// Receives JSON payloads from browsers and logs a minimal summary.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const report =
      body?.cspReport ??
      body?.[0]?.cspReport ??
      body?.[0] ??
      body;

    // Keep logs minimal and avoid dumping full payloads.
    const summary = {
      violatedDirective: report?.violatedDirective,
      effectiveDirective: report?.effectiveDirective,
      blockedURL: report?.blockedURI ?? report?.blockedURL,
      documentURI: report?.documentURI,
      statusCode: report?.statusCode,
      disposition: report?.disposition
    };

    console.warn("[csp-report]", summary);
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 400 });
  }
}

