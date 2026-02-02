#!/usr/bin/env node
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
const commander_1 = require("commander");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const sg_core_1 = require("@overlink/sg-core");
const program = new commander_1.Command();
program
    .name("sg")
    .description("SkillGuard CLI - Secure your Agent Skills")
    .version("0.3.0");
async function scanDirectory(dir, baseDir = dir) {
    const entries = await fs.readdir(dir);
    const results = {};
    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/'); // Normalize path
        // Ignores
        if (['.git', 'node_modules', 'manifest.json', '.DS_Store'].includes(entry))
            continue;
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
            const subResults = await scanDirectory(fullPath, baseDir);
            Object.assign(results, subResults);
        }
        else {
            const content = await fs.readFile(fullPath); // Buffer
            results[relPath] = (0, sg_core_1.hashContent)(content);
        }
    }
    return results;
}
program.command("keygen")
    .description("Generate a new Ed25519 keypair")
    .option("-o, --out <dir>", "Output directory", ".")
    .action(async (options) => {
    const keys = (0, sg_core_1.generateKeyPair)();
    await fs.ensureDir(options.out);
    await fs.writeFile(path.join(options.out, "private.key"), keys.secretKey);
    await fs.writeFile(path.join(options.out, "public.key"), keys.publicKey);
    console.log("✅ Keys generated!");
    console.log(`Public Key: ${keys.publicKey}`);
});
program.command("sign")
    .description("Sign a skill (file or directory) and generate a manifest")
    .argument("<target>", "Skill file (SKILL.md) or directory to sign")
    .option("-k, --key <file>", "Private key file", "private.key")
    .option("-n, --name <name>", "Skill name")
    .option("-v, --ver <version>", "Skill version", "1.0.0")
    .option("-p, --perms <perms...>", "Permissions (e.g. fs.read net.fetch)", [])
    .action(async (target, options) => {
    try {
        const stat = await fs.stat(target);
        const secretKey = await fs.readFile(options.key, "utf-8");
        const pubKeyPath = options.key.replace("private", "public");
        const publicKey = await fs.readFile(pubKeyPath, "utf-8");
        let signingTarget;
        let fileNameOrRoot;
        if (stat.isDirectory()) {
            console.log(`📂 Scanning directory: ${target}`);
            signingTarget = await scanDirectory(target);
            fileNameOrRoot = ".";
            console.log(`   Found ${Object.keys(signingTarget).length} files.`);
        }
        else {
            console.log(`📄 Reading file: ${target}`);
            signingTarget = await fs.readFile(target, "utf-8");
            fileNameOrRoot = path.basename(target);
        }
        const manifest = (0, sg_core_1.signManifest)({
            schemaVersion: "1.0.0",
            name: options.name || path.basename(target),
            version: options.ver,
            author: { name: "unknown", publicKey: publicKey.trim() },
            permissions: options.perms
        }, signingTarget, fileNameOrRoot, secretKey.trim());
        const outputDir = stat.isDirectory() ? target : path.dirname(target);
        const manifestPath = path.join(outputDir, "manifest.json");
        await fs.writeJson(manifestPath, manifest, { spaces: 2 });
        console.log(`✅ Signed! Manifest written to ${manifestPath}`);
    }
    catch (e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
});
program.command("verify")
    .description("Verify a skill against its manifest and optional policy")
    .argument("<target>", "Skill file or directory")
    .argument("[manifest]", "Manifest file path (default: target/manifest.json)")
    .option("--policy <file>", "Policy file (JSON) to enforce")
    .option("--did <did>", "Author's DID to verify against (e.g. did:web:...)")
    .action(async (target, manifestPathArg, options) => {
    try {
        const stat = await fs.stat(target);
        let manifestPath = manifestPathArg;
        if (!manifestPath) {
            if (stat.isDirectory()) {
                manifestPath = path.join(target, "manifest.json");
            }
            else {
                // If target is SKILL.md, look in same dir
                manifestPath = path.join(path.dirname(target), "manifest.json");
            }
        }
        if (!await fs.pathExists(manifestPath)) {
            console.error(`❌ Manifest not found at: ${manifestPath}`);
            process.exit(1);
        }
        const manifest = await fs.readJson(manifestPath);
        let verifyTarget;
        if (stat.isDirectory()) {
            if (!('files' in manifest.integrity)) {
                console.error("❌ Manifest is V1 (Single-file) but you are verifying a directory. Point to a specific file.");
                process.exit(1);
            }
            console.log(`📂 Scanning directory for verification: ${target}`);
            verifyTarget = await scanDirectory(target);
        }
        else {
            // Target is a file. Manifest could be V1 or V2 (if file is part of V2 set).
            // Currently verifyManifest V2 expects full map.
            // If user points to SKILL.md but manifest is V2, verification will fail unless we scan parent dir.
            // Let's assume if manifest is V2, target MUST be the directory.
            // If user passed a file, we warn.
            if ('files' in manifest.integrity) {
                console.log("⚠️ Manifest is V2 (Directory). Assuming parent directory is the root.");
                const dir = path.dirname(target);
                verifyTarget = await scanDirectory(dir);
            }
            else {
                verifyTarget = await fs.readFile(target, "utf-8");
            }
        }
        // 1. Verify Integrity & Signature
        const valid = (0, sg_core_1.verifyManifest)(manifest, verifyTarget);
        if (!valid) {
            console.error("❌ FAILED: Invalid signature or integrity check.");
            process.exit(1);
        }
        // 1.5. Resolve DID (if provided)
        let policy = options.policy ? await fs.readJson(options.policy) : null;
        if (options.did) {
            console.log(`🔍 Resolving DID: ${options.did}...`);
            const publicKey = await (0, sg_core_1.resolveDID)(options.did);
            if (!publicKey) {
                console.error("❌ DID Resolution Failed: Could not find public key.");
                process.exit(1);
            }
            console.log(`✅ Resolved DID to Public Key: ${publicKey}`);
            // Auto-generate or extend policy
            if (!policy) {
                policy = { trustedKeys: [publicKey], enforceVersionMatch: false };
            }
            else {
                policy.trustedKeys.push(publicKey);
            }
        }
        // 2. Verify Policy (if provided or generated from DID)
        if (policy) {
            const policyResult = (0, sg_core_1.checkPolicy)(manifest, policy);
            if (!policyResult.allowed) {
                console.error(`❌ POLICY DENIED: ${policyResult.reason}`);
                process.exit(1);
            }
            console.log("✅ POLICY PASSED");
        }
        console.log("✅ VERIFIED: Skill is safe to run.");
        console.log("Permissions:", manifest.permissions);
    }
    catch (e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
});
program.parse();
