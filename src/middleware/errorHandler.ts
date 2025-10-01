import { Request, Response, NextFunction } from "express";
import { logServerError } from "../lib/serverLog";

/**
 * Enhanced error handling middleware that logs errors and provides user-friendly responses
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log the error with additional context
  logServerError(err, {
    url: req.url,
    method: req.method,
    userAgent: req.get("User-Agent"),
    ip: req.ip,
    timestamp: new Date().toISOString(),
    body: req.method !== "GET" ? req.body : undefined,
    query: req.query,
  });

  // Determine if this is an API request
  const isApiRequest = req.path.startsWith("/api/");

  if (isApiRequest) {
    // Return JSON error response for API requests
    res.status(500).json({
      ok: false,
      code: "INTERNAL_ERROR",
      message:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message,
      ...(process.env.NODE_ENV === "development" && {
        data: {
          stack: err.stack,
          timestamp: new Date().toISOString(),
        },
      }),
    });
  } else {
    // Return HTML error page for non-API requests
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Server Error - Forge</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 2rem;
            background-color: #f8f9fa;
            color: #212529;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            text-align: center;
          }
          .error-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
            color: #dc3545;
          }
          h1 {
            color: #212529;
            margin-bottom: 1rem;
          }
          p {
            color: #6c757d;
            line-height: 1.5;
            margin-bottom: 1.5rem;
          }
          .actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
          }
          button {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 500;
            text-decoration: none;
            display: inline-block;
          }
          .btn-primary {
            background-color: #007bff;
            color: white;
          }
          .btn-secondary {
            background-color: #6c757d;
            color: white;
          }
          .btn-primary:hover {
            background-color: #0056b3;
          }
          .btn-secondary:hover {
            background-color: #545b62;
          }
          ${
            process.env.NODE_ENV === "development"
              ? `
          .debug-info {
            margin-top: 2rem;
            padding: 1rem;
            background-color: #f8f9fa;
            border-radius: 4px;
            text-align: left;
            font-family: monospace;
            font-size: 0.8rem;
            color: #dc3545;
            white-space: pre-wrap;
            word-break: break-word;
          }
          `
              : ""
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">⚠️</div>
          <h1>Server Error</h1>
          <p>
            We're sorry, but something went wrong on our end.
            Our team has been notified and is working to fix this issue.
          </p>
          <div class="actions">
            <button class="btn-primary" onclick="window.location.reload()">
              Refresh Page
            </button>
            <button class="btn-secondary" onclick="window.history.back()">
              Go Back
            </button>
            <a href="/" class="btn-secondary" style="text-decoration: none;">
              Go Home
            </a>
          </div>
          ${
            process.env.NODE_ENV === "development"
              ? `
          <details class="debug-info">
            <summary style="cursor: pointer; font-weight: 500; margin-bottom: 0.5rem;">
              Error Details (Development)
            </summary>
            <div>${err.message}</div>
            ${err.stack ? `<div>${err.stack}</div>` : ""}
          </details>
          `
              : ""
          }
        </div>
      </body>
      </html>
    `);
  }
}

/**
 * 404 handler for API routes
 */
export function apiNotFoundHandler(req: Request, res: Response) {
  logServerError(
    new Error(`API endpoint not found: ${req.method} ${req.path}`),
    {
      url: req.url,
      method: req.method,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
    }
  );

  res.status(404).json({
    ok: false,
    code: "ENDPOINT_NOT_FOUND",
    message: "API endpoint not found",
    data: {
      path: req.path,
      method: req.method,
    },
  });
}
