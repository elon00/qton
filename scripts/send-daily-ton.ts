import { TonClient, WalletContractV4 } from '@ton/ton';
import { Address, toNano, fromNano, internal, SendMode, beginCell } from '@ton/core';
import { mnemonicToPrivateKey } from '@ton/crypto';
import fs from 'fs';
import path from 'path';

const RPC_ENDPOINT = 'https://testnet.toncenter.com/api/v2/jsonRPC';
const WALLET_FILE = path.resolve('testnet-wallet.json');

// User's personal testnet wallet
const USER_TESTNET_ADDRESS = '0:093bf86060c66add42eecc5bfbf76ef3f9682c334040a5cd08467883ac73914f';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function retryTonCall<T>(fn: () => Promise<T>, retries = 6, delay = 2000): Promise<T> {
    for (let i = 0; i < retries; i++) {
        try {
            await sleep(1500); // Respect free-tier rate limit of Toncenter (1 req / sec)
            return await fn();
        } catch (err: any) {
            if (err?.response?.status === 429 || err?.message?.includes('429') || err?.message?.includes('Ratelimit')) {
                console.log(`   ⚠️ Toncenter rate-limit (429) hit, backing off ${delay / 1000}s... (attempt ${i + 1}/${retries})`);
                await sleep(delay);
                delay *= 1.5;
            } else {
                throw err;
            }
        }
    }
    throw new Error('Exceeded maximum retries for Toncenter RPC');
}

async function main() {
    console.log('💎 Initiating 1.0 TON transfer to user wallet...');
    const client = new TonClient({ endpoint: RPC_ENDPOINT });

    let mnemonic: string[] | null = null;

    if (process.env.TESTNET_WALLET_MNEMONIC) {
        try {
            const parsed = JSON.parse(process.env.TESTNET_WALLET_MNEMONIC);
            mnemonic = parsed.mnemonic || parsed;
        } catch {
            mnemonic = process.env.TESTNET_WALLET_MNEMONIC.trim().split(/\s+/);
        }
    } else if (fs.existsSync(WALLET_FILE)) {
        const walletData = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'));
        mnemonic = walletData.mnemonic;
    } else if (fs.existsSync('testnet-wallet.example.json')) {
        const exampleData = JSON.parse(fs.readFileSync('testnet-wallet.example.json', 'utf8'));
        mnemonic = exampleData.mnemonic;
    }

    if (!mnemonic || !Array.isArray(mnemonic) || mnemonic.length < 12) {
        console.warn('⚠️ No valid mnemonic credentials provided. Set TESTNET_WALLET_MNEMONIC secret.');
        console.log('Automaton standby complete.');
        return;
    }

    const keyPair = await mnemonicToPrivateKey(mnemonic);
    const deployerWallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    const deployerContract = client.open(deployerWallet);

    const recipient = Address.parse(USER_TESTNET_ADDRESS);
    const recipientFriendly = recipient.toString({ bounceable: false, testOnly: true });

    console.log('📍 Sender Deployer:   ', deployerWallet.address.toString({ testOnly: true }));
    console.log('📍 Recipient Wallet:  ', recipientFriendly);

    let balance = 0n;
    try {
        balance = await retryTonCall(() => client.getBalance(deployerWallet.address));
        console.log('💰 Deployer Balance:  ', fromNano(balance), 'TON');
    } catch (err: any) {
        console.warn('⚠️ Failed to fetch deployer balance:', err?.message);
    }

    if (balance < toNano('1.05')) {
        console.log('ℹ️ Notice: Deployer balance is', fromNano(balance), 'TON (< 1.05 TON required).');
        console.log('👉 To fund testnet wallet: https://t.me/testgiver_ton_bot with address:', deployerWallet.address.toString({ testOnly: true }));
        console.log('Automaton completed check in standby mode (Exit 0).');
        return;
    }

    const seqno = await retryTonCall(() => deployerContract.getSeqno());
    console.log('🔢 Current Seqno:     ', seqno);

    // Comment memo cell
    const memoBody = beginCell()
        .storeUint(0, 32) // text comment flag
        .storeStringTail('Daily 1 TON Drip to QTON Creator')
        .endCell();

    console.log('📡 Broadcasting 1.0 TON transfer on TON Testnet...');
    await retryTonCall(() =>
        deployerContract.sendTransfer({
            secretKey: keyPair.secretKey,
            seqno,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            messages: [
                internal({
                    to: recipient,
                    value: toNano('1.0'),
                    bounce: false,
                    body: memoBody,
                }),
            ],
        })
    );

    console.log('⏳ Polling for block inclusion...');
    let confirmed = false;
    let txHash = '';
    let txLt = '';

    for (let i = 0; i < 10; i++) {
        await sleep(3500);
        let curSeqno = 0;
        try {
            curSeqno = await retryTonCall(() => deployerContract.getSeqno());
        } catch {
            curSeqno = 0;
        }
        console.log(`   ... Poll [${i + 1}/10] -> Seqno: ${curSeqno}`);
        if (curSeqno > seqno) {
            confirmed = true;
            try {
                const txs = await retryTonCall(() => client.getTransactions(deployerWallet.address, { limit: 1 }));
                if (txs.length > 0) {
                    txHash = txs[0].id.hash;
                    txLt = txs[0].id.lt;
                }
            } catch (e: any) {
                console.log('   Tx detail fetch note:', e.message);
            }
            break;
        }
    }

    if (confirmed) {
        console.log('\n======================================================');
        console.log('🎉 1.0 TON TRANSFERRED TO YOUR WALLET SUCCESSFULLY!');
        console.log('======================================================');
        console.log('📍 Recipient Wallet: ', recipientFriendly);
        console.log('💰 Transferred:      1.0 TON');
        if (txHash) {
            console.log('🔗 Tx Hash:          ', txHash);
            console.log('🔢 Tx LT:            ', txLt);
        }
        console.log('🌐 View Recipient:   ', `https://testnet.tonscan.org/address/${recipientFriendly}`);
        console.log('======================================================\n');
    } else {
        console.log('⚠️ Transfer broadcasted, waiting for confirmation on testnet.');
    }
}

main().catch(err => {
    console.error('Transfer failed:', err);
    process.exit(1);
});
