import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecret, getSessionJwtClaims } from "@/lib/auth/sessionConfig";

const protectedRoutes = ["/dashboard", "/pegawai", "/pejabat", "/usulan", "/import-pegawai", "/import-drh", "/duk", "/qna-admin", "/profil"];
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const roleRules = {
  "/pejabat": ["SUPER_ADMIN"],
  "/import-pegawai": ["SUPER_ADMIN", "ADMIN_UKPD"],
  "/import-drh": ["SUPER_ADMIN", "ADMIN_UKPD"],
  "/qna-admin": ["SUPER_ADMIN"],
  "/usulan": ["SUPER_ADMIN", "ADMIN_WILAYAH", "ADMIN_UKPD"]
};

function getAllowedOrigins(request) {
  const origins = new Set([request.nextUrl.origin]);
  for (const value of [process.env.APP_ORIGIN, process.env.ALLOWED_ORIGINS]) {
    String(value || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
      .forEach((origin) => origins.add(origin));
  }
  return origins;
}

function getRequestOrigin(request) {
  const origin = request.headers.get("origin");
  if (origin) return origin;

  const referer = request.headers.get("referer");
  if (!referer) return "";

  try {
    return new URL(referer).origin;
  } catch {
    return "";
  }
}

function validateApiCsrf(request) {
  if (!request.nextUrl.pathname.startsWith("/api/") || safeMethods.has(request.method)) return null;

  const requestOrigin = getRequestOrigin(request);
  if (!requestOrigin && process.env.NODE_ENV !== "production") return null;
  if (getAllowedOrigins(request).has(requestOrigin)) return null;

  return NextResponse.json(
    { success: false, message: "Permintaan ditolak karena origin tidak valid.", errors: null },
    {
      status: 403,
      headers: {
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff"
      }
    }
  );
}

async function verify(token) {
  try {
    const { issuer, audience } = getSessionJwtClaims();
    const { payload } = await jwtVerify(token, getJwtSecret(), { issuer, audience });
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const csrfError = validateApiCsrf(request);
  if (csrfError) return csrfError;

  const needsAuth = protectedRoutes.some((route) => pathname.startsWith(route));
  if (!needsAuth) return NextResponse.next();

  const token = request.cookies.get("sdm_session")?.value;
  const user = await verify(token);
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const rule = Object.entries(roleRules).find(([route]) => pathname.startsWith(route));
  if (rule && !rule[1].includes(user.role)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/pegawai/:path*", "/pejabat/:path*", "/usulan/:path*", "/import-pegawai/:path*", "/import-drh/:path*", "/duk/:path*", "/qna-admin/:path*", "/profil/:path*"]
};
