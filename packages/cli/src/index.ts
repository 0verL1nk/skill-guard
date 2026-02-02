#!/usr/bin/env node
import { Command } from "commander";
import * as fs from "fs-extra";
import * as path from "path";
import { generateKeyPair, signManifest, verifyManifest } from "@skill-guard/core";

const program = new Command();

program
  .name("sg")
  .description("SkillGuard CLI - Secure your Agent Skills")
  .version("0.1.0");

program.command("keygen")
  .description("Generate a new Ed25519 keypair")
  .option("-o, --out <dir>", "Output directory", ".")
  .action(async (options) => {
    const keys = generateKeyPair();
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

        const manifest = signManifest({
            schemaVersion: "1.0.0",
            name: options.name || path.basename(file),
            version: options.ver,
            author: { name: "unknown", publicKey: publicKey.trim() },
            permissions: options.perms
        }, content, path.basename(file), secretKey.trim());

        await fs.writeJson("manifest.json", manifest, { spaces: 2 });
        console.log("✅ Signed! Manifest written to manifest.json");
    } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
    }
  });

program.command("verify")
  .description("Verify a skill against its manifest")
  .argument("<file>", "Skill file")
  .argument("<manifest>", "Manifest file")
  .action(async (file, manifestPath) => {
    try {
        const content = await fs.readFile(file, "utf-8");
        const manifest = await fs.readJson(manifestPath);
        
        const valid = verifyManifest(manifest, content);
        if (valid) {
            console.log("✅ VERIFIED: Skill integrity and signature are valid.");
            console.log("Permissions:", manifest.permissions);
        } else {
            console.error("❌ FAILED: Invalid signature or integrity check.");
            process.exit(1);
        }
    } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
    }
  });

program.parse();
