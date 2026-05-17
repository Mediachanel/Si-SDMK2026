function isProduction() {
  return process.env.NODE_ENV === "production";
}

function trustProxyHeaders() {
  return process.env.TRUST_PROXY_HEADERS === "true" || !isProduction();
}

export function getClientIp(request) {
  if (trustProxyHeaders()) {
    return (
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown"
    );
  }

  return request.ip || "direct";
}
