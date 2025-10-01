interface LogEventData {
  ts: string;
  level: string;
  event: string;
  userAnonId: string;
  payload?: Record<string, any>;
}

interface LogResponse {
  ok: boolean;
  error?: string;
}

/**
 * Centralized logging function that posts log events to the /api/log endpoint
 * @param level - The log level (debug, info, warn, error)
 * @param event - The name/type of the log event
 * @param userAnonId - Anonymous user identifier
 * @param payload - Optional payload object to include with the log
 */
export async function logEvent(
  level: string,
  event: string,
  userAnonId: string,
  payload?: Record<string, any>
): Promise<void> {
  const logData: LogEventData = {
    ts: new Date().toISOString(),
    level,
    event,
    userAnonId,
    payload: payload || {},
  };

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
    console.log(`[log-event] ${event}`, payload);
  }
}

/**
 * Convenience function for logging errors
 * @param error - The error to log
 * @param userAnonId - Anonymous user identifier
 * @param context - Optional context about where the error occurred
 */
export async function logError(
  error: Error | string,
  userAnonId: string,
  context?: Record<string, any>
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  await logEvent("error", "error", userAnonId, {
    message: errorMessage,
    stack: errorStack,
    ...context,
  });
}

/**
 * Convenience function for logging info messages
 * @param message - The info message to log
 * @param userAnonId - Anonymous user identifier
 * @param payload - Optional payload
 */
export async function logInfo(
  message: string,
  userAnonId: string,
  payload?: Record<string, any>
): Promise<void> {
  await logEvent("info", "info", userAnonId, {
    message,
    ...payload,
  });
}

/**
 * Convenience function for logging warnings
 * @param message - The warning message to log
 * @param userAnonId - Anonymous user identifier
 * @param payload - Optional payload
 */
export async function logWarning(
  message: string,
  userAnonId: string,
  payload?: Record<string, any>
): Promise<void> {
  await logEvent("warn", "warning", userAnonId, {
    message,
    ...payload,
  });
}
