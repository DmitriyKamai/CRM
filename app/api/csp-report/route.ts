import { NextResponse } from "next/server";

// Endpoint for CSP violations (CSP Report-Only).
export async function POST(request: Request) {
  try {
    // CSP reports can come in different shapes/content-types depending on browser.
    // We accept text and attempt JSON parsing, then normalize field names.
    const text = await request.text();
    if (!text) return new NextResponse(null, { status: 204 });

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Not JSON; still log something to help debugging.
      console.warn("[csp-report] non-json payload", { size: text.length });
      return new NextResponse(null, { status: 204 });
    }

    const obj =
      (Array.isArray(parsed) ? parsed[0] : parsed) as
        | Record<string, unknown>
        | undefined;

    const recObj = obj as Record<string, unknown> | undefined;
    const arrFirst =
      Array.isArray(parsed) && parsed.length > 0
        ? (parsed[0] as Record<string, unknown>)
        : undefined;

    const report =
      recObj?.["csp-report"] ??
      recObj?.["cspReport"] ??
      arrFirst?.["csp-report"] ??
      arrFirst?.["cspReport"] ??
      recObj;

    const r = report as Record<string, unknown> | undefined;

    const summary = {
      violatedDirective:
        r?.["violated-directive"] ?? r?.["violatedDirective"],
      effectiveDirective:
        r?.["effective-directive"] ?? r?.["effectiveDirective"],
      blockedURL: r?.["blocked-uri"] ?? r?.["blockedURI"] ?? r?.["blockedURL"],
      documentURI: r?.["document-uri"] ?? r?.["documentURI"],
      statusCode: r?.["status-code"] ?? r?.["statusCode"],
      disposition: r?.disposition
    };

    console.warn("[csp-report]", summary);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.warn("[csp-report] failed to parse", err);
    return new NextResponse(null, { status: 400 });
  }
}

