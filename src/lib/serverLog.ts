/**
 * Server-side logging utilities that use console.log but with consistent formatting
 * This is for server-side logging where we don't need to make HTTP requests
 */

export function logServerInfo(
  message: string,
  meta?: Record<string, any>
): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [server-info] ${message}`, meta || "");
}

export function logServerError(
  error: Error | string,
  meta?: Record<string, any>
): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(`[${timestamp}] [server-error] ${errorMessage}`, {
    stack: errorStack,
    ...meta,
  });
}

export function logServerWarning(
  message: string,
  meta?: Record<string, any>
): void {
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] [server-warning] ${message}`, meta || "");
}
