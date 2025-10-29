/**
 * Configuration des routes de l'application
 */
export const ROUTES = {
  HOME: '/',
  PLAYER: '/player',
  ADMIN: '/admin',
} as const;

export type Route = typeof ROUTES[keyof typeof ROUTES];
