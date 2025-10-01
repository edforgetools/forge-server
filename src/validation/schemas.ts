import { z } from "zod";

// Captions endpoint validation schema
export const captionsSchema = z.object({
  transcript: z
    .string()
    .min(1, "transcript is required and must be a non-empty string")
    .max(10000, "transcript is too long (max 10,000 characters)")
    .refine((val) => val.trim().length > 0, {
      message: "transcript cannot be empty or only whitespace",
    }),
  tone: z
    .enum(["default", "professional", "casual", "funny"], {
      errorMap: () => ({
        message: "tone must be one of: default, professional, casual, funny",
      }),
    })
    .optional()
    .default("default"),
  maxLen: z
    .number()
    .int("maxLen must be an integer")
    .min(10, "maxLen must be at least 10")
    .max(500, "maxLen must be at most 500")
    .optional()
    .default(120),
});

// ExportZip endpoint validation schema
export const exportZipSchema = z
  .object({
    transcript: z
      .string()
      .max(50000, "transcript is too long (max 50,000 characters)")
      .optional(),
    tweet: z
      .string()
      .max(10000, "tweet is too long (max 10,000 characters)")
      .optional(),
    instagram: z
      .string()
      .max(10000, "instagram is too long (max 10,000 characters)")
      .optional(),
    youtube: z
      .string()
      .max(10000, "youtube is too long (max 10,000 characters)")
      .optional(),
    captions: z
      .record(
        z
          .string()
          .max(10000, "caption value is too long (max 10,000 characters)")
      )
      .optional(),
  })
  .refine(
    (data) => {
      // At least one content field must be provided
      return (
        data.transcript ||
        data.tweet ||
        data.instagram ||
        data.youtube ||
        (data.captions && Object.keys(data.captions).length > 0)
      );
    },
    {
      message: "At least one content field is required",
      path: ["transcript"], // This will make the error appear on the transcript field
    }
  );

// Type exports for TypeScript
export type CaptionsInput = z.infer<typeof captionsSchema>;
export type ExportZipInput = z.infer<typeof exportZipSchema>;
