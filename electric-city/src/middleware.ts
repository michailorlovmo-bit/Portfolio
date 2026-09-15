export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/",
    "/buildings/:path*",
    "/phase-tasks/:path*",
    "/staff/:path*",
    "/settings/:path*",
    "/account/:path*",
    "/statistics/:path*",
  ],
};
