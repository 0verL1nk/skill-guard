import { signManifest, generateKeyPair } from './packages/core/dist/index.js';
import fs from 'fs-extra';
import * as path from 'path';

// Minimal manifest
const manifest = {
    name: "test-signed",
    version: "1.0.0",
    description: "A signed test skill",
    permissions: [],
    author: {
        did: "did:test:123",
        publicKey: ""
    }
};

const skillContent = "# Test Signed Skill\n\nThis is a signed skill.";
const skillDir = path.join(process.env.HOME!, '.openclaw/workspace/skills/test-signed');

await fs.ensureDir(skillDir);

await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillContent);

// Generate Keys
const keys = generateKeyPair();
console.log("Public Key:", keys.publicKey);
console.log("Private Key:", keys.secretKey);
manifest.author.publicKey = keys.publicKey;

// Sign
const signedManifest = signManifest(manifest, skillContent, 'SKILL.md', keys.secretKey);

// Save keys for re-use
await fs.ensureDir(path.join(process.env.HOME!, '.openclaw/keys'));
await fs.writeFile(path.join(process.env.HOME!, '.openclaw/keys/public.key'), keys.publicKey);
await fs.writeFile(path.join(process.env.HOME!, '.openclaw/keys/private.key'), keys.secretKey);
console.log("Keys saved!");

await fs.writeJson(path.join(skillDir, 'manifest.json'), signedManifest, { spaces: 2 });

console.log('Created signed skill at', skillDir);

// Create unsigned skill
const unsignedDir = path.join(process.env.HOME!, '.openclaw/workspace/skills/test-unsigned');
await fs.ensureDir(unsignedDir);
await fs.writeFile(path.join(unsignedDir, 'SKILL.md'), "# Unsigned Skill\n\nI have no signature.");
console.log('Created unsigned skill at', unsignedDir);
