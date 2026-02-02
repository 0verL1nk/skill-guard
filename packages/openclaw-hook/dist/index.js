"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = __importDefault(require("node:fs/promises"));
const core_1 = require("@skill-guard/core");
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
    const workspaceDir = event.context.workspaceDir;
    if (!workspaceDir) {
        console.warn('[SkillGuard] No workspaceDir found in context. Skipping scan.');
        return;
    }
    const skillsDir = node_path_1.default.join(workspaceDir, 'skills');
    try {
        await scanAndVerifySkills(skillsDir);
    }
    catch (err) {
        console.error('[SkillGuard] Scan failed:', err);
    }
}
async function scanAndVerifySkills(dir) {
    let entries;
    try {
        entries = await promises_1.default.readdir(dir);
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            console.log(`[SkillGuard] Skills dir not found: ${dir}`);
            return;
        }
        throw err;
    }
    for (const entry of entries) {
        const skillPath = node_path_1.default.join(dir, entry);
        let stat;
        try {
            stat = await promises_1.default.stat(skillPath);
        }
        catch {
            continue;
        }
        if (stat.isDirectory()) {
            await checkSkill(skillPath, entry);
        }
    }
}
async function checkSkill(skillDir, skillName) {
    const skillMdPath = node_path_1.default.join(skillDir, 'SKILL.md');
    const manifestPath = node_path_1.default.join(skillDir, 'manifest.json');
    // Check if SKILL.md exists
    try {
        await promises_1.default.access(skillMdPath);
    }
    catch {
        // No SKILL.md, skip
        return;
    }
    // Check if manifest.json exists
    let hasManifest = false;
    try {
        await promises_1.default.access(manifestPath);
        hasManifest = true;
    }
    catch {
        hasManifest = false;
    }
    if (!hasManifest) {
        console.warn(`[SkillGuard] ⚠️  UNVERIFIED SKILL: "${skillName}" (missing manifest.json)`);
        return;
    }
    try {
        // Read files
        const skillContent = await promises_1.default.readFile(skillMdPath, 'utf-8');
        const manifestContent = await promises_1.default.readFile(manifestPath, 'utf-8');
        const manifestJson = JSON.parse(manifestContent);
        // Verify
        const isValid = (0, core_1.verifyManifest)(manifestJson, skillContent);
        if (isValid) {
            console.log(`[SkillGuard] ✅ Verified skill: "${skillName}"`);
        }
        else {
            console.error(`[SkillGuard] ❌ TAMPERED SKILL: "${skillName}" (signature invalid)`);
        }
    }
    catch (err) {
        console.error(`[SkillGuard] Error verifying "${skillName}":`, err);
    }
}
exports.default = handler;
