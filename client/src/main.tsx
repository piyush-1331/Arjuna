import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getSupabaseAccessToken } from "./lib/supabase";
import { SessionManager } from "./_core/sessionManager";
import "./index.css";

const queryClient = new QueryClient();

const handleApiSessionError = (error: unknown) => {
  if (typeof window === "undefined") return;
  if (!(error instanceof TRPCClientError)) return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG || (error as any)?.data?.code === "UNAUTHORIZED";
  if (!isUnauthorized) return;

  SessionManager.handleSessionError(error);
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    handleApiSessionError(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    handleApiSessionError(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        const supabaseToken = getSupabaseAccessToken();
        if (supabaseToken) return { Authorization: `Bearer ${supabaseToken}` };

        const headers: Record<string, string> = {};
        try {
          const activeEmail = localStorage.getItem("arjuna.auth.active_email");
          const sessionToken = localStorage.getItem("arjuna.auth.session_token");
          if (sessionToken) {
            headers["Authorization"] = `Bearer ${sessionToken}`;
          }
          if (activeEmail) {
            headers["x-arjuna-user-email"] = activeEmail;
          }
          const raw = sessionStorage.getItem("manus-cookie");
          if (raw && !headers["Authorization"]) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) {
              headers["Authorization"] = `Bearer ${token}`;
            }
          }
        } catch {
          // storage unavailable
        }
        return headers;
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
