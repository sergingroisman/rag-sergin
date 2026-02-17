import { z } from "zod";
export declare const querySchema: z.ZodObject<{
    question: z.ZodString;
    topK: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    question: string;
    topK: number;
}, {
    question: string;
    topK?: number | undefined;
}>;
export declare const fileUploadSchema: z.ZodObject<{
    mimeType: z.ZodLiteral<"application/pdf">;
    size: z.ZodNumber;
    originalName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    size: number;
    mimeType: "application/pdf";
    originalName: string;
}, {
    size: number;
    mimeType: "application/pdf";
    originalName: string;
}>;
export type QueryInput = z.infer<typeof querySchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
//# sourceMappingURL=index.d.ts.map