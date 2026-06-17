import * as Sentry from '@sentry/nextjs';

export function captureError(error: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(message: string, context?: Record<string, unknown>) {
  Sentry.captureMessage(message, { extra: context });
}

export function setSentryUser(user: { id: string; email?: string; role?: string } | null) {
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email, role: user.role });
  } else {
    Sentry.setUser(null);
  }
}
