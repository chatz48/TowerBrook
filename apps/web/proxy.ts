import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  if (!isLocalRequestHost(host)) {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/admin/traces/:path*",
};

function isLocalRequestHost(host: string): boolean {
  const normalized = host.toLowerCase();
  if (normalized.startsWith("[::1]")) return true;
  const hostname = normalized.split(":")[0];
  return hostname === "localhost" || hostname === "127.0.0.1";
}
