export interface PqcKeyPair {
  keyId: string;
  algorithm: 'ML-KEM-768' | 'ML-DSA-65' | 'Hybrid-Ed25519-Dilithium';
  publicKey: string;
  publicKeyFingerprint?: string;
  privateKeyPreview?: string;
  secretKey?: string;
  keySizeBits: number;
  nistSecurityLevel?: number;
  securityLevel?: number;
  createdAt?: string;
  generatedAt?: string;
  authorizedForAgent?: boolean;
}

export interface PqcProof {
  txId: string;
  payload: string;
  signature: string;
  algorithm: 'ML-DSA-65' | 'Hybrid-Ed25519-Dilithium';
  publicKey: string;
  timestamp: string;
  nistFipsStandard: string;
  verified: boolean;
}

export interface TonAiToolProfile {
  toolId: string;
  name: string;
  category: 'productivity' | 'automation' | 'creativity' | 'support' | 'quantum';
  pricing: string;
  learningCurve: 'Beginner' | 'Intermediate' | 'Advanced';
  verifiedByPqc: boolean;
  contractAddress: string;
  registrationTxHash: string;
}
