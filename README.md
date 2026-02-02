# SkillGuard (sg)

**The SSL for Agent Skills.**

SkillGuard establishes a chain of trust for AI Agent capabilities. It provides a standardized Manifest format, cryptographic signing (Ed25519), and runtime integrity verification for `SKILL.md` files.

## 🌟 Features

- **🛡️ Cryptographic Identity**: Every skill is signed by an author's private key.
- **📜 Manifest Protocol**: Standardized `manifest.json` defining permissions (`fs.read`, `net.fetch`) and versioning.
- **🔒 Tamper Proof**: Integrity checks ensuring the code you run is the code that was signed.
- **⚡ CLI Tool**: Easy-to-use `sg` command for developers.
- **🤖 OpenClaw Integration**: Native Hook that automatically verifies skills on gateway startup.

## 🚀 Usage

### 1. CLI Tool (Manual Verification)

**Installation**
```bash
npm install -g @overlink/sg-cli
```

**Workflow**
```bash
# 1. Generate Identity
sg keygen --out secrets

# 2. Sign a Skill
sg sign SKILL.md --key secrets/private.key --name "my-secure-skill" --perms "fs.read"
# -> Generates manifest.json

# 3. Verify
sg verify SKILL.md manifest.json
```

### 2. OpenClaw Integration (Automatic Protection)

SkillGuard provides a native hook for OpenClaw that scans your `skills/` directory on startup.

**Installation**
You can install the hook directly from npm (once OpenClaw supports npm hooks) or manually linking it for now.

**Manual Installation (Current Method):**
```bash
# Clone the repo
git clone https://github.com/0verL1nk/skill-guard.git
cd skill-guard

# Copy the hook to your managed hooks directory
mkdir -p ~/.openclaw/hooks/skill-guard
cp -r packages/openclaw-hook/handler.js packages/openclaw-hook/HOOK.md packages/openclaw-hook/tweetnacl.js ~/.openclaw/hooks/skill-guard/

# Restart Gateway
openclaw gateway restart
```

**How It Works**
- Runs automatically on `gateway:startup`.
- Scans `~/.openclaw/workspace/skills/`.
- Checks for `manifest.json` in each skill folder.
- **✅ Logs "Verified"** if the signature matches.
- **❌ Logs "TAMPERED"** if the file has been modified.
- **⚠️ Logs "UNVERIFIED"** if the manifest is missing.

## 🏗 Architecture

- **`@overlink/sg-protocol`**: Zod schemas for Manifests.
- **`@overlink/sg-core`**: Ed25519 signing & SHA-256 hashing logic.
- **`@overlink/sg-cli`**: The `sg` command-line interface.
- **`@overlink/sg-openclaw-hook`**: Native integration for OpenClaw Gateway.

## 🗺 Roadmap

- [x] **MVP**: Signing & Verification
- [x] **Policy Engine**: Trust list + Permission caps
- [x] **Identity System**: Support `did:web` for automatic key resolution
- [x] **OpenClaw Integration**: Native middleware to auto-verify skills
- [ ] **Key Rotation**: Update keys without breaking trust chains
- [ ] **Registry**: Decentralized lookup for Public Keys

## 📄 License

MIT
