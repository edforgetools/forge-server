import { Request, Response, NextFunction } from "express";

/**
 * Envelope response interface
 */
export interface EnvelopeResponse {
  ok: boolean;
  code?: string;
  message?: string;
  data?: any;
}

/**
 * Extends Express Response to include envelope methods
 */
declare global {
  namespace Express {
    interface Response {
      envelope: {
        success: (data?: any, message?: string, code?: string) => void;
        error: (message: string, code?: string, statusCode?: number) => void;
      };
    }
  }
}

/**
 * Middleware that adds envelope formatting methods to the response object
 */
export function envelopeMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Add envelope methods to response object
  res.envelope = {
    /**
     * Send a successful response with optional data, message, and code
     */
    success: (data?: any, message?: string, code?: string) => {
      const envelope: EnvelopeResponse = { ok: true };

      if (code) envelope.code = code;
      if (message) envelope.message = message;
      if (data !== undefined) envelope.data = data;

      res.json(envelope);
    },

    /**
     * Send an error response with message, optional code, and status code
     */
    error: (message: string, code?: string, statusCode: number = 400) => {
      const envelope: EnvelopeResponse = {
        ok: false,
        message,
      };

      if (code) envelope.code = code;

      res.status(statusCode).json(envelope);
    },
  };

  next();
}

/**
 * Wrapper for async route handlers that automatically catches errors
 * and formats them with the envelope
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error("Async handler error:", error);
      res.envelope.error(
        error.message || "Internal server error",
        error.code || "INTERNAL_ERROR",
        error.statusCode || 500
      );
    });
  };
}
