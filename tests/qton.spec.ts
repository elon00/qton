import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, Address } from '@ton/core';
import { QtonMaster } from '../src/contracts/QtonMaster';
import { QtonWallet } from '../src/contracts/QtonWallet';
import { QtonLaunchpad } from '../src/contracts/QtonLaunchpad';
import { buildOnchainMetadata } from '../src/utils/jetton-content';
import { QtonPqcGateway } from '../src/qton_pqc_gateway';
import { ConwayAutomatonAI } from '../src/automaton/conway_ai';
import { QtonAgenticChatbot } from '../src/agentics/multi_model_chatbot';
import { QtonQrEngine } from '../src/utils/qr_generator';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import test, { describe, it, before } from 'node:test';

describe('QTON (Quantum TON) Full System & TVM Architecture Tests', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let alice: SandboxContract<TreasuryContract>;
    let bob: SandboxContract<TreasuryContract>;
    let qtonMaster: SandboxContract<QtonMaster>;
    let qtonLaunchpad: SandboxContract<QtonLaunchpad>;
    let masterCode: Cell;
    let walletCode: Cell;
    let launchpadCode: Cell;

    before(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        alice = await blockchain.treasury('alice');
        bob = await blockchain.treasury('bob');

        // Load compiled BOC bytecodes
        const masterBoc = fs.readFileSync(path.resolve('build/qton_master.boc.b64'), 'utf8');
        const walletBoc = fs.readFileSync(path.resolve('build/qton_wallet.boc.b64'), 'utf8');
        const launchpadBoc = fs.readFileSync(path.resolve('build/qton_launchpad.boc.b64'), 'utf8');
        masterCode = Cell.fromBase64(masterBoc);
        walletCode = Cell.fromBase64(walletBoc);
        launchpadCode = Cell.fromBase64(launchpadBoc);

        const content = buildOnchainMetadata({
            name: 'Quantum TON',
            symbol: 'QTON',
            description: 'Post-Quantum Token on TON Blockchain with Unlimited Supply and NIST FIPS 204 Security',
            decimals: '9',
        });

        // Deploy QTON Master
        qtonMaster = blockchain.openContract(
            QtonMaster.createFromConfig(
                {
                    totalSupply: 0n,
                    adminAddress: deployer.address,
                    content,
                    walletCode,
                },
                masterCode
            )
        );
        const masterDeployRes = await qtonMaster.sendDeploy(deployer.getSender(), toNano('0.5'));
        assert.strictEqual(masterDeployRes.transactions.length > 0, true, 'Master deployment must produce txs');

        // Deploy QTON Launchpad
        qtonLaunchpad = blockchain.openContract(
            QtonLaunchpad.createFromConfig(
                {
                    adminAddress: deployer.address,
                    totalProjects: 0,
                },
                launchpadCode
            )
        );
        const launchpadDeployRes = await qtonLaunchpad.sendDeploy(deployer.getSender(), toNano('0.5'));
        assert.strictEqual(launchpadDeployRes.transactions.length > 0, true, 'Launchpad deployment must produce txs');
    });

    // 1. Unlimited Supply Tests
    it('Pillar 1: should deploy QtonMaster with 0 initial supply and unlimited (mintable) mode', async () => {
        const data = await qtonMaster.getJettonData();
        assert.strictEqual(data.totalSupply, 0n, 'Initial supply must be 0');
        assert.strictEqual(data.mintable, true, 'Mintable must be true for Unlimited Supply');
        assert.strictEqual(data.adminAddress.equals(deployer.address), true, 'Admin must match deployer');
    });

    it('Pillar 1: should mint 1,000,000,000 QTON to Alice (first mint)', async () => {
        const mintAmount = toNano('1000000000');
        await qtonMaster.sendMint(deployer.getSender(), {
            toAddress: alice.address,
            jettonAmount: mintAmount,
            forwardTonAmount: toNano('0.05'),
            totalTonAmount: toNano('0.2'),
        });

        const masterData = await qtonMaster.getJettonData();
        assert.strictEqual(masterData.totalSupply, mintAmount, 'Total supply should equal 1B QTON');

        const aliceWalletAddress = await qtonMaster.getWalletAddress(alice.address);
        const aliceWallet = blockchain.openContract(QtonWallet.createFromAddress(aliceWalletAddress));
        const aliceData = await aliceWallet.getWalletData();
        assert.strictEqual(aliceData.balance, mintAmount, 'Alice balance must equal 1B QTON');
    });

    it('Pillar 1: should mint additional 500,000,000 QTON to Bob proving Unlimited Supply expansion', async () => {
        const mintAmountBob = toNano('500000000');
        await qtonMaster.sendMint(deployer.getSender(), {
            toAddress: bob.address,
            jettonAmount: mintAmountBob,
            forwardTonAmount: toNano('0.05'),
            totalTonAmount: toNano('0.2'),
        });

        const masterData = await qtonMaster.getJettonData();
        assert.strictEqual(masterData.totalSupply, toNano('1500000000'), 'Supply should dynamically expand to 1.5B QTON');
    });

    it('Pillar 1: should transfer 200,000,000 QTON from Alice to Bob via Jetton Wallet', async () => {
        const aliceWalletAddress = await qtonMaster.getWalletAddress(alice.address);
        const aliceWallet = blockchain.openContract(QtonWallet.createFromAddress(aliceWalletAddress));

        await aliceWallet.sendTransfer(alice.getSender(), {
            toAddress: bob.address,
            jettonAmount: toNano('200000000'),
            forwardTonAmount: toNano('0.05'),
            totalTonAmount: toNano('0.2'),
        });

        const aliceData = await aliceWallet.getWalletData();
        assert.strictEqual(aliceData.balance, toNano('800000000'), 'Alice balance should be 800M');

        const bobWalletAddress = await qtonMaster.getWalletAddress(bob.address);
        const bobWallet = blockchain.openContract(QtonWallet.createFromAddress(bobWalletAddress));
        const bobData = await bobWallet.getWalletData();
        assert.strictEqual(bobData.balance, toNano('700000000'), 'Bob balance should be 700M');
    });

    it('Pillar 1 (Invariant): should reject unauthorized mint from non-admin with exit code 73', async () => {
        const unauthRes = await qtonMaster.sendMint(alice.getSender(), {
            toAddress: alice.address,
            jettonAmount: toNano('1000'),
            forwardTonAmount: toNano('0.05'),
            totalTonAmount: toNano('0.2'),
        });
        const computePhase = (unauthRes.transactions[1].description as any).computePhase;
        assert.strictEqual(computePhase.exitCode, 73, 'Unauthorized mint must throw error code 73');
    });

    it('Pillar 1 (Invariant): should reject transfer when amount exceeds balance with exit code 705', async () => {
        const aliceWalletAddress = await qtonMaster.getWalletAddress(alice.address);
        const aliceWallet = blockchain.openContract(QtonWallet.createFromAddress(aliceWalletAddress));
        const overdraftRes = await aliceWallet.sendTransfer(alice.getSender(), {
            toAddress: bob.address,
            jettonAmount: toNano('900000000'), // Alice only has 800M
            forwardTonAmount: toNano('0.05'),
            totalTonAmount: toNano('0.2'),
        });
        const computePhase = (overdraftRes.transactions[1].description as any).computePhase;
        assert.strictEqual(computePhase.exitCode, 705, 'Overdraft transfer must throw error code 705');
    });

    it('Pillar 1 (Invariant): should reject transfer when sender is not wallet owner with exit code 706', async () => {
        const aliceWalletAddress = await qtonMaster.getWalletAddress(alice.address);
        const aliceWallet = blockchain.openContract(QtonWallet.createFromAddress(aliceWalletAddress));
        const wrongSenderRes = await aliceWallet.sendTransfer(bob.getSender(), {
            toAddress: bob.address,
            jettonAmount: toNano('100'),
            forwardTonAmount: toNano('0.05'),
            totalTonAmount: toNano('0.2'),
        });
        const computePhase = (wrongSenderRes.transactions[1].description as any).computePhase;
        assert.strictEqual(computePhase.exitCode, 706, 'Unauthorized sender must throw error code 706');
    });

    it('Pillar 1 (Invariant): should verify supply conservation invariant (total_supply === sum of balances)', async () => {
        const masterData = await qtonMaster.getJettonData();
        const aliceWalletAddress = await qtonMaster.getWalletAddress(alice.address);
        const aliceWallet = blockchain.openContract(QtonWallet.createFromAddress(aliceWalletAddress));
        const aliceData = await aliceWallet.getWalletData();
        const bobWalletAddress = await qtonMaster.getWalletAddress(bob.address);
        const bobWallet = blockchain.openContract(QtonWallet.createFromAddress(bobWalletAddress));
        const bobData = await bobWallet.getWalletData();
        assert.strictEqual(masterData.totalSupply, aliceData.balance + bobData.balance, 'Total supply must exactly match sum of all circulating balances');
    });

    // 2. Conway Automaton AI Tests
    it('Pillar 2: should execute Conway Automaton AI generation steps and calculate entropy', async () => {
        const automaton = new ConwayAutomatonAI(16, 16, 'deadbeefcafe0123456789abcdef0123456789abcdef0123456789abcdef0123');
        const state1 = automaton.step();
        assert.strictEqual(state1.generation, 1);
        assert.strictEqual(state1.width, 16);
        assert.strictEqual(state1.height, 16);
        assert.strictEqual(typeof state1.livingCells, 'number');
        assert.strictEqual(typeof state1.emissionFactor, 'number');

        const state2 = automaton.step();
        assert.strictEqual(state2.generation, 2);

        const ascii = automaton.renderAscii();
        assert.strictEqual(ascii.includes('🟩') || ascii.includes('⬛'), true, 'ASCII representation must contain grid blocks');
    });

    // 3. NIST FIPS 204 PQC Tests
    it('Pillar 3: should generate and verify NIST FIPS 204 ML-DSA-65 Post-Quantum Signatures', async () => {
        const pqcGateway = new QtonPqcGateway();
        const proof = pqcGateway.generateProofForAction('MINT_UNLIMITED_QTON', {
            target: alice.address.toString(),
            amount: '1000000000000',
        });

        assert.strictEqual(proof.algorithm, 'NIST-FIPS-204-ML-DSA-65');
        const isValid = QtonPqcGateway.verifyProof(proof);
        assert.strictEqual(isValid, true, 'Valid ML-DSA-65 signature must verify');

        const tamperedProof = { ...proof, payloadHashHex: '0000' + proof.payloadHashHex.slice(4) };
        const isTamperedValid = QtonPqcGateway.verifyProof(tamperedProof);
        assert.strictEqual(isTamperedValid, false, 'Tampered ML-DSA-65 proof must fail verification');

        const tvmCell = pqcGateway.buildTvmProofCell(proof);
        assert.strictEqual(tvmCell.bits.length > 0, true, 'TVM proof cell must contain payload commitment');
    });

    // 4. AI Agentics Multi-Model Chatbot Tests
    it('Pillar 4: should process conversational intents and tool execution via Multi-Model Chatbot', async () => {
        const bot = new QtonAgenticChatbot('gemini');

        // 1. Conway Automaton query
        const resAutomaton = await bot.processUserMessage('run conway automaton ai simulation');
        assert.strictEqual(resAutomaton.toolCallsExecuted?.[0]?.name, 'conway_automaton_step');
        assert.strictEqual(resAutomaton.reply.includes('QTON Automaton AI'), true);

        // 2. PQC Verification query
        const resPqc = await bot.processUserMessage('verify pqc quantum proof for mint');
        assert.strictEqual(resPqc.toolCallsExecuted?.[0]?.name, 'verify_pqc_proof');
        assert.strictEqual(resPqc.reply.includes('ML-DSA-65 PQC Verified'), true);

        // 3. Switch model provider to Claude
        bot.setProvider('claude');
        const resGeneral = await bot.processUserMessage('hello');
        assert.strictEqual(resGeneral.provider, 'claude');
    });

    // 5. QTON Launchpad Contract Tests
    it('Pillar 5: should register and incubate projects on QtonLaunchpad', async () => {
        const initialCount = await qtonLaunchpad.getTotalProjects();
        assert.strictEqual(initialCount, 0, 'Initial launchpad projects count should be 0');

        const projectNameHash = 0x1234567890abcdefn;
        await qtonLaunchpad.sendCreateProject(alice.getSender(), {
            nameHash: projectNameHash,
            initialReserve: toNano('1.0'),
        });

        const updatedCount = await qtonLaunchpad.getTotalProjects();
        assert.strictEqual(updatedCount, 1, 'Total projects must increment to 1');
    });

    // 6. QR Code Engine Tests
    it('Pillar 6: should generate valid terminal and SVG QR codes for TON payments', async () => {
        const qr = await QtonQrEngine.generateTonTransferQr(
            deployer.address.toString(),
            toNano('5.0'),
            'QTON Ecosystem Contribution'
        );

        assert.strictEqual(qr.rawUrl.startsWith('ton://transfer/'), true);
        assert.strictEqual(qr.asciiTerminal.length > 0, true, 'Terminal QR must not be empty');
        assert.strictEqual(qr.svgString.includes('<svg'), true, 'SVG QR must contain svg tag');
        assert.strictEqual(qr.dataUrl.startsWith('data:image/png;base64,'), true, 'DataURL must be valid base64 PNG');
    });
});
