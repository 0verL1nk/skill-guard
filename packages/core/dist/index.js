"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateKeyPair = generateKeyPair;
exports.hashContent = hashContent;
exports.signManifest = signManifest;
exports.verifyManifest = verifyManifest;
exports.checkPolicy = checkPolicy;
exports.resolveDID = resolveDID;
const nacl = __importStar(require("tweetnacl"));
const naclUtil = __importStar(require("tweetnacl-util"));
const crypto = __importStar(require("crypto"));
const sg_protocol_1 = require("@overlink/sg-protocol");
function generateKeyPair() {
    const kp = nacl.sign.keyPair();
    return {
        publicKey: naclUtil.encodeBase64(kp.publicKey),
        secretKey: naclUtil.encodeBase64(kp.secretKey)
    };
}
function hashContent(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}
function signManifest(partialManifest, fileContent, fileName, secretKeyB64) {
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
function verifyManifest(manifest, fileContent) {
    // 1. Validate Schema
    const parseResult = sg_protocol_1.SkillManifestSchema.safeParse(manifest);
    if (!parseResult.success)
        return false;
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
function checkPolicy(manifest, policy) {
    // 1. Check Trust (Public Key)
    if (!policy.trustedKeys.includes(manifest.author.publicKey)) {
        return { allowed: false, reason: "Author's public key is not trusted by policy." };
    }
    // 2. Check Permissions (Max Cap)
    if (policy.maxPermissions) {
        const forbidden = manifest.permissions.filter(p => !policy.maxPermissions.includes(p));
        if (forbidden.length > 0) {
            return { allowed: false, reason: `Requesting forbidden permissions: ${forbidden.join(", ")}` };
        }
    }
    return { allowed: true };
}
async function resolveDID(did) {
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
