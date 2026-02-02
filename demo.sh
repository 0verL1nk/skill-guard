#!/bin/bash
set -e

echo "🔑 Step 1: Generating key pair..."
node packages/cli/dist/index.js keygen --out ./keys

echo ""
echo "📝 Step 2: Creating demo skill..."
cat > demo-skill.md <<EOF
# Demo Skill
This is a sample skill for testing SkillGuard.
EOF

echo ""
echo "✍️ Step 3: Signing demo skill..."
node packages/cli/dist/index.js sign demo-skill.md --key ./keys/private.key --perms "fs.read" "net.fetch"

echo ""
echo "✅ Step 4: Verifying signature (no policy)..."
node packages/cli/dist/index.js verify demo-skill.md manifest.json

echo ""
echo "🛡️ Step 5: Creating strict policy (only allow fs.read)..."
PUBLIC_KEY=$(cat ./keys/public.key)
cat > strict-policy.json <<EOF
{
  "trustedKeys": ["$PUBLIC_KEY"],
  "maxPermissions": ["fs.read"],
  "enforceVersionMatch": false
}
EOF

echo ""
echo "❌ Step 6: Verifying with strict policy (should FAIL - skill has net.fetch)..."
node packages/cli/dist/index.js verify demo-skill.md manifest.json --policy strict-policy.json || echo "Expected failure: Skill requests forbidden permission."

echo ""
echo "✅ Step 7: Re-signing with only fs.read..."
node packages/cli/dist/index.js sign demo-skill.md --key ./keys/private.key --perms "fs.read"

echo ""
echo "✅ Step 8: Verifying with strict policy (should PASS)..."
node packages/cli/dist/index.js verify demo-skill.md manifest.json --policy strict-policy.json

echo ""
echo "✨ Demo complete! Policy enforcement works."
