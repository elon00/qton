import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { sha256_sync } from '@ton/crypto';
import { beginCell, Cell } from '@ton/core';

export interface QtonPqcProof {
    algorithm: 'NIST-FIPS-204-ML-DSA-65';
    publicKeyHex: string;
    signatureHex: string;
    action: string;
    payloadHashHex: string;
    timestamp: number;
}

export class QtonPqcGateway {
    private secretKey: Uint8Array;
    public publicKey: Uint8Array;

    constructor(seed?: Uint8Array) {
        const keys = ml_dsa65.keygen(seed);
        this.secretKey = keys.secretKey;
        this.publicKey = keys.publicKey;
    }

    public generateProofForAction(action: string, data: Record<string, any>): QtonPqcProof {
        const payloadStr = JSON.stringify({ action, data, timestamp: Date.now() });
        const payloadHash = sha256_sync(payloadStr);
        // Correct order: sign(msg, secretKey)
        const sig = ml_dsa65.sign(payloadHash, this.secretKey);

        return {
            algorithm: 'NIST-FIPS-204-ML-DSA-65',
            publicKeyHex: Buffer.from(this.publicKey).toString('hex'),
            signatureHex: Buffer.from(sig).toString('hex'),
            action,
            payloadHashHex: Buffer.from(payloadHash).toString('hex'),
            timestamp: Date.now(),
        };
    }

    public static verifyProof(proof: QtonPqcProof): boolean {
        try {
            const pubKey = Buffer.from(proof.publicKeyHex, 'hex');
            const sig = Buffer.from(proof.signatureHex, 'hex');
            const msgHash = Buffer.from(proof.payloadHashHex, 'hex');
            // Correct order: verify(sig, msg, publicKey)
            return ml_dsa65.verify(sig, msgHash, pubKey);
        } catch {
            return false;
        }
    }

    public buildTvmProofCell(proof: QtonPqcProof): Cell {
        return beginCell()
            .storeBuffer(Buffer.from(proof.payloadHashHex, 'hex'))
            .storeUint(proof.timestamp, 64)
            .endCell();
    }
}
