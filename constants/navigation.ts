export const AUTHENTICATED_TAB_ROUTES = [
  "index",
  "community",
  "check-in",
  "game-plan",
  "clipboard",
] as const;

export type AuthenticatedTabRoute = (typeof AUTHENTICATED_TAB_ROUTES)[number];

export const isAuthenticatedTabRoute = (
  route: string,
): route is AuthenticatedTabRoute =>
  AUTHENTICATED_TAB_ROUTES.some((candidate) => candidate === route);
