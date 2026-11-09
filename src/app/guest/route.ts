import { NextResponse } from "next/server";

/**
 * One-click guest mode. Sets the guest flag and lands directly on the board —
 * no account, no intermediate sign-in screen.
 */
export function GET(request: Request) {
  const url = new URL("/", request.url);
  const response = NextResponse.redirect(url);

  response.cookies.set("scrum-guest", "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false, // the client clears it on "Exit guest mode"
    secure: url.protocol === "https:",
  });

  return response;
}
