import * as nacl from "tweetnacl";
import * as naclUtil from "tweetnacl-util";
import * as crypto from "crypto";
import { SkillManifest, SkillManifestSchema } from "@skill-guard/protocol";

export function generateKeyPair() {
    const kp = nacl.sign.keyPair();
    return {
        publicKey: naclUtil.encodeBase64(kp.publicKey),
        secretKey: naclUtil.encodeBase64(kp.secretKey)
    };
}

export function hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
}

export function signManifest(
    partialManifest: Omit<SkillManifest, "signature" | "integrity">,
    fileContent: string,
    fileName: string,
    secretKeyB64: string
): SkillManifest {
    // 1. Calculate Hash
    const fileHash = hashContent(fileContent);
    
    // 2. Prepare payload to sign (hash + version + name)
    // We sign the integrity hash to bind the content to the identity
    const payload = `${partialManifest.name}:${partialManifest.version}:${fileHash}`;
    const payloadBytes = naclUtil.decodeUTF8(payload);
    
    // 3. Sign
    const secretKey = naclUtil.decodeBase64(secretKeyB64);
    const signatureBytes = nacl.sign.detached(payloadBytes, secretKey);
    const signatureB64 = naclUtil.encodeBase64(signatureBytes);

    return {
        ...partialManifest,
        integrity: {
            file: fileName,
            hash: fileHash
        },
        signature: {
            algorithm: "ed25519",
            value: signatureB64
        }
    };
}

export function verifyManifest(manifest: SkillManifest, fileContent: string): boolean {
    // 1. Validate Schema
    const parseResult = SkillManifestSchema.safeParse(manifest);
    if (!parseResult.success) return false;

    // 2. Verify Integrity (Hash)
    const currentHash = hashContent(fileContent);
    if (currentHash !== manifest.integrity.hash) {
        console.error("Hash mismatch: Content has been tampered with.");
        return false;
    }

    // 3. Verify Signature
    const payload = `${manifest.name}:${manifest.version}:${manifest.integrity.hash}`;
    const payloadBytes = naclUtil.decodeUTF8(payload);
    const signatureBytes = naclUtil.decodeBase64(manifest.signature.value);
    const publicKeyBytes = naclUtil.decodeBase64(manifest.author.publicKey);

    return nacl.sign.detached.verify(payloadBytes, signatureBytes, publicKeyBytes);
}

export function checkPolicy(manifest: SkillManifest, policy: import("@skill-guard/protocol").Policy): { allowed: boolean; reason?: string } {
    // 1. Check Trust (Public Key)
    if (!policy.trustedKeys.includes(manifest.author.publicKey)) {
        return { allowed: false, reason: "Author's public key is not trusted by policy." };
    }

    // 2. Check Permissions (Max Cap)
    if (policy.maxPermissions) {
        const forbidden = manifest.permissions.filter(p => !policy.maxPermissions!.includes(p));
        if (forbidden.length > 0) {
            return { allowed: false, reason: `Requesting forbidden permissions: ${forbidden.join(", ")}` };
        }
    }

    return { allowed: true };
}

export async function resolveDID(did: string): Promise<string | null> {
    console.log(`[Core] Resolving DID: ${did}`);
    
    // Mock implementation for MVP
    if (did.startsWith("did:test:")) {
        // Return a static key for testing or extract from DID if it was a did:key
        // For this mock, we'll assume the user provides a DID that maps to the known test key if hardcoded,
        // or we just return a dummy key. 
        // BETTER: For the CLI test case, we might need it to actually work.
        // Let's return null to simulate "not found" unless it matches our test case.
        return null;
    }
    
    // TODO: Implement did:web or did:key resolution
    return null; 
}
