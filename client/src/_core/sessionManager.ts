import { UNAUTHED_ERR_MSG } from "@shared/const";

export type SessionStateStatus = "authenticated" | "pending_approval" | "unauthenticated" | "expired" | "invalid";

export interface SessionData {
  status: SessionStateStatus;
  userId?: string | number;
  email?: string | null;
  role?: string;
  district?: string | null;
  lastActiveAt: number;
}

export type SessionEvent = {
  type: "expired" | "invalid" | "unauthorized" | "authenticated" | "logged_out" | "status_change";
  message?: string;
  data?: SessionData | null;
};

type SessionEventListener = (event: SessionEvent) => void;

class SessionManagerService {
  private listeners = new Set<SessionEventListener>();
  private lastActivity = Date.now();
  private status: SessionStateStatus = "unauthenticated";
  private isModalVisible = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.initActivityTracking();
    }
  }

  private initActivityTracking() {
    const record = () => {
      this.lastActivity = Date.now();
    };
    window.addEventListener("click", record, { passive: true });
    window.addEventListener("keydown", record, { passive: true });
    window.addEventListener("touchstart", record, { passive: true });
  }

  public subscribe(listener: SessionEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public notify(event: SessionEvent) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.warn("[SessionManager] Listener error:", err);
      }
    });
  }

  public getSessionToken(): string | null {
    if (typeof window === "undefined") return null;
    return (
      localStorage.getItem("arjuna.auth.session_token") ||
      sessionStorage.getItem("arjuna.auth.session_token") ||
      null
    );
  }

  public setSessionToken(token: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem("arjuna.auth.session_token", token);
  }

  public saveReturnUrl(url?: string) {
    if (typeof window === "undefined") return;
    const target = url || (window.location.pathname + window.location.search);
    const lower = target.toLowerCase();
    if (
      target &&
      target !== "/" &&
      target !== "/arjuna" &&
      target !== "/arjuna/" &&
      !lower.includes("/login") &&
      !lower.includes("/pending-approval") &&
      !lower.includes("/forgot-password") &&
      !lower.includes("/reset-password") &&
      !lower.includes("/registration-rejected") &&
      !lower.includes("/account-suspended")
    ) {
      sessionStorage.setItem("arjuna.auth.return_to", target);
    }
  }

  public getAndClearReturnUrl(): string | null {
    if (typeof window === "undefined") return null;
    const returnTo = sessionStorage.getItem("arjuna.auth.return_to");
    if (returnTo) {
      sessionStorage.removeItem("arjuna.auth.return_to");
      return returnTo;
    }
    return null;
  }

  public handleSessionError(error: any, context?: string) {
    const message = error?.message || (typeof error === "string" ? error : "Your session is invalid or expired.");
    const isUnauthed =
      message === UNAUTHED_ERR_MSG ||
      error?.data?.code === "UNAUTHORIZED" ||
      error?.status === 401 ||
      (typeof message === "string" && (
        message.toLowerCase().includes("invalid session") ||
        message.toLowerCase().includes("session expired") ||
        message.toLowerCase().includes("session payload") ||
        message.toLowerCase().includes("unauthorized")
      ));

    if (isUnauthed) {
      this.saveReturnUrl();
      this.status = "expired";
      this.notify({
        type: "expired",
        message: "Your session has expired. Please sign in to resume your healthcare session.",
      });
    }
  }

  public clearSession() {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("arjuna.auth.session_token");
      localStorage.removeItem("arjuna.auth.active_email");
      localStorage.removeItem("arjuna.pendingRole");
      sessionStorage.removeItem("manus-cookie");
    } catch {
      // Storage error ignored
    }
    this.status = "unauthenticated";
    this.notify({ type: "logged_out" });
  }

  public getStatus(): SessionStateStatus {
    return this.status;
  }

  public setStatus(status: SessionStateStatus) {
    this.status = status;
    this.notify({
      type: "status_change",
      data: {
        status,
        lastActiveAt: this.lastActivity,
      },
    });
  }

  public setModalVisible(visible: boolean) {
    this.isModalVisible = visible;
  }

  public getModalVisible(): boolean {
    return this.isModalVisible;
  }
}

export const SessionManager = new SessionManagerService();
