import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';
import { TonClient, WalletContractV4 } from '@ton/ton';
import { Cell, toNano, fromNano, internal, SendMode } from '@ton/core';
import { QtonMaster } from '../src/contracts/QtonMaster';
import { QtonLaunchpad } from '../src/contracts/QtonLaunchpad';
import { buildOnchainMetadata } from '../src/utils/jetton-content';
import { QtonQrEngine } from '../src/utils/qr_generator';
import fs from 'fs';
import path from 'path';

const WALLET_FILE = path.resolve('testnet-wallet.json');
const RPC_ENDPOINT = 'https://testnet.toncenter.com/api/v2/jsonRPC';

async function getOrCreateWallet() {
    let mnemonic: string[];
    if (fs.existsSync(WALLET_FILE)) {
        const data = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'));
        mnemonic = data.mnemonic;
    } else {
        mnemonic = await mnemonicNew(24);
        fs.writeFileSync(WALLET_FILE, JSON.stringify({ mnemonic, createdAt: new Date().toISOString() }, null, 2));
        console.log('⚡ Created new TON Testnet wallet credentials -> testnet-wallet.json');
    }
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    return { mnemonic, keyPair, wallet };
}

async function main() {
    console.log('🚀 Initiating QTON TON Testnet Deployment Engine...');
    console.log('🌐 RPC: ', RPC_ENDPOINT);

    const client = new TonClient({ endpoint: RPC_ENDPOINT });
    const { keyPair, wallet } = await getOrCreateWallet();
    const deployerAddress = wallet.address.toString({ testOnly: true });

    console.log('👤 Deployer Address:', deployerAddress);

    // Check Balance
    let balance = 0n;
    try {
        const info = await client.getWalletInformation(wallet.address);
        balance = BigInt(info.balance);
    } catch {
        balance = 0n;
    }

    console.log('💰 Current Testnet Balance:', fromNano(balance), 'TON');

    // Load Bytecodes
    const masterBoc = fs.readFileSync(path.resolve('build/qton_master.boc.b64'), 'utf8');
    const walletBoc = fs.readFileSync(path.resolve('build/qton_wallet.boc.b64'), 'utf8');
    const launchpadBoc = fs.readFileSync(path.resolve('build/qton_launchpad.boc.b64'), 'utf8');

    const masterCode = Cell.fromBase64(masterBoc);
    const walletCode = Cell.fromBase64(walletBoc);
    const launchpadCode = Cell.fromBase64(launchpadBoc);

    // Build Metadata
    const content = buildOnchainMetadata({
        name: 'Quantum TON',
        symbol: 'QTON',
        description: 'Post-Quantum Token on TON Blockchain with Unlimited Supply and NIST FIPS 204 Security',
        decimals: '9',
    });

    // Create contract instance
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

    console.log('\n======================================================');
    console.log('💎 DETERMINISTIC CONTRACT ADDRESSES COMPUTED');
    console.log('======================================================');
    console.log('⚡ QTON Jetton Master:    ', masterContractAddress);
    console.log('🚀 QTON Launchpad:        ', launchpadContractAddress);
    console.log('======================================================\n');

    // Save Deployment Record
    const deployRecord = {
        network: 'ton-testnet',
        rpcEndpoint: RPC_ENDPOINT,
        deployer: deployerAddress,
        contracts: {
            qtonMaster: {
                address: masterContractAddress,
                unlimitedSupply: true,
                explorer: 'https://testnet.tonscan.org/address/' + masterContractAddress,
                tonviewer: 'https://testnet.tonviewer.com/' + masterContractAddress,
            },
            qtonLaunchpad: {
                address: launchpadContractAddress,
                explorer: 'https://testnet.tonscan.org/address/' + launchpadContractAddress,
                tonviewer: 'https://testnet.tonviewer.com/' + launchpadContractAddress,
            }
        },
        updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(path.resolve('deployment-testnet.json'), JSON.stringify(deployRecord, null, 2));

    if (balance < toNano('0.1')) {
        console.log('⚠️ INSUFFICIENT TESTNET TON FOR ON-CHAIN TRANSACTION BROADCAST');
        console.log('Required: >= 0.1 TON | Available: ' + fromNano(balance) + ' TON');
        console.log('\n📱 SCAN THIS QR CODE WITH TONKEEPER / TELEGRAM TO FUND:');
        const qr = await QtonQrEngine.generateTonTransferQr(deployerAddress, toNano('1.0'), 'Fund QTON Deployer');
        console.log(qr.asciiTerminal);
        console.log('\n🎁 Instant Telegram Faucet: https://t.me/testgiver_ton_bot');
        console.log('Send "' + deployerAddress + '" to the bot to get 2.0 free Testnet TON.');
        console.log('\nRun npm run deploy:testnet immediately after claiming to broadcast on-chain!\n');
        return;
    }

    console.log('✅ Balance sufficient. Broadcasting deployment transaction on TON Testnet...');
    const walletContract = client.open(wallet);
    const seqno = await walletContract.getSeqno();

    // Deploy Master & Launchpad
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

    console.log('🎉 DEPLOYMENT TRANSACTION BROADCASTED TO TON TESTNET!');
    console.log('Explorer Link: https://testnet.tonscan.org/address/' + masterContractAddress);
    console.log('Tonviewer Link: https://testnet.tonviewer.com/' + masterContractAddress);
}

main().catch(err => {
    console.error('Deployment Error:', err);
    process.exit(1);
});
