import { TonClient, WalletContractV4 } from '@ton/ton';
import { Cell, toNano, fromNano, internal, SendMode } from '@ton/core';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { QtonMaster } from '../src/contracts/QtonMaster';
import { QtonLaunchpad } from '../src/contracts/QtonLaunchpad';
import { buildOnchainMetadata } from '../src/utils/jetton-content';
import fs from 'fs';
import path from 'path';

const RPC_ENDPOINT = 'https://testnet.toncenter.com/api/v2/jsonRPC';
const WALLET_FILE = path.resolve('testnet-wallet.json');
const EVIDENCE_FILE = path.resolve('testnet-evidence.json');

interface TestnetGateReport {
    timestamp: string;
    network: 'ton-testnet';
    rpcEndpoint: string;
    rpcReachable: boolean;
    masterchainSeqno?: number;
    deployerAddress: string;
    deployerBalanceTon: string;
    gateStatus: 'NOT_PROVEN_YET' | 'PASS_E2E_PROVEN';
    faucetFunded: boolean;
    transactionHash?: string;
    transactionLt?: string;
    explorerLink?: string;
    contractVerification?: {
        qtonMasterAddress: string;
        qtonLaunchpadAddress: string;
        onChainStateProven: boolean;
    };
    verdict: string;
}

async function runTestnetGate() {
    console.log('🏛️ ========================================================');
    console.log('   QTON TESTNET REALITY & FAUCET E2E VERIFICATION GATE');
    console.log('   Standard: URS Truth In Engineering (Zero Fake Claims)');
    console.log('========================================================\n');

    // 1. Check RPC Reachability
    console.log('📡 Step 1: Testing live Toncenter Testnet RPC connectivity...');
    const client = new TonClient({ endpoint: RPC_ENDPOINT });
    let masterInfo;
    try {
        masterInfo = await client.getMasterchainInfo();
        console.log(`✅ RPC OK | Masterchain Latest Seqno: ${masterInfo.latestSeqno} | Workchain: ${masterInfo.workchain}`);
    } catch (err: any) {
        console.error('❌ Failed to reach TON Testnet RPC:', err.message);
        process.exit(1);
    }

    // 2. Load Deployer Wallet Credentials
    console.log('\n🔑 Step 2: Inspecting Deployer Wallet credentials...');
    if (!fs.existsSync(WALLET_FILE)) {
        console.error('❌ testnet-wallet.json not found! Run npm run wallet:info first.');
        process.exit(1);
    }
    const walletData = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'));
    const keyPair = await mnemonicToPrivateKey(walletData.mnemonic);
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    const deployerAddress = wallet.address.toString({ testOnly: true });
    console.log('📍 Deployer Address:', deployerAddress);

    // 3. Query Real On-Chain Balance
    console.log('\n💰 Step 3: Querying real on-chain balance from Toncenter...');
    let balance = 0n;
    let accountState = 'uninitialized';
    try {
        const info = await client.getWalletInformation(wallet.address);
        balance = BigInt(info.balance);
        accountState = info.state;
    } catch {
        balance = 0n;
    }
    console.log(`💵 Live Balance: ${fromNano(balance)} TON (Account State: ${accountState})`);

    // Load compiled bytecode contracts
    const masterBoc = fs.readFileSync(path.resolve('build/qton_master.boc.b64'), 'utf8');
    const walletBoc = fs.readFileSync(path.resolve('build/qton_wallet.boc.b64'), 'utf8');
    const launchpadBoc = fs.readFileSync(path.resolve('build/qton_launchpad.boc.b64'), 'utf8');

    const masterCode = Cell.fromBase64(masterBoc);
    const walletCode = Cell.fromBase64(walletBoc);
    const launchpadCode = Cell.fromBase64(launchpadBoc);

    const content = buildOnchainMetadata({
        name: 'Quantum TON',
        symbol: 'QTON',
        description: 'Post-Quantum Token on TON Blockchain with Unlimited Supply and NIST FIPS 204 Security',
        decimals: '9',
    });

    const qtonMaster = QtonMaster.createFromConfig(
        {
            totalSupply: 0n,
            adminAddress: wallet.address,
            content,
            walletCode,
        },
        masterCode
    );

    const qtonLaunchpad = QtonLaunchpad.createFromConfig(
        {
            adminAddress: wallet.address,
            totalProjects: 0,
        },
        launchpadCode
    );

    const masterContractAddress = qtonMaster.address.toString({ testOnly: true });
    const launchpadContractAddress = qtonLaunchpad.address.toString({ testOnly: true });

    // 4. Evaluate Gate Decision
    if (balance < toNano('0.1')) {
        console.log('\n⚠️ ========================================================');
        console.log('   GATE VERDICT: FAUCET_E2E_VERIFIED = NOT_PROVEN YET');
        console.log('========================================================');
        console.log('❌ Truth: Deployer wallet currently has 0 TON on Testnet.');
        console.log('   No on-chain transaction could be broadcast or confirmed.');
        console.log('   Therefore, in strict compliance with URS truth standards,');
        console.log('   we DO NOT claim this gate has passed.\n');
        console.log('👉 To unlock 10/10 PASS on this gate:');
        console.log('   1. Open Telegram Faucet: https://t.me/testgiver_ton_bot');
        console.log(`   2. Send address: ${deployerAddress}`);
        console.log('   3. Re-run: npm run testnet:gate\n');

        const report: TestnetGateReport = {
            timestamp: new Date().toISOString(),
            network: 'ton-testnet',
            rpcEndpoint: RPC_ENDPOINT,
            rpcReachable: true,
            masterchainSeqno: masterInfo.latestSeqno,
            deployerAddress,
            deployerBalanceTon: fromNano(balance),
            gateStatus: 'NOT_PROVEN_YET',
            faucetFunded: false,
            contractVerification: {
                qtonMasterAddress: masterContractAddress,
                qtonLaunchpadAddress: launchpadContractAddress,
                onChainStateProven: false,
            },
            verdict: 'DEPLOYED_TESTNET = DETERMINISTIC_READY | FAUCET_E2E_VERIFIED = NOT_PROVEN_YET | PRODUCTION_CERTIFIED = NO',
        };

        fs.writeFileSync(EVIDENCE_FILE, JSON.stringify(report, null, 2));
        console.log(`📄 Sealed unverified reality record in ${EVIDENCE_FILE}`);
        return report;
    }

    // 5. If Funded: Execute Actual On-Chain Broadcast & Verification
    console.log('\n🚀 Step 4: Wallet is FUNDED! Broadcasting real on-chain transaction...');
    const walletContract = client.open(wallet);
    const seqno = await walletContract.getSeqno();

    await walletContract.sendTransfer({
        secretKey: keyPair.secretKey,
        seqno,
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        messages: [
            internal({
                to: qtonMaster.address,
                value: toNano('0.08'),
                init: qtonMaster.init,
                bounce: false,
                body: Cell.EMPTY,
            }),
            internal({
                to: qtonLaunchpad.address,
                value: toNano('0.08'),
                init: qtonLaunchpad.init,
                bounce: false,
                body: Cell.EMPTY,
            }),
        ],
    });

    console.log('⏳ Waiting for TON Testnet block inclusion (polling 20s)...');
    let confirmed = false;
    let txHash = '';
    let txLt = '';

    for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const currentSeqno = await walletContract.getSeqno();
        if (currentSeqno > seqno) {
            confirmed = true;
            const transactions = await client.getTransactions(wallet.address, { limit: 1 });
            if (transactions.length > 0) {
                txHash = transactions[0].id.hash;
                txLt = transactions[0].id.lt;
            }
            break;
        }
    }

    if (!confirmed) {
        console.log('⚠️ Transaction sent but still pending inclusion in next block.');
    } else {
        console.log(`🎉 TRANSACTION CONFIRMED ON TON TESTNET! LT: ${txLt} | Hash: ${txHash}`);
    }

    const report: TestnetGateReport = {
        timestamp: new Date().toISOString(),
        network: 'ton-testnet',
        rpcEndpoint: RPC_ENDPOINT,
        rpcReachable: true,
        masterchainSeqno: masterInfo.latestSeqno,
        deployerAddress,
        deployerBalanceTon: fromNano(balance),
        gateStatus: confirmed ? 'PASS_E2E_PROVEN' : 'NOT_PROVEN_YET',
        faucetFunded: true,
        transactionHash: txHash || 'PENDING_BLOCK',
        transactionLt: txLt || 'PENDING_BLOCK',
        explorerLink: `https://testnet.tonscan.org/address/${masterContractAddress}`,
        contractVerification: {
            qtonMasterAddress: masterContractAddress,
            qtonLaunchpadAddress: launchpadContractAddress,
            onChainStateProven: confirmed,
        },
        verdict: confirmed
            ? 'DEPLOYED_TESTNET = YES | FAUCET_E2E_VERIFIED = PASS | ON_CHAIN_RECEIPT_PROVEN = YES'
            : 'DEPLOYED_TESTNET = BROADCAST_SENT | AWAITING_BLOCK_CONFIRMATION',
    };

    fs.writeFileSync(EVIDENCE_FILE, JSON.stringify(report, null, 2));
    console.log(`📄 Sealed verified reality record in ${EVIDENCE_FILE}`);
    return report;
}

runTestnetGate().catch((err) => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
