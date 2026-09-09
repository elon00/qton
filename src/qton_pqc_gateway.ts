import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { sha256_sync } from '@ton/crypto';
import { beginCell, Cell } from '@ton/core';

export interface QtonPqcProof {
    algorithm: 'NIST-FIPS-204-ML-DSA-65';
    publicKeyHex: string;
    signatureHex: string;
    action: string;
    payloadHashHex: string;
    nonce: number;
    chainId: number;
    contractAddress: string;
    timestamp: number;
    expiresAt: number;
    data?: Record<string, any>;
}

export interface VerificationResult {
    valid: boolean;
    rejectionReason?: string;
    verifiedAt: number;
}

export class QtonPqcGateway {
    private secretKey: Uint8Array;
    public publicKey: Uint8Array;
    private static consumedNonces: Set<string> = new Set();

    constructor(seed?: Uint8Array) {
        const keys = ml_dsa65.keygen(seed);
        this.secretKey = keys.secretKey;
        this.publicKey = keys.publicKey;
    }

    public static canonicalizePayload(payload: {
        action: string;
        data: Record<string, any>;
        nonce: number;
        chainId: number;
        contractAddress: string;
        timestamp: number;
        expiresAt: number;
    }): Buffer {
        // Deterministic lexicographically sorted canonical JSON
        const sortedKeys = Object.keys(payload.data).sort();
        const sortedData: Record<string, any> = {};
        for (const k of sortedKeys) {
            sortedData[k] = payload.data[k];
        }

        const canonicalStr = JSON.stringify({
            action: payload.action,
            chainId: payload.chainId,
            contractAddress: payload.contractAddress.toLowerCase(),
            data: sortedData,
            expiresAt: payload.expiresAt,
            nonce: payload.nonce,
            timestamp: payload.timestamp,
        });

        return sha256_sync(canonicalStr);
    }

    public generateProofForAction(
        action: string,
        data: Record<string, any>,
        options: {
            nonce?: number;
            chainId?: number;
            contractAddress?: string;
            ttlMs?: number;
        } = {}
    ): QtonPqcProof {
        const timestamp = Date.now();
        const nonce = options.nonce ?? Math.floor(Math.random() * 1_000_000_000);
        const chainId = options.chainId ?? -3; // Default TON Testnet (-3)
        const contractAddress = options.contractAddress ?? 'kQCI8yoRda7UzQSOOypvN_trGrzNb4tGmRR9N-S9LOG-wW58';
        const expiresAt = timestamp + (options.ttlMs ?? 300_000); // 5 min default expiry

        const payloadHash = QtonPqcGateway.canonicalizePayload({
            action,
            data,
            nonce,
            chainId,
            contractAddress,
            timestamp,
            expiresAt,
        });

        const sig = ml_dsa65.sign(payloadHash, this.secretKey);

        return {
            algorithm: 'NIST-FIPS-204-ML-DSA-65',
            publicKeyHex: Buffer.from(this.publicKey).toString('hex'),
            signatureHex: Buffer.from(sig).toString('hex'),
            action,
            payloadHashHex: Buffer.from(payloadHash).toString('hex'),
            nonce,
            chainId,
            contractAddress,
            timestamp,
            expiresAt,
            data,
        };
    }

    public static verifyProof(proof: QtonPqcProof): boolean {
        try {
            const pubKey = Buffer.from(proof.publicKeyHex, 'hex');
            const sig = Buffer.from(proof.signatureHex, 'hex');
            const msgHash = Buffer.from(proof.payloadHashHex, 'hex');
            return ml_dsa65.verify(sig, msgHash, pubKey);
        } catch {
            return false;
        }
    }

    public static verifyIntentConjunction(
        proof: QtonPqcProof,
        expected: {
            action: string;
            data: Record<string, any>;
            expectedSignerHex?: string;
            expectedContract?: string;
            expectedChainId?: number;
            now?: number;
        }
    ): VerificationResult {
        const now = expected.now ?? Date.now();

        // 1. Signature cryptographic check
        if (!QtonPqcGateway.verifyProof(proof)) {
            return { valid: false, rejectionReason: 'CRYPTOGRAPHIC_SIGNATURE_INVALID', verifiedAt: now };
        }

        // 2. Action match
        if (proof.action !== expected.action) {
            return { valid: false, rejectionReason: 'ACTION_MISMATCH', verifiedAt: now };
        }

        // 3. Expected signer match
        if (expected.expectedSignerHex && proof.publicKeyHex.toLowerCase() !== expected.expectedSignerHex.toLowerCase()) {
            return { valid: false, rejectionReason: 'SIGNER_MISMATCH', verifiedAt: now };
        }

        // 4. Chain ID match
        const expectedChain = expected.expectedChainId ?? -3;
        if (proof.chainId !== expectedChain) {
            return { valid: false, rejectionReason: 'CHAIN_ID_MISMATCH', verifiedAt: now };
        }

        // 5. Contract address match
        if (expected.expectedContract && proof.contractAddress.toLowerCase() !== expected.expectedContract.toLowerCase()) {
            return { valid: false, rejectionReason: 'CONTRACT_ADDRESS_MISMATCH', verifiedAt: now };
        }

        // 6. Expiry check
        if (now > proof.expiresAt) {
            return { valid: false, rejectionReason: 'PROOF_EXPIRED', verifiedAt: now };
        }

        // 7. Nonce Replay check
        const nonceKey = `${proof.publicKeyHex}:${proof.nonce}`;
        if (QtonPqcGateway.consumedNonces.has(nonceKey)) {
            return { valid: false, rejectionReason: 'NONCE_ALREADY_CONSUMED_REPLAY_ATTACK', verifiedAt: now };
        }

        // 8. Payload Hash Integrity check
        const expectedHash = QtonPqcGateway.canonicalizePayload({
            action: expected.action,
            data: expected.data,
            nonce: proof.nonce,
            chainId: proof.chainId,
            contractAddress: proof.contractAddress,
            timestamp: proof.timestamp,
            expiresAt: proof.expiresAt,
        });

        if (proof.payloadHashHex !== Buffer.from(expectedHash).toString('hex')) {
            return { valid: false, rejectionReason: 'PAYLOAD_DATA_TAMPERED', verifiedAt: now };
        }

        // Consume nonce upon successful verification
        QtonPqcGateway.consumedNonces.add(nonceKey);

        return { valid: true, verifiedAt: now };
    }

    public static resetConsumedNonces(): void {
        QtonPqcGateway.consumedNonces.clear();
    }

    public buildTvmProofCell(proof: QtonPqcProof): Cell {
        return beginCell()
            .storeBuffer(Buffer.from(proof.payloadHashHex, 'hex'))
            .storeUint(proof.timestamp, 64)
            .storeUint(proof.nonce, 64)
            .endCell();
    }
}
