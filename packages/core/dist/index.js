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
const nacl = __importStar(require("tweetnacl"));
const naclUtil = __importStar(require("tweetnacl-util"));
const crypto = __importStar(require("crypto"));
const protocol_1 = require("@skill-guard/protocol");
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
    const parseResult = protocol_1.SkillManifestSchema.safeParse(manifest);
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
