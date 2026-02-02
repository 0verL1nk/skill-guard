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
export declare const PolicySchema: z.ZodObject<{
    trustedKeys: z.ZodArray<z.ZodString, "many">;
    maxPermissions: z.ZodOptional<z.ZodArray<z.ZodEnum<["fs.read", "fs.write", "net.fetch", "shell.exec", "env.read"]>, "many">>;
    enforceVersionMatch: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    trustedKeys: string[];
    enforceVersionMatch: boolean;
    maxPermissions?: ("fs.read" | "fs.write" | "net.fetch" | "shell.exec" | "env.read")[] | undefined;
}, {
    trustedKeys: string[];
    maxPermissions?: ("fs.read" | "fs.write" | "net.fetch" | "shell.exec" | "env.read")[] | undefined;
    enforceVersionMatch?: boolean | undefined;
}>;
export type Policy = z.infer<typeof PolicySchema>;
export declare const DIDDocumentSchema: z.ZodObject<{
    id: z.ZodString;
    verificationMethod: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"Ed25519VerificationKey2020">;
        controller: z.ZodString;
        publicKeyMultibase: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "Ed25519VerificationKey2020";
        id: string;
        controller: string;
        publicKeyMultibase: string;
    }, {
        type: "Ed25519VerificationKey2020";
        id: string;
        controller: string;
        publicKeyMultibase: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    verificationMethod: {
        type: "Ed25519VerificationKey2020";
        id: string;
        controller: string;
        publicKeyMultibase: string;
    }[];
}, {
    id: string;
    verificationMethod: {
        type: "Ed25519VerificationKey2020";
        id: string;
        controller: string;
        publicKeyMultibase: string;
    }[];
}>;
export type DIDDocument = z.infer<typeof DIDDocumentSchema>;
