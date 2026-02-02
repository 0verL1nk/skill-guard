import { z } from "zod";

// Permission scopes using reverse domain notation or simple verbs
export const PermissionScope = z.enum([
    "fs.read", "fs.write", "net.fetch", "shell.exec", "env.read"
]);

export const SkillManifestSchema = z.object({
    schemaVersion: z.literal("1.0.0"),
    name: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    description: z.string().optional(),
    author: z.object({
        name: z.string(),
        url: z.string().url().optional(),
        publicKey: z.string() // Ed25519 Public Key (Base64)
    }),
    permissions: z.array(PermissionScope).default([]),
    integrity: z.object({
        file: z.string(), // e.g. "SKILL.md"
        hash: z.string()  // sha256-hash
    }),
    signature: z.object({
        algorithm: z.literal("ed25519"),
        value: z.string() // Signature of the hash (Base64)
    })
});

export type SkillManifest = z.infer<typeof SkillManifestSchema>;

// Policy Schema: Defines what the runtime accepts
export const PolicySchema = z.object({
    trustedKeys: z.array(z.string()), // List of accepted Public Keys (Base64)
    maxPermissions: z.array(PermissionScope).optional(), // If set, skill cannot have permissions outside this list
    enforceVersionMatch: z.boolean().default(false) // Future: check against a registry
});

export type Policy = z.infer<typeof PolicySchema>;
