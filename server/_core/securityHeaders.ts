import type { Request, Response, NextFunction } from "express";

/**
 * Express middleware to enforce secure HTTP response headers
 * compliant with OWASP and healthcare data security standards.
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Prevent MIME-sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking / frame embedding
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // Cross-site scripting (XSS) filter
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer Policy: Send full referrer on same origin, only origin on cross-origin
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Restrict browser features and device capabilities
  res.setHeader(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=(self), payment=(), usb=()"
  );

  // Enforce HSTS (Strict-Transport-Security) in production
  if (process.env.NODE_ENV === "production" || req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  // Content Security Policy
  const isDev = process.env.NODE_ENV !== "production";
  const scriptSources = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com"
    : "'self' 'unsafe-inline' https://maps.googleapis.com";

  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src ${scriptSources}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: http:",
      "connect-src 'self' https://*.supabase.co https://maps.googleapis.com wss: ws:",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );

  next();
}
