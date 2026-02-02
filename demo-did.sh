#!/bin/bash
set -e

echo "🔑 Step 1: Generating keys..."
node packages/cli/dist/index.js keygen --out ./keys
PUBKEY=$(cat ./keys/public.key)
echo "Generated PubKey: $PUBKEY"

echo ""
echo "🔧 Step 2: Configuring Mock DID Resolver with this key..."
# Replace the hardcoded key in source with the new one
sed -i "s|return \"1ZZgI.*|return \"$PUBKEY\";|" packages/core/src/index.ts

echo "📦 Step 3: Rebuilding Core to apply mock..."
# Only rebuild core for speed
npx turbo run build --filter=@skill-guard/core

echo ""
echo "📝 Step 4: Signing skill..."
echo "# DID Demo Skill" > did-skill.md
node packages/cli/dist/index.js sign did-skill.md --key ./keys/private.key --perms "net.fetch"

echo ""
echo "🌐 Step 5: Verifying with DID (did:web:github.com:0verL1nk)..."
node packages/cli/dist/index.js verify did-skill.md manifest.json --did did:web:github.com:0verL1nk

echo ""
echo "✨ DID Verification Success!"
