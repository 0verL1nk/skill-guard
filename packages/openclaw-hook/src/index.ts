import path from 'node:path';
import fs from 'node:fs/promises';
import { verifyManifest } from '@overlink/sg-core';

// Minimal type definition for OpenClaw Hook
type HookEvent = {
  type: string;
  action: string;
  context: {
    workspaceDir?: string;
    [key: string]: any;
  };
};

type HookHandler = (event: HookEvent) => Promise<void>;

const handler: HookHandler = async (event) => {
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

async function runScan(event: HookEvent) {
  console.log('[SkillGuard] Hook triggered. Scanning skills...');

  const workspaceDir = event.context.workspaceDir;
  if (!workspaceDir) {
    console.warn('[SkillGuard] No workspaceDir found in context. Skipping scan.');
    return;
  }

  const skillsDir = path.join(workspaceDir, 'skills');
  
  try {
    await scanAndVerifySkills(skillsDir);
  } catch (err) {
    console.error('[SkillGuard] Scan failed:', err);
  }
}

async function scanAndVerifySkills(dir: string) {
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      console.log(`[SkillGuard] Skills dir not found: ${dir}`);
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

async function checkSkill(skillDir: string, skillName: string) {
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  const manifestPath = path.join(skillDir, 'manifest.json');

  // Check if SKILL.md exists
  try {
    await fs.access(skillMdPath);
  } catch {
    // No SKILL.md, skip
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
    // Read files
    const skillContent = await fs.readFile(skillMdPath, 'utf-8');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifestJson = JSON.parse(manifestContent);
    
    // Verify
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

export default handler;
