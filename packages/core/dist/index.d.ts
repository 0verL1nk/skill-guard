import { SkillManifest } from "@skill-guard/protocol";
export declare function generateKeyPair(): {
    publicKey: string;
    secretKey: string;
};
export declare function hashContent(content: string): string;
export declare function signManifest(partialManifest: Omit<SkillManifest, "signature" | "integrity">, fileContent: string, fileName: string, secretKeyB64: string): SkillManifest;
export declare function verifyManifest(manifest: SkillManifest, fileContent: string): boolean;
export declare function checkPolicy(manifest: SkillManifest, policy: import("@skill-guard/protocol").Policy): {
    allowed: boolean;
    reason?: string;
};
export declare function resolveDID(did: string): Promise<string | null>;
