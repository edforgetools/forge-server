import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

// Generic validation middleware
export const validateSchema = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate the request body against the schema
      const validatedData = schema.parse(req.body);

      // Replace req.body with the validated and transformed data
      req.body = validatedData;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod validation errors into our API response format
        const firstError = error.errors[0];
        const field = firstError.path.join(".");
        const message = firstError.message;

        return res.status(400).json({
          ok: false,
          code: "VALIDATION_ERROR",
          message: message,
        });
      }

      // If it's not a Zod error, pass it to the error handler
      next(error);
    }
  };
};

// Content-Type validation middleware
export const validateContentType = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.is("application/json")) {
    return res.status(400).json({
      ok: false,
      code: "INVALID_CONTENT_TYPE",
      message: "Content-Type must be application/json",
    });
  }
  next();
};
