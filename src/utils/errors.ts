/**
 * Gestion centralisée des erreurs
 */

export class AudioError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AudioError';
  }
}

export class SceneError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'SceneError';
  }
}

export class PermissionError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * Affiche une erreur de manière user-friendly
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Une erreur inattendue s\'est produite';
}
