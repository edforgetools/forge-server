interface LogEventData {
  name: string;
  meta?: Record<string, any>;
}

interface LogResponse {
  ok: boolean;
  error?: string;
}

/**
 * Centralized logging function that posts log events to the /api/log endpoint
 * @param name - The name/type of the log event
 * @param meta - Optional metadata object to include with the log
 */
export async function logEvent(
  name: string,
  meta?: Record<string, any>
): Promise<void> {
  const logData: LogEventData = { name, meta };

  try {
    const response = await fetch("/api/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(logData),
    });

    if (!response.ok) {
      const errorData: LogResponse = await response.json();
      console.error("Failed to log event:", errorData.error || "Unknown error");
    }
  } catch (error) {
    // Fallback to console if the API is unavailable
    console.error("Failed to send log event:", error);
    console.log(`[log-event] ${name}`, meta);
  }
}

/**
 * Convenience function for logging errors
 * @param error - The error to log
 * @param context - Optional context about where the error occurred
 */
export async function logError(
  error: Error | string,
  context?: Record<string, any>
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  await logEvent("error", {
    message: errorMessage,
    stack: errorStack,
    ...context,
  });
}

/**
 * Convenience function for logging info messages
 * @param message - The info message to log
 * @param meta - Optional metadata
 */
export async function logInfo(
  message: string,
  meta?: Record<string, any>
): Promise<void> {
  await logEvent("info", {
    message,
    ...meta,
  });
}

/**
 * Convenience function for logging warnings
 * @param message - The warning message to log
 * @param meta - Optional metadata
 */
export async function logWarning(
  message: string,
  meta?: Record<string, any>
): Promise<void> {
  await logEvent("warning", {
    message,
    ...meta,
  });
}
