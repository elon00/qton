import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';
import { TonClient, WalletContractV4 } from '@ton/ton';
import { fromNano } from '@ton/core';
import { QtonQrEngine } from '../src/utils/qr_generator';
import fs from 'fs';
import path from 'path';

const WALLET_FILE = path.resolve('testnet-wallet.json');
const RPC_ENDPOINT = 'https://testnet.toncenter.com/api/v2/jsonRPC';

async function getOrCreateWallet(): Promise<{ mnemonic: string[]; keyPair: any; wallet: WalletContractV4 }> {
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
    console.log('🔍 Connecting to TON Testnet RPC...');
    const client = new TonClient({ endpoint: RPC_ENDPOINT });
    const { wallet } = await getOrCreateWallet();
    const address = wallet.address.toString({ testOnly: true });

    let balance = 0n;
    let state = 'uninitialized';
    try {
        const info = await client.getWalletInformation(wallet.address);
        balance = BigInt(info.balance);
        state = info.state;
    } catch (e: any) {
        // Uninitialized wallet returns empty
    }

    console.log('\n======================================================');
    console.log('💎 QTON TON TESTNET WALLET SUMMARY');
    console.log('======================================================');
    console.log('📍 Address (User-Friendly):', address);
    console.log('📍 Address (Raw):          ', wallet.address.toRawString());
    console.log('💰 Balance:                ', fromNano(balance), 'TON');
    console.log('📊 On-Chain State:         ', state);
    console.log('🌐 TonScan Explorer:       ', 'https://testnet.tonscan.org/address/' + address);
    console.log('🌐 Tonviewer:              ', 'https://testnet.tonviewer.com/' + address);
    console.log('======================================================\n');

    // Generate QR code
    const qr = await QtonQrEngine.generateTonTransferQr(address, undefined, 'Fund QTON Testnet Deployer');
    console.log('📱 SCAN TO FUND TESTNET WALLET VIA TONKEEPER / TELEGRAM:');
    console.log(qr.asciiTerminal);
    fs.writeFileSync(path.resolve('testnet_wallet_qr.svg'), qr.svgString);
    console.log('💾 QR Code SVG saved to testnet_wallet_qr.svg');

    console.log('\n🎁 NEED FREE TESTNET TON?');
    console.log('1. Open Telegram bot: https://t.me/testgiver_ton_bot');
    console.log('2. Send your address:', address);
    console.log('3. Receive 2.0 Free Testnet TON instantly!\n');
}

main().catch(err => {
    console.error('Wallet Info Error:', err);
    process.exit(1);
});
