// Every navigable path lives here; routes, links and navigate() calls use these
// constants instead of string literals.

export const AuthRoutes = {
  Login: "/login",
  Register: "/register",
  Verify: "/verify",
  Forgot: "/forgot",
  Reset: "/reset",
} as const;

export const SessionsRoutes = {
  Sessions: "/sessions",
} as const;

export const AccountRoutes = {
  Settings: "/settings",
} as const;

export const AdminRoutes = {
  Overview: "/admin",
  Users: "/admin/users",
  UserDetail: "/admin/users/$userId",
  Knowledge: "/admin/knowledge",
  Settings: "/admin/settings",
} as const;

/** Where signed-in users land by default. */
export const HomeRoute = SessionsRoutes.Sessions;
