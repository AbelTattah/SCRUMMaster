import { NextResponse } from "next/server";

/**
 * One-click guest mode. Sets the guest flag and lands directly on the board -
 * no account, no intermediate sign-in screen.
 *
 * The redirect is relative on purpose: the desktop app runs on
 * 127.0.0.1:4556 and the encrypted task mirror is per-origin, so bouncing
 * through "localhost" would orphan the user's local data.
 */
export function GET(request: Request) {
  const url = new URL("/", request.url);
  const response = NextResponse.redirect(url);

  response.headers.set("Location", "/");

  response.cookies.set("scrum-guest", "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false, // the client clears it on "Exit guest mode"
    secure: url.protocol === "https:",
  });

  return response;
}
