---
name: skill-guard
description: "Verifies integrity of Agent Skills using SkillGuard protocol"
metadata: { "openclaw": { "emoji": "🛡️", "events": ["gateway:startup", "agent:bootstrap"] } }
---

# SkillGuard Hook

Automatically scans your `skills/` directory on startup and verifies the cryptographic signature of every skill.

## What It Does

1. Scans `~/.openclaw/workspace/skills/`
2. Checks for `manifest.json` in each skill directory
3. Verifies that `SKILL.md` matches the signature in `manifest.json`
4. Logs warnings for unverified or tampered skills

## Usage

This hook runs automatically. Check the Gateway logs for verification results:

```
[SkillGuard] ✅ Verified skill: "my-secure-skill"
[SkillGuard] ⚠️  UNVERIFIED SKILL: "unknown-skill" (missing manifest.json)
[SkillGuard] ❌ TAMPERED SKILL: "hacked-skill" (signature invalid)
```
