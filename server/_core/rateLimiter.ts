import type { Request, Response, NextFunction } from "express";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

const stores = new Map<string, Map<string, RateLimitRecord>>();

export function createRateLimiter(options: RateLimiterOptions) {
  const storeId = `limiter_${Math.random().toString(36).substring(2, 9)}`;
  const store = new Map<string, RateLimitRecord>();
  stores.set(storeId, store);

  const windowMs = options.windowMs;
  const maxRequests = options.maxRequests;
  const message = options.message || "Too many requests. Please slow down and try again later.";
  const keyGen =
    options.keyGenerator ||
    ((req: Request) => {
      const forwarded = req.headers["x-forwarded-for"];
      const ip = (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : req.socket.remoteAddress) || "127.0.0.1";
      return ip;
    });

  // Periodic cleanup every 5 minutes to prevent memory leak
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    store.forEach((record, key) => {
      if (record.resetTime <= now) {
        store.delete(key);
      }
    });
  }, 5 * 60 * 1000);
  if (cleanupInterval.unref) cleanupInterval.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    // Exclude static assets or internal debug in dev mode
    if (req.path.startsWith("/assets/") || req.path.startsWith("/@") || req.path.startsWith("/__manus__/")) {
      return next();
    }

    const key = keyGen(req);
    const now = Date.now();
    let record = store.get(key);

    if (!record || record.resetTime <= now) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      store.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    const resetSec = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetSec);

    if (record.count > maxRequests) {
      res.setHeader("Retry-After", resetSec);
      res.status(429).json({
        error: "TOO_MANY_REQUESTS",
        message,
        retryAfterSeconds: resetSec,
      });
      return;
    }

    next();
  };
}

/** Standard API rate limiter (e.g. 300 requests per 1 minute per IP) */
export const generalApiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 300,
  message: "Too many API requests from this client. Please retry in a moment.",
});

/** Sensitive endpoints rate limiter (e.g. Auth callbacks / AI chat / Offline sync batch) */
export const sensitiveEndpointLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  message: "Rate limit reached for sensitive operations. Please wait a moment.",
});
