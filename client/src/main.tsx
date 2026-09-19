import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getSupabaseAccessToken } from "./lib/supabase";
import "./index.css";

const queryClient = new QueryClient();

const getAppRoot = () => {
  if (typeof window === "undefined") return "/";
  const pathname = window.location.pathname.toLowerCase();
  if (pathname.startsWith("/arjuna")) {
    return "/Arjuna/";
  }
  return "/";
};

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;

  const path = window.location.pathname.toLowerCase();
  if (
    path === "/" ||
    path === "/arjuna" ||
    path === "/arjuna/" ||
    path.endsWith("/login") ||
    path.includes("/profile") ||
    path.includes("/change-password") ||
    path.includes("/facilities") ||
    path.includes("/map") ||
    path.includes("/pending-approval") ||
    path.includes("/registration-rejected") ||
    path.includes("/account-suspended") ||
    path.includes("/forgot-password") ||
    path.includes("/reset-password")
  ) {
    return;
  }

  // Use absolute root to prevent relative directory crawling (e.g. /dashboard/citizen -> /dashboard/ 404)
  window.location.assign(getAppRoot());
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        // Preview auto-login fallback: when the browser blocks iframe cookies
        // (Safari ITP / private browsing / WebView), the runtime mirrors the
        // session into sessionStorage so we can forward it as a Bearer token.
        // The regular OAuth cookie flow keeps working and takes priority server-side.
        const supabaseToken = getSupabaseAccessToken();
        if (supabaseToken) return { Authorization: `Bearer ${supabaseToken}` };
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          if (raw) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) {
              return { Authorization: `Bearer ${token}` };
            }
          }
        } catch {
          // sessionStorage unavailable
        }
        return {};
      },
      async fetch(input, init) {
        try {
          const res = await globalThis.fetch(input, {
            ...(init ?? {}),
            credentials: "include",
          });
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("text/html") || !res.ok && !contentType.includes("json")) {
            return new Response(
              JSON.stringify([
                {
                  error: {
                    json: {
                      message: res.status === 404
                        ? "API service route not found."
                        : `API server returned status ${res.status}.`,
                      code: -32603,
                      data: { code: "INTERNAL_SERVER_ERROR", httpStatus: res.status },
                    },
                  },
                },
              ]),
              {
                status: res.status >= 400 ? res.status : 500,
                headers: { "Content-Type": "application/json" },
              }
            );
          }
          return res;
        } catch (err: any) {
          return new Response(
            JSON.stringify([
              {
                error: {
                  json: {
                    message: err?.message || "Network connection error.",
                    code: -32603,
                    data: { code: "INTERNAL_SERVER_ERROR" },
                  },
                },
              },
            ]),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
