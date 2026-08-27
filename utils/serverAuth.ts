import "server-only";
import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

/**
 * Server-only authorization helpers for API route handlers.
 *
 * These helpers intentionally trust only a Supabase Bearer access token. They
 * never use request-body identity fields or role cookies as authentication
 * evidence.
 */

export type AdminRole = "admin" | "manager";

export type UnauthorizedResult = {
  ok: false;
  kind: "unauthorized";
  status: 401;
  message: "Authorization Bearer token is required or invalid.";
};

export type ForbiddenResult = {
  ok: false;
  kind: "forbidden";
  status: 403;
  message: "Authenticated user does not have the required permission.";
};

export type AuthenticatedUserResult = {
  ok: true;
  kind: "authenticated";
  user: User;
};

export type AdminResult = {
  ok: true;
  kind: "admin";
  user: User;
  role: "admin";
};

export type ManagerResult = {
  ok: true;
  kind: "manager";
  user: User;
  role: "manager";
};

export type AuthenticationResult =
  | AuthenticatedUserResult
  | UnauthorizedResult;

export type AdminAuthorizationResult =
  | AdminResult
  | ManagerResult
  | UnauthorizedResult
  | ForbiddenResult;

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  return token || null;
}

/**
 * Validates a Supabase access token sent as `Authorization: Bearer <token>`.
 */
export async function authenticateRequest(
  request: Request,
): Promise<AuthenticationResult> {
  const token = getBearerToken(request);

  if (!token) {
    return {
      ok: false,
      kind: "unauthorized",
      status: 401,
      message: "Authorization Bearer token is required or invalid.",
    };
  }

  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return {
        ok: false,
        kind: "unauthorized",
        status: 401,
        message: "Authorization Bearer token is required or invalid.",
      };
    }

    return {
      ok: true,
      kind: "authenticated",
      user,
    };
  } catch {
    return {
      ok: false,
      kind: "unauthorized",
      status: 401,
      message: "Authorization Bearer token is required or invalid.",
    };
  }
}

/**
 * Requires an authenticated user whose database role is `admin` or `manager`.
 * The role is looked up using the verified Supabase user's ID, never a value
 * supplied by the client.
 */
export async function requireAdminOrManager(
  request: Request,
): Promise<AdminAuthorizationResult> {
  const authentication = await authenticateRequest(request);

  if (!authentication.ok) {
    return authentication;
  }

  try {
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", authentication.user.id)
      .maybeSingle();

    const role = profile?.role?.toLowerCase();

    if (error || (role !== "admin" && role !== "manager")) {
      return {
        ok: false,
        kind: "forbidden",
        status: 403,
        message: "Authenticated user does not have the required permission.",
      };
    }

    return {
      ok: true,
      kind: role,
      user: authentication.user,
      role,
    };
  } catch {
    return {
      ok: false,
      kind: "forbidden",
      status: 403,
      message: "Authenticated user does not have the required permission.",
    };
  }
}
