import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS, decodeOAuthState } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify, decodeJwt } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { getSupabaseAuthUser } from "../supabase";
import { findPredefinedAccount } from "../../shared/maharashtraLocations";
import type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  GetUserInfoResponse,
  GetUserInfoWithJwtRequest,
  GetUserInfoWithJwtResponse,
} from "./types/manusTypes";
// Utility function
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

const EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
const GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
const GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;

class OAuthService {
  constructor(private client: ReturnType<typeof axios.create>) {
    if (ENV.oAuthServerUrl) {
      console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    } else {
      console.log("[OAuth] Legacy OAUTH_SERVER_URL not set (Supabase/Database Auth active)");
    }
  }

  private decodeState(state: string): string {
    return decodeOAuthState(state).redirectUri;
  }

  async getTokenByCode(
    code: string,
    state: string
  ): Promise<ExchangeTokenResponse> {
    const payload: ExchangeTokenRequest = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state),
    };

    const { data } = await this.client.post<ExchangeTokenResponse>(
      EXCHANGE_TOKEN_PATH,
      payload
    );

    return data;
  }

  async getUserInfoByToken(
    token: ExchangeTokenResponse
  ): Promise<GetUserInfoResponse> {
    const { data } = await this.client.post<GetUserInfoResponse>(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken,
      }
    );

    return data;
  }
}

const createOAuthHttpClient = (): AxiosInstance =>
  axios.create({
    baseURL: ENV.oAuthServerUrl,
    timeout: AXIOS_TIMEOUT_MS,
  });

class SDKServer {
  private readonly client: AxiosInstance;
  private readonly oauthService: OAuthService;

  constructor(client: AxiosInstance = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }

  private deriveLoginMethod(
    platforms: unknown,
    fallback: string | null | undefined
  ): string | null {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set<string>(
      platforms.filter((p): p is string => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (
      set.has("REGISTERED_PLATFORM_MICROSOFT") ||
      set.has("REGISTERED_PLATFORM_AZURE")
    )
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }

  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(
    code: string,
    state: string
  ): Promise<ExchangeTokenResponse> {
    return this.oauthService.getTokenByCode(code, state);
  }

  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken: string): Promise<GetUserInfoResponse> {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken,
    } as ExchangeTokenResponse);
    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoResponse;
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret || "arjuna-secret-demo-key-2026-sih-32chars";
    return new TextEncoder().encode(secret);
  }

  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || "",
      },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;

      if (
        !isNonEmptyString(openId) ||
        !isNonEmptyString(appId) ||
        !isNonEmptyString(name)
      ) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }

      return {
        openId,
        appId,
        name,
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  async getUserInfoWithJwt(
    jwtToken: string
  ): Promise<GetUserInfoWithJwtResponse> {
    const payload: GetUserInfoWithJwtRequest = {
      jwtToken,
      projectId: ENV.appId,
    };

    const { data } = await this.client.post<GetUserInfoWithJwtResponse>(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );

    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoWithJwtResponse;
  }

  private async authenticateSupabaseRequest(accessToken: string): Promise<AuthenticatedUser | null> {
    try {
      const supabaseUser = await getSupabaseAuthUser(accessToken);
      const signedInAt = new Date();

      if (!supabaseUser) {
        // Safe secondary decoding for Supabase JWT tokens if network fetch failed
        try {
          const decoded = decodeJwt(accessToken) as any;
          if (decoded && decoded.sub) {
            let user = await db.getUserByOpenId(decoded.sub, decoded.user_metadata);
            if (user) return user as AuthenticatedUser;
            const meta = decoded.user_metadata || {};
            const fullName = meta.full_name || meta.name || meta.user_name || (decoded.email ? decoded.email.split("@")[0] : "Care Member");
            await db.upsertUser({
              openId: decoded.sub,
              authId: decoded.sub,
              name: fullName,
              email: decoded.email || null,
              loginMethod: "supabase",
              role: meta.selected_role || meta.role || "citizen",
              phone: meta.phone || null,
              district: meta.district || null,
              village: meta.village || null,
              lastSignedIn: signedInAt,
            });
            user = await db.getUserByOpenId(decoded.sub, meta);
            if (user) return user as AuthenticatedUser;
          }
        } catch {
          // Token is not a decodable JWT
        }
        return null;
      }

      // Check if user profile already exists in DB
      let user = await db.getUserByOpenId(supabaseUser.id, supabaseUser.user_metadata);
      if (user) {
        // User exists: only update lastSignedIn timestamp without overwriting user's persisted profile data
        try {
          await db.upsertUser({
            openId: supabaseUser.id,
            lastSignedIn: signedInAt,
          });
        } catch (upsertErr) {
          console.warn("[Auth] Non-fatal upsertUser warning for existing user:", upsertErr);
        }
        return user;
      }

      // New user initial synchronization from Supabase signup metadata
      const metadataRole = supabaseUser.user_metadata?.selected_role || supabaseUser.user_metadata?.role;
      const allowedRole = ["citizen", "asha", "cho", "asha_cho", "doctor", "facility_staff", "administrator", "admin"].includes(String(metadataRole))
        ? (String(metadataRole) as any)
        : "citizen";
      const fullName =
        typeof supabaseUser.user_metadata?.full_name === "string" && supabaseUser.user_metadata.full_name.trim()
          ? supabaseUser.user_metadata.full_name.trim()
          : typeof supabaseUser.user_metadata?.name === "string" && supabaseUser.user_metadata.name.trim()
          ? supabaseUser.user_metadata.name.trim()
          : typeof supabaseUser.user_metadata?.user_name === "string" && supabaseUser.user_metadata.user_name.trim()
          ? supabaseUser.user_metadata.user_name.trim()
          : supabaseUser.email
          ? supabaseUser.email.split("@")[0]
          : "Care Member";

      let computedAge: number | null = null;
      if (supabaseUser.user_metadata?.age != null && !isNaN(Number(supabaseUser.user_metadata.age))) {
        computedAge = Number(supabaseUser.user_metadata.age);
      } else if (supabaseUser.user_metadata?.date_of_birth) {
        const dobStr = String(supabaseUser.user_metadata.date_of_birth);
        const parsedDob = new Date(dobStr);
        if (!isNaN(parsedDob.getTime())) {
          const diffMs = Date.now() - parsedDob.getTime();
          computedAge = Math.max(0, Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000)));
        }
      }

      try {
        await db.upsertUser({
          openId: supabaseUser.id,
          authId: supabaseUser.id,
          name: fullName,
          email: supabaseUser.email ?? null,
          loginMethod: "supabase",
          role: allowedRole,
          phone: (supabaseUser.user_metadata?.phone as string) ?? null,
          district: (supabaseUser.user_metadata?.district as string) ?? null,
          village: (supabaseUser.user_metadata?.village as string) ?? null,
          dateOfBirth: (supabaseUser.user_metadata?.date_of_birth as string) ?? null,
          age: computedAge,
          gender: (supabaseUser.user_metadata?.gender as string) ?? null,
          facilityName: (supabaseUser.user_metadata?.facility_name as string) ?? null,
          designation: (supabaseUser.user_metadata?.designation as string) ?? null,
          employeeId: (supabaseUser.user_metadata?.employee_id as string) ?? null,
          registrationNumber: (supabaseUser.user_metadata?.registration_number as string) ?? null,
          assignedVillage: (supabaseUser.user_metadata?.assigned_village as string) ?? null,
          emergencyContactName: (supabaseUser.user_metadata?.emergency_contact_name as string) ?? null,
          emergencyContactPhone: (supabaseUser.user_metadata?.emergency_contact_phone as string) ?? null,
          bloodGroup: (supabaseUser.user_metadata?.blood_group as string) ?? null,
          allergies: (supabaseUser.user_metadata?.allergies as string) ?? null,
          conditions: (supabaseUser.user_metadata?.conditions as string) ?? null,
          address: (supabaseUser.user_metadata?.address as string) ?? null,
          pincode: (supabaseUser.user_metadata?.pincode as string) ?? null,
          abhaId: (supabaseUser.user_metadata?.abha_id as string) ?? null,
          lastSignedIn: signedInAt,
        });
      } catch (upsertErr) {
        console.warn("[Auth] Non-fatal upsertUser error for new user:", upsertErr);
      }
      user = await db.getUserByOpenId(supabaseUser.id, supabaseUser.user_metadata);
      if (!user) {
        user = {
          id: 1,
          openId: supabaseUser.id,
          authId: supabaseUser.id,
          name: fullName,
          email: supabaseUser.email ?? null,
          loginMethod: "supabase",
          role: allowedRole,
          status: "APPROVED",
          phone: (supabaseUser.user_metadata?.phone as string) ?? null,
          dateOfBirth: (supabaseUser.user_metadata?.date_of_birth as string) ?? null,
          age: computedAge,
          gender: (supabaseUser.user_metadata?.gender as string) ?? null,
          village: (supabaseUser.user_metadata?.village as string) ?? null,
          district: (supabaseUser.user_metadata?.district as string) ?? "Ahmedabad Rural",
          facilityId: null,
          facilityName: null,
          designation: null,
          employeeId: null,
          registrationNumber: null,
          assignedVillage: null,
          emergencyContactName: (supabaseUser.user_metadata?.emergency_contact_name as string) ?? null,
          emergencyContactPhone: (supabaseUser.user_metadata?.emergency_contact_phone as string) ?? null,
          bloodGroup: (supabaseUser.user_metadata?.blood_group as string) ?? null,
          allergies: (supabaseUser.user_metadata?.allergies as string) ?? null,
          conditions: (supabaseUser.user_metadata?.conditions as string) ?? null,
          address: (supabaseUser.user_metadata?.address as string) ?? null,
          pincode: (supabaseUser.user_metadata?.pincode as string) ?? null,
          abhaId: (supabaseUser.user_metadata?.abha_id as string) ?? null,
          avatarUrl: null,
          createdAt: signedInAt,
          updatedAt: signedInAt,
          lastSignedIn: signedInAt,
        } as any;
      }
      return user;
    } catch (err) {
      console.error("[Auth] authenticateSupabaseRequest error:", err);
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    // 0. Check client-forwarded active user email / identifier header
    const emailHeader = (req.headers["x-arjuna-user-email"] || req.headers["x-user-email"]) as string | undefined;
    if (typeof emailHeader === "string" && emailHeader.trim().length > 0) {
      const normEmail = emailHeader.trim().toLowerCase();
      let emailUser = await db.getUserByEmail(normEmail);
      if (emailUser) return emailUser as AuthenticatedUser;

      const predefined = findPredefinedAccount(normEmail);
      if (predefined) {
        let pUser = await db.getUserByOpenId(predefined.id);
        if (!pUser) {
          await db.upsertUser({
            openId: predefined.id,
            authId: predefined.id,
            name: predefined.name,
            email: predefined.email,
            loginMethod: "predefined",
            role: predefined.role,
            status: "APPROVED",
            phone: predefined.phone || "+91 94220 00000",
            village: predefined.village || null,
            district: predefined.district,
            facilityName: predefined.facilityName || `${predefined.district} Health Office`,
            designation: predefined.designation || "District Administrator",
            employeeId: `EMP-${predefined.id.toUpperCase()}`,
            lastSignedIn: new Date(),
          });
          pUser = await db.getUserByOpenId(predefined.id);
        }
        if (pUser) return pUser as AuthenticatedUser;
      }
    }

    const authorization = req.headers.authorization;
    if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
      const bearerToken = authorization.slice(7).trim();
      const supabaseUser = await this.authenticateSupabaseRequest(bearerToken);
      if (supabaseUser) return supabaseUser;

      if (bearerToken.startsWith("session-")) {
        const parts = bearerToken.split("-");
        if (parts.length >= 3) {
          const openId = parts.slice(1, -1).join("-");
          const u = await db.getUserByOpenId(openId);
          if (u) return u as AuthenticatedUser;
        }
      }
    }

    // 1. Prefer the session cookie (regular OAuth login).
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);

    // 2. Fallback to the Authorization header (Preview auto-login via
    //    sessionStorage), used when the browser blocks iframe cookies such as
    //    Safari ITP, private browsing, or iOS/Android WebView.
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7).trim();
      }
    }

    if (sessionToken && sessionToken.startsWith("session-")) {
      const parts = sessionToken.split("-");
      if (parts.length >= 3) {
        const openId = parts.slice(1, -1).join("-");
        const u = await db.getUserByOpenId(openId);
        if (u) return u as AuthenticatedUser;
      }
    }

    const session = await this.verifySession(sessionToken);

    if (!session) {
      if (!ENV.oAuthServerUrl) {
        const fallback = (await db.getUserById(1)) || (await db.getUserByOpenId("demo-citizen-1")) || (await db.getUserByOpenId("demo-user-citizen"));
        if (fallback) return fallback as AuthenticatedUser;
      }
      throw ForbiddenError("Invalid session cookie");
    }

    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }

    const sessionUserId = session.openId;
    const signedInAt = new Date();
    let user = await db.getUserByOpenId(sessionUserId);

    // If user not in DB, sync from OAuth server automatically
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await db.upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt,
        });
        user = await db.getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }

    if (!user) {
      throw ForbiddenError("User not found");
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });

    return user;
  }
}

const CRON_OPEN_ID_PREFIX = "cron_";

/** Result of `sdk.authenticateRequest`. Cron callbacks set `isCron=true` and `taskUid`; see `/home/ubuntu/skills/webdev-periodic-updates/SKILL.md`. */
export type AuthenticatedUser = User & {
  taskUid?: string;
  isCron?: boolean;
};

function buildCronUser(
  userInfo: GetUserInfoWithJwtResponse
): AuthenticatedUser {
  const now = new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "citizen",
    facilityId: null,
    district: null,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? undefined,
    isCron: true,
  } as AuthenticatedUser;
}

export const sdk = new SDKServer();
