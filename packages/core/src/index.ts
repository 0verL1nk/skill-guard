import * as nacl from "tweetnacl";
import * as naclUtil from "tweetnacl-util";
import * as crypto from "crypto";
import { SkillManifest, SkillManifestSchema } from "@overlink/sg-protocol";

export function generateKeyPair() {
    const kp = nacl.sign.keyPair();
    return {
        publicKey: naclUtil.encodeBase64(kp.publicKey),
        secretKey: naclUtil.encodeBase64(kp.secretKey)
    };
}

export function hashContent(content: string | Buffer): string {
    return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Calculates a deterministic hash for a map of files.
 * Sorts keys to ensure order independence.
 */
export function hashFileMap(files: Record<string, string>): string {
    const sortedKeys = Object.keys(files).sort();
    const hash = crypto.createHash('sha256');
    for (const key of sortedKeys) {
        hash.update(`${key}:${files[key]}`); // path:hash
    }
    return hash.digest('hex');
}

/**
 * Signs a manifest. 
 * Supports both V1 (single file content) and V2 (file map).
 * 
 * @param partialManifest Metadata
 * @param target Either a string (content of SKILL.md for V1) or Record<string, string> (map of path->hash for V2)
 * @param fileNameOrRoot For V1: the filename (e.g. SKILL.md). For V2: ignored or root context (optional).
 * @param secretKeyB64 
 */
export function signManifest(
    partialManifest: Omit<SkillManifest, "signature" | "integrity">,
    target: string | Record<string, string>,
    fileNameOrRoot: string,
    secretKeyB64: string
): SkillManifest {
    let integrity: SkillManifest['integrity'];
    let payloadHash: string;

    if (typeof target === 'string') {
        // V1: Single File
        const fileHash = hashContent(target);
        payloadHash = fileHash;
        integrity = {
            version: 1, // Optional in type, but good to be explicit internally if we change type
            file: fileNameOrRoot,
            hash: fileHash
        } as any; // Cast to avoid TS union issues if strictly typed to V1|V2
    } else {
        // V2: File Map
        // target is Record<path, hash>
        // We calculate a "root hash" of all files to sign
        payloadHash = hashFileMap(target);
        integrity = {
            version: 2,
            files: target
        };
    }
    
    // 2. Prepare payload to sign
    const payload = `${partialManifest.name}:${partialManifest.version}:${payloadHash}`;
    const payloadBytes = naclUtil.decodeUTF8(payload);
    
    // 3. Sign
    const secretKey = naclUtil.decodeBase64(secretKeyB64);
    const signatureBytes = nacl.sign.detached(payloadBytes, secretKey);
    const signatureB64 = naclUtil.encodeBase64(signatureBytes);

    return {
        ...partialManifest,
        integrity,
        signature: {
            algorithm: "ed25519",
            value: signatureB64
        }
    };
}

/**
 * Verifies a manifest.
 * 
 * @param manifest The manifest to verify
 * @param target The content to verify against.
 *               For V1: string (content of the single file).
 *               For V2: Record<string, string> (map of path -> calculated_hash_of_file_on_disk).
 */
export function verifyManifest(manifest: SkillManifest, target: string | Record<string, string>): boolean {
    // 1. Validate Schema
    const parseResult = SkillManifestSchema.safeParse(manifest);
    if (!parseResult.success) {
        console.error("Schema validation failed:", parseResult.error);
        return false;
    }

    let payloadHash: string;

    // 2. Verify Integrity (Hash)
    if ('files' in manifest.integrity) {
        // V2
        if (typeof target === 'string') {
            console.error("Manifest is V2 (Multi-file) but verification target was a single string.");
            return false;
        }
        
        // Target is path->hash map from disk. Manifest is path->hash map from signature.
        // We need to check if they match EXACTLY.
        // 1. Check if all files in manifest exist in target and hashes match
        for (const [path, hash] of Object.entries(manifest.integrity.files)) {
            if (target[path] !== hash) {
                console.error(`Integrity check failed for ${path}: Hash mismatch or missing.`);
                return false;
            }
        }
        // 2. Check if there are extra files in target?
        // Strict mode: Yes. Loose mode: Maybe not?
        // For verifyManifest (core), we verify that "What was signed is what we have".
        // If we have *more* files than signed, technically the signed part is intact.
        // But for security, we usually want to know if there's extra junk.
        // Let's implement Strict Equality for now: The set of files must match.
        // Actually, the caller usually scans the directory. If the caller scans everything, we can check keys length.
        if (Object.keys(target).length !== Object.keys(manifest.integrity.files).length) {
            console.error("Integrity check failed: File count mismatch (extra or missing files).");
            return false;
        }

        payloadHash = hashFileMap(manifest.integrity.files);
    } else {
        // V1
        if (typeof target !== 'string') {
            console.error("Manifest is V1 (Single-file) but verification target was a file map.");
            return false;
        }
        const currentHash = hashContent(target);
        if (currentHash !== manifest.integrity.hash) {
            console.error("Hash mismatch: Content has been tampered with.");
            return false;
        }
        payloadHash = manifest.integrity.hash;
    }

    // 3. Verify Signature
    const payload = `${manifest.name}:${manifest.version}:${payloadHash}`;
    const payloadBytes = naclUtil.decodeUTF8(payload);
    const signatureBytes = naclUtil.decodeBase64(manifest.signature.value);
    const publicKeyBytes = naclUtil.decodeBase64(manifest.author.publicKey);

    return nacl.sign.detached.verify(payloadBytes, signatureBytes, publicKeyBytes);
}

export function checkPolicy(manifest: SkillManifest, policy: import("@overlink/sg-protocol").Policy): { allowed: boolean; reason?: string } {
    const authorKey = manifest.author.publicKey;

    // 1. Check Trust (Public Key)
    if (!policy.trustedKeys.includes(authorKey)) {
        return { allowed: false, reason: "Author's public key is not trusted by policy." };
    }

    const checkPerms = (requested: string[], allowedList: string[]) => {
        return requested.filter(req => {
            return !allowedList.some(allowed => {
                if (allowed.endsWith('*')) {
                    const prefix = allowed.slice(0, -1);
                    return req.startsWith(prefix);
                }
                return req === allowed;
            });
        });
    };

    // 2. Check Scoped Permissions (Specific to this Key)
    if (policy.scopedPermissions && policy.scopedPermissions[authorKey]) {
        const allowedScoped = policy.scopedPermissions[authorKey];
        const forbiddenScoped = checkPerms(manifest.permissions, allowedScoped);
        if (forbiddenScoped.length > 0) {
             return { allowed: false, reason: `Author restricted by Scoped Policy. Forbidden: ${forbiddenScoped.join(", ")}` };
        }
    }

    // 3. Check Global Permissions (Wildcard Support)
    if (policy.maxPermissions) {
        const forbiddenGlobal = checkPerms(manifest.permissions, policy.maxPermissions);
        if (forbiddenGlobal.length > 0) {
            return { allowed: false, reason: `Requesting forbidden global permissions: ${forbiddenGlobal.join(", ")}` };
        }
    }

    return { allowed: true };
}

export async function resolveDID(did: string): Promise<string | null> {
    console.log(`[Core] Resolving DID: ${did}`);
    // Mock implementation...
    return null; 
}
