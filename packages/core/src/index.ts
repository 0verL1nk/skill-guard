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
