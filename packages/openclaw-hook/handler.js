const path = require('node:path');
const fs = require('node:fs/promises');
// Use local copy of tweetnacl to avoid dependency issues in Gateway
const nacl = require('./tweetnacl.js');
const crypto = require('crypto');

// --- Core Logic (bundled from @overlink/sg-core) ---

function hashContent(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

function hashFileMap(files) {
    const sortedKeys = Object.keys(files).sort();
    const hash = crypto.createHash('sha256');
    for (const key of sortedKeys) {
        hash.update(`${key}:${files[key]}`);
    }
    return hash.digest('hex');
}

function verifyManifest(manifest, target) {
    let payloadHash;

    if ('files' in manifest.integrity) {
        // V2: Directory Map
        if (typeof target === 'string') {
            console.error("[SkillGuard] Manifest is V2 but target is string.");
            return false;
        }
        
        // Check strict equality of file maps
        for (const [path, hash] of Object.entries(manifest.integrity.files)) {
            if (target[path] !== hash) {
                console.error(`[SkillGuard] Integrity mismatch for ${path}`);
                return false;
            }
        }
        
        // Check for extra files
        if (Object.keys(target).length !== Object.keys(manifest.integrity.files).length) {
             console.error("[SkillGuard] Integrity mismatch: Extra or missing files.");
             return false;
        }

        payloadHash = hashFileMap(manifest.integrity.files);
    } else {
        // V1: Single File
        if (typeof target !== 'string') {
             console.error("[SkillGuard] Manifest is V1 but target is directory map.");
             return false;
        }
        const currentHash = hashContent(target);
        if (currentHash !== manifest.integrity.hash) {
            console.error("[SkillGuard] Hash mismatch: Content has been tampered with.");
            return false;
        }
        payloadHash = manifest.integrity.hash;
    }

    // 2. Verify Signature
    const payload = `${manifest.name}:${manifest.version}:${payloadHash}`;
    const payloadBytes = new Uint8Array(Buffer.from(payload, 'utf8'));
    const signatureBytes = new Uint8Array(Buffer.from(manifest.signature.value, 'base64'));
    
    try {
        const publicKeyBytes = new Uint8Array(Buffer.from(manifest.author.publicKey, 'base64'));
        return nacl.sign.detached.verify(payloadBytes, signatureBytes, publicKeyBytes);
    } catch (e) {
        console.error("[SkillGuard] Invalid public key or signature format.");
        return false;
    }
}

async function scanDirectory(dir, baseDir = dir) {
    let entries;
    try {
        entries = await fs.readdir(dir);
    } catch(e) { return {}; }
    
    const results = {};
    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        
        // Ignores
        if (['.git', 'node_modules', 'manifest.json', '.DS_Store'].includes(entry)) continue;
        
        let stat;
        try { stat = await fs.stat(fullPath); } catch(e) { continue; }

        if (stat.isDirectory()) {
            const subResults = await scanDirectory(fullPath, baseDir);
            Object.assign(results, subResults);
        } else {
            const content = await fs.readFile(fullPath); // Buffer
            results[relPath] = hashContent(content);
        }
    }
    return results;
}

// --- Hook Handler ---

const handler = async (event) => {
  if (event.type === 'gateway' && event.action === 'startup') {
    await runScan(event);
    return;
  }
  if (event.type === 'agent' && event.action === 'bootstrap') {
    await runScan(event);
    return;
  }
};

async function runScan(event) {
  console.log('[SkillGuard] Hook triggered. Scanning skills...');
  const workspaceDir = event.context?.workspaceDir;
  if (!workspaceDir) return;

  const skillsDir = path.join(workspaceDir, 'skills');
  try {
    await scanAndVerifySkills(skillsDir);
  } catch (err) {
    console.error('[SkillGuard] Scan failed:', err);
  }
}

async function scanAndVerifySkills(dir) {
  let entries;
  try { entries = await fs.readdir(dir); } 
  catch (err) { return; }

  for (const entry of entries) {
    const skillPath = path.join(dir, entry);
    let stat;
    try { stat = await fs.stat(skillPath); } catch { continue; }
    
    if (stat.isDirectory()) {
      await checkSkill(skillPath, entry);
    }
  }
}

async function checkSkill(skillDir, skillName) {
  const manifestPath = path.join(skillDir, 'manifest.json');
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
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifestJson = JSON.parse(manifestContent);
    
    let target;
    if ('files' in manifestJson.integrity) {
        // V2: Scan Directory
        target = await scanDirectory(skillDir);
    } else {
        // V1: Single File (Usually SKILL.md)
        const skillFile = manifestJson.integrity.file || 'SKILL.md';
        const skillFilePath = path.join(skillDir, skillFile);
        try {
            target = await fs.readFile(skillFilePath, 'utf-8');
        } catch(e) {
            console.error(`[SkillGuard] ❌ BROKEN SKILL: "${skillName}" (missing ${skillFile})`);
            return;
        }
    }

    const isValid = verifyManifest(manifestJson, target);
    
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
