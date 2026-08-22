import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const isPublicRoute =
    nextUrl.pathname === "/login" ||
    nextUrl.pathname === "/register" ||
    nextUrl.pathname.startsWith("/api/auth") ||
    nextUrl.pathname === "/api/register";

  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isResidentRoute = nextUrl.pathname.startsWith("/resident");

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/register")) {
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
    } else {
      return NextResponse.redirect(new URL("/resident/dashboard", nextUrl));
    }
  }

  // Protect Admin pages: Resident cannot access admin pages
  if (isAdminRoute && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/resident/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
