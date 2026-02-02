import path from 'node:path';
import fs from 'node:fs/promises';
import { verifyManifest } from './packages/core/dist/index.js';
import * as naclUtil from 'tweetnacl-util';

async function scanAndVerifySkills(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch (err) {
    if (err.code === 'ENOENT') return;
    throw err;
  }

  for (const entry of entries) {
    const skillPath = path.join(dir, entry);
    const stat = await fs.stat(skillPath);
    
    if (stat.isDirectory()) {
      await checkSkill(skillPath, entry);
    }
  }
}

async function checkSkill(skillDir, skillName) {
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  const manifestPath = path.join(skillDir, 'manifest.json');

  try {
    await fs.access(skillMdPath);
  } catch {
    return;
  }

  let hasManifest = false;
  try {
    await fs.access(manifestPath);
    hasManifest = true;
  } catch {
    hasManifest = false;
  }

  if (!hasManifest) {
    console.log(`[SkillGuard] ⚠️  UNVERIFIED SKILL: "${skillName}" (missing manifest.json)`);
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
      console.log(`[SkillGuard] ❌ TAMPERED SKILL: "${skillName}" (signature invalid)`);
    }
  } catch (err) {
    console.error(`[SkillGuard] Error verifying "${skillName}":`, err);
  }
}

// Run on current workspace skills
const workspaceDir = process.env.HOME + '/.openclaw/workspace';
const skillsDir = path.join(workspaceDir, 'skills');
console.log(`Scanning ${skillsDir}...`);
scanAndVerifySkills(skillsDir);
