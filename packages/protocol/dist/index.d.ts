import { z } from "zod";
export declare const PermissionScope: z.ZodEnum<["fs.read", "fs.write", "net.fetch", "shell.exec", "env.read"]>;
export declare const SkillManifestSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0.0">;
    name: z.ZodString;
    version: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    author: z.ZodObject<{
        name: z.ZodString;
        url: z.ZodOptional<z.ZodString>;
        publicKey: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        publicKey: string;
        url?: string | undefined;
    }, {
        name: string;
        publicKey: string;
        url?: string | undefined;
    }>;
    permissions: z.ZodDefault<z.ZodArray<z.ZodEnum<["fs.read", "fs.write", "net.fetch", "shell.exec", "env.read"]>, "many">>;
    integrity: z.ZodObject<{
        file: z.ZodString;
        hash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        file: string;
        hash: string;
    }, {
        file: string;
        hash: string;
    }>;
    signature: z.ZodObject<{
        algorithm: z.ZodLiteral<"ed25519">;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        value: string;
        algorithm: "ed25519";
    }, {
        value: string;
        algorithm: "ed25519";
    }>;
}, "strip", z.ZodTypeAny, {
    name: string;
    version: string;
    schemaVersion: "1.0.0";
    author: {
        name: string;
        publicKey: string;
        url?: string | undefined;
    };
    permissions: ("fs.read" | "fs.write" | "net.fetch" | "shell.exec" | "env.read")[];
    integrity: {
        file: string;
        hash: string;
    };
    signature: {
        value: string;
        algorithm: "ed25519";
    };
    description?: string | undefined;
}, {
    name: string;
    version: string;
    schemaVersion: "1.0.0";
    author: {
        name: string;
        publicKey: string;
        url?: string | undefined;
    };
    integrity: {
        file: string;
        hash: string;
    };
    signature: {
        value: string;
        algorithm: "ed25519";
    };
    description?: string | undefined;
    permissions?: ("fs.read" | "fs.write" | "net.fetch" | "shell.exec" | "env.read")[] | undefined;
}>;
export type SkillManifest = z.infer<typeof SkillManifestSchema>;
