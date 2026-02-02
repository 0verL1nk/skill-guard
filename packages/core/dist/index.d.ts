import { SkillManifest } from "@overlink/sg-protocol";
export declare function generateKeyPair(): {
    publicKey: string;
    secretKey: string;
};
export declare function hashContent(content: string | Buffer): string;
/**
 * Calculates a deterministic hash for a map of files.
 * Sorts keys to ensure order independence.
 */
export declare function hashFileMap(files: Record<string, string>): string;
/**
 * Signs a manifest.
 * Supports both V1 (single file content) and V2 (file map).
 *
 * @param partialManifest Metadata
 * @param target Either a string (content of SKILL.md for V1) or Record<string, string> (map of path->hash for V2)
 * @param fileNameOrRoot For V1: the filename (e.g. SKILL.md). For V2: ignored or root context (optional).
 * @param secretKeyB64
 */
export declare function signManifest(partialManifest: Omit<SkillManifest, "signature" | "integrity">, target: string | Record<string, string>, fileNameOrRoot: string, secretKeyB64: string): SkillManifest;
/**
 * Verifies a manifest.
 *
 * @param manifest The manifest to verify
 * @param target The content to verify against.
 *               For V1: string (content of the single file).
 *               For V2: Record<string, string> (map of path -> calculated_hash_of_file_on_disk).
 */
export declare function verifyManifest(manifest: SkillManifest, target: string | Record<string, string>): boolean;
export declare function checkPolicy(manifest: SkillManifest, policy: import("@overlink/sg-protocol").Policy): {
    allowed: boolean;
    reason?: string;
};
export declare function resolveDID(did: string): Promise<string | null>;
