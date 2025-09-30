# Centralized Logging System

This directory contains the centralized logging system for the Forge application.

## Files

- `logEvent.ts` - Client-side logging functions that post to `/api/log`
- `serverLog.ts` - Server-side logging utilities for the Express server

## Usage

### Client-side Logging

```typescript
import { logEvent, logError, logInfo, logWarning } from './lib/logEvent';

// Basic event logging
await logEvent('user-action', { action: 'click', component: 'Button' });

// Error logging
await logError(new Error('Something went wrong'), { context: 'data-processing' });

// Info logging
await logInfo('User logged in', { userId: '123' });

// Warning logging
await logWarning('Slow API response', { duration: 5000 });
```

### Server-side Logging

```typescript
import { logServerInfo, logServerError, logServerWarning } from './lib/serverLog';

// Server info logging
logServerInfo('Server started', { port: 3000 });

// Server error logging
logServerError(error, { url: '/api/data', method: 'POST' });

// Server warning logging
logServerWarning('High memory usage', { usage: '85%' });
```

## API Endpoint

The `/api/log` endpoint accepts POST requests with the following format:

```json
{
  "name": "event-name",
  "meta": {
    "key": "value",
    "additional": "data"
  }
}
```

## Error Boundary

The `ErrorBoundary` component catches React errors and logs them automatically:

```tsx
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <YourAppContent />
    </ErrorBoundary>
  );
}
```
