/**
 * Example usage of the centralized logging system
 * This file demonstrates how to use logEvent and related functions
 */

import { logEvent, logError, logInfo, logWarning } from '../lib/logEvent';

// Example: Basic logging
export async function exampleBasicLogging() {
  await logEvent('user-action', {
    action: 'button-click',
    component: 'Header',
    userId: 'user123'
  });
}

// Example: Error logging
export async function exampleErrorLogging() {
  try {
    // Some operation that might fail
    throw new Error('Something went wrong!');
  } catch (error) {
    await logError(error as Error, {
      context: 'data-processing',
      userId: 'user123',
      operation: 'processUserData'
    });
  }
}

// Example: Info logging
export async function exampleInfoLogging() {
  await logInfo('User logged in successfully', {
    userId: 'user123',
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  });
}

// Example: Warning logging
export async function exampleWarningLogging() {
  await logWarning('API response took longer than expected', {
    endpoint: '/api/data',
    duration: 5000,
    threshold: 3000
  });
}

// Example: Custom event logging
export async function exampleCustomEventLogging() {
  await logEvent('video-upload', {
    fileSize: 1024 * 1024 * 50, // 50MB
    fileName: 'video.mp4',
    userId: 'user123',
    uploadDuration: 30000 // 30 seconds
  });
}
