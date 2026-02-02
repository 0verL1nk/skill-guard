"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIDDocumentSchema = exports.PolicySchema = exports.SkillManifestSchema = exports.PermissionScope = void 0;
const zod_1 = require("zod");
// Permission scopes using reverse domain notation or simple verbs
exports.PermissionScope = zod_1.z.enum([
    "fs.read", "fs.write", "net.fetch", "shell.exec", "env.read"
]);
exports.SkillManifestSchema = zod_1.z.object({
    schemaVersion: zod_1.z.literal("1.0.0"),
    name: zod_1.z.string().min(1),
    version: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/),
    description: zod_1.z.string().optional(),
    author: zod_1.z.object({
        name: zod_1.z.string(),
        url: zod_1.z.string().url().optional(),
        publicKey: zod_1.z.string() // Ed25519 Public Key (Base64)
    }),
    permissions: zod_1.z.array(exports.PermissionScope).default([]),
    integrity: zod_1.z.object({
        file: zod_1.z.string(), // e.g. "SKILL.md"
        hash: zod_1.z.string() // sha256-hash
    }),
    signature: zod_1.z.object({
        algorithm: zod_1.z.literal("ed25519"),
        value: zod_1.z.string() // Signature of the hash (Base64)
    })
});
// Policy Schema: Defines what the runtime accepts
exports.PolicySchema = zod_1.z.object({
    trustedKeys: zod_1.z.array(zod_1.z.string()), // List of accepted Public Keys (Base64)
    maxPermissions: zod_1.z.array(exports.PermissionScope).optional(), // If set, skill cannot have permissions outside this list
    enforceVersionMatch: zod_1.z.boolean().default(false) // Future: check against a registry
});
// DID Resolution Response
exports.DIDDocumentSchema = zod_1.z.object({
    id: zod_1.z.string(),
    verificationMethod: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        type: zod_1.z.literal("Ed25519VerificationKey2020"),
        controller: zod_1.z.string(),
        publicKeyMultibase: zod_1.z.string() // The public key
    }))
});
