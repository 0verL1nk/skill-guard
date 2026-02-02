import { SkillManifest } from "@skill-guard/protocol";
export declare function generateKeyPair(): {
    publicKey: string;
    secretKey: string;
};
export declare function hashContent(content: string): string;
export declare function signManifest(partialManifest: Omit<SkillManifest, "signature" | "integrity">, fileContent: string, fileName: string, secretKeyB64: string): SkillManifest;
export declare function verifyManifest(manifest: SkillManifest, fileContent: string): boolean;
