
# 1. Generate Keys
node packages/cli/dist/index.js keygen --out keys

# 2. Create a dummy skill
echo "# Super Skill" > super-tool.md
echo "This is a secure skill." >> super-tool.md

# 3. Sign it
# We simulate a "dev" signing it
node packages/cli/dist/index.js sign super-tool.md \
  --key keys/private.key \
  --name "super-tool" \
  --ver "1.0.0" \
  --perms "fs.read" "net.fetch"

echo "\n--- Generated Manifest ---"
cat manifest.json
echo "\n------------------------"

# 4. Verify (Should Pass)
echo "\n[Test 1] Verifying original..."
node packages/cli/dist/index.js verify super-tool.md manifest.json

# 5. Tamper (Should Fail)
echo "\n[Test 2] Tampering with skill..."
echo "HACKED CODE" >> super-tool.md
node packages/cli/dist/index.js verify super-tool.md manifest.json || echo "✅ Tamper detected!"
