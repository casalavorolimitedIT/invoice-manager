import type { CookieOptions } from "@supabase/ssr";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isInvalidRefreshTokenError } from "./auth";
import { supabaseConfig } from "./config";

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  request.cookies
    .getAll()
    .filter(({ name }) => name.startsWith("sb-"))
    .forEach(({ name }) => {
      response.cookies.set(name, "", {
        path: "/",
        maxAge: 0,
      });
    });
}

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  const supabase = createServerClient(
    supabaseConfig.url,
    supabaseConfig.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  // This will update the session in the cookie if it has changed
  try {
    await supabase.auth.getSession();
  } catch (error) {
    if (!isInvalidRefreshTokenError(error)) {
      throw error;
    }

    if (request.nextUrl.pathname.startsWith("/dashboard")) {
      const redirectUrl = new URL("/login", request.url);
      const redirectResponse = NextResponse.redirect(redirectUrl);
      clearSupabaseAuthCookies(request, redirectResponse);
      return redirectResponse;
    }

    clearSupabaseAuthCookies(request, response);
  }

  return response;
}
