import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { securityHeadersMiddleware } from "./securityHeaders";
import { generalApiLimiter, sensitiveEndpointLimiter } from "./rateLimiter";

/**
 * Strict CORS middleware configuring allowed origins and headers
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];

  if (process.env.APP_URL) {
    allowedOrigins.push(process.env.APP_URL.replace(/\/+$/, ""));
  }

  // If origin matches allowed origin, *.vercel.app, or same-origin/no-origin (direct server requests)
  if (
    !origin ||
    allowedOrigins.includes(origin) ||
    origin.endsWith(".vercel.app") ||
    process.env.NODE_ENV === "development"
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-trpc-source, apikey, Prefer"
    );
  }

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
}

/**
 * Creates and configures the Express application with all middlewares and API routes
 */
export function createApp() {
  const app = express();

  // 1. Security Headers
  app.use(securityHeadersMiddleware);

  // 2. Strict CORS
  app.use(corsMiddleware);

  // 3. Body parser with strict size limits
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // 4. Rate Limiting
  app.use("/api/oauth", sensitiveEndpointLimiter);
  app.use("/api", generalApiLimiter);

  // 5. App Routes
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // 6. tRPC API (supports both /api/trpc and /trpc rewrites)
  const trpcMiddleware = createExpressMiddleware({
    router: appRouter,
    createContext,
  });
  app.use("/api/trpc", trpcMiddleware);
  app.use("/trpc", trpcMiddleware);

  // 7. Global Error Handler for Express
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[Server Error]", err);
    res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message:
        process.env.NODE_ENV === "production"
          ? "An unexpected error occurred."
          : String(err?.message || err),
    });
  });

  return app;
}
