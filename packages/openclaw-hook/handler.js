const path = require('node:path');
const fs = require('node:fs/promises');
// Use local copy of tweetnacl to avoid dependency issues in Gateway
const nacl = require('./tweetnacl.js');
const crypto = require('crypto');

// --- Core Logic (bundled from @skill-guard/core) ---

function hashContent(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

function verifyManifest(manifest, fileContent) {
    // 1. Verify Integrity (Hash)
    const currentHash = hashContent(fileContent);
    if (currentHash !== manifest.integrity.hash) {
        console.error("[SkillGuard] Hash mismatch: Content has been tampered with.");
        return false;
    }

    // 2. Verify Signature
    const payload = `${manifest.name}:${manifest.version}:${manifest.integrity.hash}`;
    // decodeUTF8 replacement
    const payloadBytes = new Uint8Array(Buffer.from(payload, 'utf8'));
    // decodeBase64 replacement
    const signatureBytes = new Uint8Array(Buffer.from(manifest.signature.value, 'base64'));
    
    try {
        // decodeBase64 replacement
        const publicKeyBytes = new Uint8Array(Buffer.from(manifest.author.publicKey, 'base64'));
        return nacl.sign.detached.verify(payloadBytes, signatureBytes, publicKeyBytes);
    } catch (e) {
        console.error("[SkillGuard] Invalid public key or signature format.");
        return false;
    }
}

// --- Hook Handler ---

const handler = async (event) => {
  // Run on gateway startup to scan initial skills
  if (event.type === 'gateway' && event.action === 'startup') {
    await runScan(event);
    return;
  }

  // Also run on agent bootstrap (when workspace is initialized)
  if (event.type === 'agent' && event.action === 'bootstrap') {
    await runScan(event);
    return;
  }
};

async function runScan(event) {
  console.log('[SkillGuard] Hook triggered. Scanning skills...');

  const workspaceDir = event.context?.workspaceDir;
  if (!workspaceDir) {
    // Fallback or skip
    return;
  }

  const skillsDir = path.join(workspaceDir, 'skills');
  
  try {
    await scanAndVerifySkills(skillsDir);
  } catch (err) {
    console.error('[SkillGuard] Scan failed:', err);
  }
}

async function scanAndVerifySkills(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return;
    }
    throw err;
  }

  for (const entry of entries) {
    const skillPath = path.join(dir, entry);
    let stat;
    try {
        stat = await fs.stat(skillPath);
    } catch {
        continue;
    }
    
    if (stat.isDirectory()) {
      await checkSkill(skillPath, entry);
    }
  }
}

async function checkSkill(skillDir, skillName) {
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  const manifestPath = path.join(skillDir, 'manifest.json');

  // Check if SKILL.md exists
  try {
    await fs.access(skillMdPath);
  } catch {
    return;
  }

  // Check if manifest.json exists
  let hasManifest = false;
  try {
    await fs.access(manifestPath);
    hasManifest = true;
  } catch {
    hasManifest = false;
  }

  if (!hasManifest) {
    console.warn(`[SkillGuard] ⚠️  UNVERIFIED SKILL: "${skillName}" (missing manifest.json)`);
    return;
  }

  try {
    const skillContent = await fs.readFile(skillMdPath, 'utf-8');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifestJson = JSON.parse(manifestContent);
    
    const isValid = verifyManifest(manifestJson, skillContent);
    
    if (isValid) {
      console.log(`[SkillGuard] ✅ Verified skill: "${skillName}"`);
    } else {
      console.error(`[SkillGuard] ❌ TAMPERED SKILL: "${skillName}" (signature invalid)`);
    }
  } catch (err) {
    console.error(`[SkillGuard] Error verifying "${skillName}":`, err);
  }
}

module.exports = handler;
