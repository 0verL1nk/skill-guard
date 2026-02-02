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
const core_1 = require("@skill-guard/core");
const program = new commander_1.Command();
program
    .name("sg")
    .description("SkillGuard CLI - Secure your Agent Skills")
    .version("0.1.0");
program.command("keygen")
    .description("Generate a new Ed25519 keypair")
    .option("-o, --out <dir>", "Output directory", ".")
    .action(async (options) => {
    const keys = (0, core_1.generateKeyPair)();
    await fs.ensureDir(options.out);
    await fs.writeFile(path.join(options.out, "private.key"), keys.secretKey);
    await fs.writeFile(path.join(options.out, "public.key"), keys.publicKey);
    console.log("✅ Keys generated!");
    console.log(`Public Key: ${keys.publicKey}`);
});
program.command("sign")
    .description("Sign a skill file and generate a manifest")
    .argument("<file>", "Skill file to sign (e.g., SKILL.md)")
    .option("-k, --key <file>", "Private key file", "private.key")
    .option("-n, --name <name>", "Skill name")
    .option("-v, --ver <version>", "Skill version", "1.0.0")
    .option("-p, --perms <perms...>", "Permissions (e.g. fs.read net.fetch)", [])
    .action(async (file, options) => {
    try {
        const content = await fs.readFile(file, "utf-8");
        const secretKey = await fs.readFile(options.key, "utf-8");
        // Derive public key (simulated here for simplicity, in reality derive from secret)
        // For now, we assume user provides author info or we'd load public key too.
        // Let's assume public.key is next to private.key
        const pubKeyPath = options.key.replace("private", "public");
        const publicKey = await fs.readFile(pubKeyPath, "utf-8");
        const manifest = (0, core_1.signManifest)({
            schemaVersion: "1.0.0",
            name: options.name || path.basename(file),
            version: options.ver,
            author: { name: "unknown", publicKey: publicKey.trim() },
            permissions: options.perms
        }, content, path.basename(file), secretKey.trim());
        await fs.writeJson("manifest.json", manifest, { spaces: 2 });
        console.log("✅ Signed! Manifest written to manifest.json");
    }
    catch (e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
});
program.command("verify")
    .description("Verify a skill against its manifest and optional policy")
    .argument("<file>", "Skill file")
    .argument("<manifest>", "Manifest file")
    .option("--policy <file>", "Policy file (JSON) to enforce")
    .action(async (file, manifestPath, options) => {
    try {
        const content = await fs.readFile(file, "utf-8");
        const manifest = await fs.readJson(manifestPath);
        // 1. Verify Integrity & Signature
        const valid = (0, core_1.verifyManifest)(manifest, content);
        if (!valid) {
            console.error("❌ FAILED: Invalid signature or integrity check.");
            process.exit(1);
        }
        // 2. Verify Policy (if provided)
        if (options.policy) {
            const policy = await fs.readJson(options.policy);
            const policyResult = (0, core_1.checkPolicy)(manifest, policy);
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
