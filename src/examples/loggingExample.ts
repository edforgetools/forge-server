/**
 * Example usage of the centralized logging system
 * This file demonstrates how to use logEvent and related functions
 */

import { logEvent, logError, logInfo, logWarning } from "../lib/logEvent";

// Example: Basic logging
export async function exampleBasicLogging() {
  await logEvent("info", "user-action", "user123", {
    action: "button-click",
    component: "Header",
  });
}

// Example: Error logging
export async function exampleErrorLogging() {
  try {
    // Some operation that might fail
    throw new Error("Something went wrong!");
  } catch (error) {
    await logError(error as Error, "user123", {
      context: "data-processing",
      operation: "processUserData",
    });
  }
}

// Example: Info logging
export async function exampleInfoLogging() {
  await logInfo("User logged in successfully", "user123", {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  });
}

// Example: Warning logging
export async function exampleWarningLogging() {
  await logWarning("API response took longer than expected", "user123", {
    endpoint: "/api/data",
    duration: 5000,
    threshold: 3000,
  });
}

// Example: Custom event logging
export async function exampleCustomEventLogging() {
  await logEvent("info", "video-upload", "user123", {
    fileSize: 1024 * 1024 * 50, // 50MB
    fileName: "video.mp4",
    uploadDuration: 30000, // 30 seconds
  });
}
