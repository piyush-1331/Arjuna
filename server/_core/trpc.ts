import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const isProduction = process.env.NODE_ENV === "production";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Sanitize internal server errors to prevent information leakage (e.g. database connection strings or stack traces)
    const isInternalError = error.code === "INTERNAL_SERVER_ERROR";
    return {
      ...shape,
      message: isInternalError && isProduction
        ? "An internal server error occurred. Please contact system administrator."
        : shape.message,
      data: {
        ...shape.data,
        stack: isProduction ? undefined : shape.data.stack,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

const requireApprovedUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  const userStatus = ((ctx.user as any).status || "APPROVED").toUpperCase();
  if (userStatus === "PENDING") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your healthcare staff registration is pending administrator approval.",
    });
  }
  if (userStatus === "REJECTED") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Your registration was not approved. ${((ctx.user as any).rejectionReason ? `Reason: ${(ctx.user as any).rejectionReason}` : "")}`,
    });
  }
  if (userStatus === "SUSPENDED") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your Arjuna account has been suspended. Please contact the system administrator.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);
export const approvedProcedure = t.procedure.use(requireApprovedUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    if (!["admin", "administrator", "super_admin"].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    const userStatus = ((ctx.user as any).status || "APPROVED").toUpperCase();
    if (userStatus !== "APPROVED") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Administrator account is ${userStatus}. Access denied.`,
      });
    }

    // Verify configured ADMIN_EMAIL matches or user is an official district administrator or super administrator
    const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const userEmail = ctx.user.email?.toLowerCase() || "";
    const isPredefinedAdmin =
      userEmail.startsWith("admin.") ||
      userEmail.startsWith("superadmin") ||
      userEmail === "admin@arjuna.gov.in" ||
      userEmail === "superadmin@arjuna.gov.in" ||
      userEmail === "state.admin@arjuna.gov.in" ||
      ctx.user.role === "super_admin" ||
      Boolean((ctx.user as any).isSystemAdmin);

    if (configuredAdminEmail && userEmail !== configuredAdminEmail && !isPredefinedAdmin) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Administrator access denied: User identity does not match the configured system administrator account.",
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

export const doctorProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    const userStatus = ((ctx.user as any).status || "APPROVED").toUpperCase();
    if (userStatus !== "APPROVED") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Account is ${userStatus}. Access to clinical procedures is restricted.`,
      });
    }

    if (!["doctor", "admin", "administrator"].includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only licensed doctors and administrators are authorized for this clinical action.",
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

export const careTeamProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    const userStatus = ((ctx.user as any).status || "APPROVED").toUpperCase();
    if (userStatus !== "APPROVED") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Account is ${userStatus}. Access to care coordination procedures is restricted.`,
      });
    }

    const allowedRoles = ["asha", "cho", "asha_cho", "doctor", "facility_staff", "administrator", "admin"];
    if (!allowedRoles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This procedure requires care-team or healthcare worker credentials.",
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

export const facilityStaffProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    const userStatus = ((ctx.user as any).status || "APPROVED").toUpperCase();
    if (userStatus !== "APPROVED") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Account is ${userStatus}. Access to facility inventory procedures is restricted.`,
      });
    }

    if (!["facility_staff", "admin", "administrator"].includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only facility staff and administrators can perform facility inventory operations.",
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
