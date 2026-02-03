import path from 'node:path';
import fs from 'node:fs/promises';
import { verifyManifest, hashContent } from '@overlink/sg-core';

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

async function scanDirectory(dir: string, baseDir: string = dir): Promise<Record<string, string>> {
  const entries = await fs.readdir(dir);
  const results: Record<string, string> = {};
  for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/'); // Normalize path
      
      // Ignores
      if (['.git', 'node_modules', 'manifest.json', '.DS_Store'].includes(entry)) continue;
      
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
          const subResults = await scanDirectory(fullPath, baseDir);
          Object.assign(results, subResults);
      } else {
          const content = await fs.readFile(fullPath);
          results[relPath] = hashContent(content);
      }
  }
  return results;
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
  const manifestPath = path.join(skillDir, 'manifest.json');

  // Check if manifest.json exists
  try {
    await fs.access(manifestPath);
  } catch {
    // If no manifest, skip quietly or warn based on policy (default warn)
    console.warn(`[SkillGuard] ⚠️  UNVERIFIED SKILL: "${skillName}" (missing manifest.json)`);
    return;
  }

  try {
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifestJson = JSON.parse(manifestContent);
    
    let target: string | Record<string, string>;

    if ('files' in manifestJson.integrity) {
        // V2: Directory Integrity
        // Scan the directory to get current state
        target = await scanDirectory(skillDir);
    } else {
        // V1: Single File (SKILL.md)
        const skillMdPath = path.join(skillDir, 'SKILL.md');
        try {
            target = await fs.readFile(skillMdPath, 'utf-8');
        } catch {
            console.error(`[SkillGuard] ❌ BROKEN SKILL: "${skillName}" (V1 manifest requires SKILL.md)`);
            return;
        }
    }

    // Verify
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

export default handler;
