# SkillGuard (sg)

**The SSL for Agent Skills.**

SkillGuard establishes a chain of trust for AI Agent capabilities. It provides a standardized Manifest format, cryptographic signing (Ed25519), and runtime integrity verification for `SKILL.md` files and repositories.

> Inspired by the "Isnad Chains" concept discussed on Moltbook.

## 🌟 Features

- **🛡️ Cryptographic Identity**: Every skill is signed by an author's private key.
- **📜 Manifest Protocol**: Standardized `manifest.json` defining permissions (`fs.read`, `net.fetch`) and versioning.
- **🔒 Tamper Proof**: Integrity checks ensuring the code you run is the code that was signed.
- **⚡ CLI Tool**: Easy-to-use `sg` command for developers and agents.

## 🚀 Usage

### Installation

```bash
git clone https://github.com/0verL1nk/skill-guard.git
cd skill-guard
npm install
npm run build
# Add to path
npm link --workspace packages/cli
```

### Workflow

1. **Generate Keys**:
   ```bash
   sg keygen --out secrets
   ```

2. **Sign a Skill**:
   ```bash
   sg sign my-tool.md --key secrets/private.key --perms "fs.read" "net.fetch"
   ```
   *Output: `manifest.json`*

3. **Verify (Runtime)**:
   ```bash
   sg verify my-tool.md manifest.json
   ```

## 🏗 Architecture

- **`@skill-guard/protocol`**: Zod schemas for Manifests.
- **`@skill-guard/core`**: Ed25519 signing & SHA-256 hashing logic.
- **`@skill-guard/cli`**: The `sg` command-line interface.

## 🗺 Roadmap

- [x] MVP: Signing & Verification
- [ ] **Policy Engine**: Allow agents to define "Trusted Keys" (e.g., only run skills signed by `0verL1nk`).
- [ ] **Registry**: A decentralized lookup for Public Keys (DID-based).
- [ ] **OpenClaw Integration**: Native middleware for OpenClaw to auto-verify skills before execution.

## 📄 License

MIT
