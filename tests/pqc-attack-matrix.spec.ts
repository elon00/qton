import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { QtonPqcGateway } from '../src/qton_pqc_gateway';

describe('NIST FIPS 204 ML-DSA-65 PQC Attack Matrix & Rejection Gate', () => {
    let gateway: QtonPqcGateway;
    let attackerGateway: QtonPqcGateway;

    beforeEach(() => {
        QtonPqcGateway.resetConsumedNonces();
        gateway = new QtonPqcGateway();
        attackerGateway = new QtonPqcGateway();
    });

    const standardAction = 'MINT_QTON_ALLOCATION';
    const standardData = {
        recipient: 'kQAJO_hgYMZq3ULuzFv7927z-WgsM0BApc0IRniDrHORT9_4',
        amount: '1000000000',
        purpose: 'TESTNET_DEV_ALLOCATION'
    };
    const standardContract = 'kQCI8yoRda7UzQSOOypvN_trGrzNb4tGmRR9N-S9LOG-wW58';

    it('[TEST 1] Valid ML-DSA-65 Signature & Matching Intent -> ACCEPT', () => {
        const proof = gateway.generateProofForAction(standardAction, standardData, {
            contractAddress: standardContract,
            chainId: -3,
        });

        const res = QtonPqcGateway.verifyIntentConjunction(proof, {
            action: standardAction,
            data: standardData,
            expectedSignerHex: Buffer.from(gateway.publicKey).toString('hex'),
            expectedContract: standardContract,
            expectedChainId: -3,
        });

        assert.strictEqual(res.valid, true);
        assert.strictEqual(res.rejectionReason, undefined);
    });

    it('[TEST 2] Modified Payload Hash / Tampered Signature -> REJECT', () => {
        const proof = gateway.generateProofForAction(standardAction, standardData);
        // Tamper signature by bit-flipping
        const tamperedSig = Buffer.from(proof.signatureHex, 'hex');
        tamperedSig[10] ^= 0xff;
        proof.signatureHex = tamperedSig.toString('hex');

        const res = QtonPqcGateway.verifyIntentConjunction(proof, {
            action: standardAction,
            data: standardData,
        });

        assert.strictEqual(res.valid, false);
        assert.strictEqual(res.rejectionReason, 'CRYPTOGRAPHIC_SIGNATURE_INVALID');
    });

    it('[TEST 3] Wrong Signer (Signed by attacker key) -> REJECT', () => {
        // Attacker creates proof with their own key
        const proof = attackerGateway.generateProofForAction(standardAction, standardData, {
            contractAddress: standardContract,
        });

        // Verification expects authorized gateway key
        const res = QtonPqcGateway.verifyIntentConjunction(proof, {
            action: standardAction,
            data: standardData,
            expectedSignerHex: Buffer.from(gateway.publicKey).toString('hex'),
            expectedContract: standardContract,
        });

        assert.strictEqual(res.valid, false);
        assert.strictEqual(res.rejectionReason, 'SIGNER_MISMATCH');
    });

    it('[TEST 4] Wrong Amount in Intent Data -> REJECT', () => {
        const proof = gateway.generateProofForAction(standardAction, standardData, {
            contractAddress: standardContract,
        });

        // Verifier checks for different amount (attacker tampered amount)
        const tamperedData = { ...standardData, amount: '9999999999' };
        const res = QtonPqcGateway.verifyIntentConjunction(proof, {
            action: standardAction,
            data: tamperedData,
            expectedContract: standardContract,
        });

        assert.strictEqual(res.valid, false);
        assert.strictEqual(res.rejectionReason, 'PAYLOAD_DATA_TAMPERED');
    });

    it('[TEST 5] Wrong Recipient Address in Intent Data -> REJECT', () => {
        const proof = gateway.generateProofForAction(standardAction, standardData, {
            contractAddress: standardContract,
        });

        // Verifier checks for different recipient
        const tamperedData = { ...standardData, recipient: '0QC2Lo6MZgFe-AYQX8QNrtUASqkk_Ka_Shiej2mmkHxLg49t' };
        const res = QtonPqcGateway.verifyIntentConjunction(proof, {
            action: standardAction,
            data: tamperedData,
            expectedContract: standardContract,
        });

        assert.strictEqual(res.valid, false);
        assert.strictEqual(res.rejectionReason, 'PAYLOAD_DATA_TAMPERED');
    });

    it('[TEST 6] Wrong Target Contract Address -> REJECT', () => {
        const proof = gateway.generateProofForAction(standardAction, standardData, {
            contractAddress: 'kQAHuKwr2EhHjjq4wG_xbUA7WtSw9j9OH9rfFrcBvxczgpmh', // Launchpad address
        });

        // Verifier expects Master address
        const res = QtonPqcGateway.verifyIntentConjunction(proof, {
            action: standardAction,
            data: standardData,
            expectedContract: standardContract, // Master address
        });

        assert.strictEqual(res.valid, false);
        assert.strictEqual(res.rejectionReason, 'CONTRACT_ADDRESS_MISMATCH');
    });

    it('[TEST 7] Replay Attack (Same proof presented twice) -> REJECT', () => {
        const proof = gateway.generateProofForAction(standardAction, standardData, {
            nonce: 8847291,
            contractAddress: standardContract,
        });

        // 1st presentation: ACCEPT
        const res1 = QtonPqcGateway.verifyIntentConjunction(proof, {
            action: standardAction,
            data: standardData,
            expectedContract: standardContract,
        });
        assert.strictEqual(res1.valid, true);

        // 2nd presentation (Replay attempt): MUST REJECT
        const res2 = QtonPqcGateway.verifyIntentConjunction(proof, {
            action: standardAction,
            data: standardData,
            expectedContract: standardContract,
        });
        assert.strictEqual(res2.valid, false);
        assert.strictEqual(res2.rejectionReason, 'NONCE_ALREADY_CONSUMED_REPLAY_ATTACK');
    });

    it('[TEST 8] Expired Proof (Past TTL deadline) -> REJECT', () => {
        const now = Date.now();
        const proof = gateway.generateProofForAction(standardAction, standardData, {
            contractAddress: standardContract,
            ttlMs: 5000, // 5 seconds validity
        });

        // Presented 10 seconds later
        const res = QtonPqcGateway.verifyIntentConjunction(proof, {
            action: standardAction,
            data: standardData,
            expectedContract: standardContract,
            now: now + 10_000,
        });

        assert.strictEqual(res.valid, false);
        assert.strictEqual(res.rejectionReason, 'PROOF_EXPIRED');
    });

    it('[TEST 9] Wrong Network / Chain ID (Mainnet replay on Testnet) -> REJECT', () => {
        const proof = gateway.generateProofForAction(standardAction, standardData, {
            contractAddress: standardContract,
            chainId: -239, // Mainnet chain ID
        });

        // Verifier runs on TON Testnet (-3)
        const res = QtonPqcGateway.verifyIntentConjunction(proof, {
            action: standardAction,
            data: standardData,
            expectedContract: standardContract,
            expectedChainId: -3,
        });

        assert.strictEqual(res.valid, false);
        assert.strictEqual(res.rejectionReason, 'CHAIN_ID_MISMATCH');
    });
});
