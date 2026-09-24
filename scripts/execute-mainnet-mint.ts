import { mnemonicToPrivateKey } from '@ton/crypto';
import { TonClient, WalletContractV4 } from '@ton/ton';
import { Address, Cell, toNano, fromNano, internal, SendMode, beginCell } from '@ton/core';
import { QtonMaster } from '../src/contracts/QtonMaster';
import { buildOnchainMetadata } from '../src/utils/jetton-content';
import fs from 'fs';
import path from 'path';

const WALLET_FILE = path.resolve('mainnet-wallet.json');
const RPC_ENDPOINT = 'https://toncenter.com/api/v2/jsonRPC';
const USER_OWNER_ADDRESS = Address.parse('UQAJO_hgYMZq3ULuzFv7927z-WgsM0BApc0IRniDrHORTzm3');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 8, baseDelayMs = 3500): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const msg = err?.message || String(err);
      if ((msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('timeout') || msg.includes('ECONNRESET')) && i < maxRetries - 1) {
        const waitTime = baseDelayMs * (i + 1);
        console.log(`⚠️  Rate-limited by Toncenter RPC (429), cooling down for ${waitTime / 1000}s...`);
        await sleep(waitTime);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Exceeded maximum RPC retries');
}

export function buildMintInternalMessage(toAddress: Address, jettonAmount: bigint, masterAddress: Address) {
    const masterMsg = beginCell()
        .storeUint(0x178d4519, 32) // op::internal_transfer
        .storeUint(0, 64)
        .storeCoins(jettonAmount)
        .storeAddress(masterAddress)
        .storeAddress(toAddress)
        .storeCoins(toNano('0.01'))
        .storeUint(0, 1) // empty payload
        .endCell();

    return beginCell()
        .storeUint(21, 32) // op::mint
        .storeUint(0, 64)
        .storeAddress(toAddress)
        .storeCoins(toNano('0.05')) // ton_amount for jetton wallet
        .storeRef(masterMsg)
        .endCell();
}

async function waitForSeqnoIncrement(walletContract: any, currentSeqno: number, maxAttempts = 15) {
    for (let i = 1; i <= maxAttempts; i++) {
        await sleep(5000);
        const s = await retryWithBackoff(() => walletContract.getSeqno()).catch(() => currentSeqno);
        if (s > currentSeqno) {
            console.log(`✅ Transaction confirmed on-chain! (seqno advanced: ${currentSeqno} -> ${s})`);
            return s;
        }
        console.log(`⏳ Waiting for block inclusion (${i}/${maxAttempts})...`);
    }
    throw new Error('Timeout waiting for seqno increment');
}

async function main() {
    console.log('\n======================================================');
    console.log('🚀 AUTOMATED MAINNET MINT & ADMIN HANDOVER SEQUENCE');
    console.log('======================================================\n');

    const client = new TonClient({ endpoint: RPC_ENDPOINT });
    const walletData = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'));
    const keyPair = await mnemonicToPrivateKey(walletData.mnemonic);
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    const walletContract = client.open(wallet);

    let balance = await retryWithBackoff(() => client.getBalance(wallet.address));
    let seqno = await retryWithBackoff(() => walletContract.getSeqno());
    console.log('📍 Relayer Address: ', wallet.address.toString({ bounceable: false }));
    console.log('💰 Relayer Balance: ', fromNano(balance), 'TON');
    console.log('🔢 Starting Seqno:  ', seqno);
    console.log('👑 Recipient & Future Permanent Admin: ', USER_OWNER_ADDRESS.toString({ bounceable: false }));

    const masterCode = Cell.fromBase64(fs.readFileSync(path.resolve('build/qton_master.boc.b64'), 'utf8'));
    const walletCode = Cell.fromBase64(fs.readFileSync(path.resolve('build/qton_wallet.boc.b64'), 'utf8'));

    const content = buildOnchainMetadata({
        name: 'Quantum TON',
        symbol: 'QTON',
        description: 'Quantum-Secured TON Infrastructure & Autonomous Jetton Launchpad with NIST FIPS 204 ML-DSA-65 Integration',
        decimals: '9',
    });

    const newMaster = QtonMaster.createFromConfig(
        {
            totalSupply: 0n,
            adminAddress: wallet.address,
            content,
            walletCode,
        },
        masterCode
    );

    const masterBounceable = newMaster.address.toString({ testOnly: false, bounceable: true });
    console.log('\n🏆 Target QTON Master Address: ', masterBounceable);
    console.log('🔗 Explorer: https://tonscan.org/address/' + masterBounceable);

    // STEP 1: Deploy Master
    console.log('\n------------------------------------------------------');
    console.log('Step 1/3: Broadcasting QTON Master Deployment (0.08 TON)...');
    console.log('------------------------------------------------------');
    await sleep(3000);
    await retryWithBackoff(() =>
        walletContract.sendTransfer({
            secretKey: keyPair.secretKey,
            seqno,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            messages: [
                internal({
                    to: newMaster.address,
                    value: toNano('0.08'),
                    init: newMaster.init,
                    bounce: false,
                    body: Cell.EMPTY,
                }),
            ],
        })
    );
    seqno = await waitForSeqnoIncrement(walletContract, seqno);

    // STEP 2: Mint 1,000,000,000 QTON to user
    console.log('\n------------------------------------------------------');
    console.log('Step 2/3: Minting 1,000,000,000 QTON to user wallet UQAJO... (0.10 TON)');
    console.log('------------------------------------------------------');
    await sleep(3500);
    const mintAmount = toNano('1000000000');
    const mintBody = buildMintInternalMessage(USER_OWNER_ADDRESS, mintAmount, newMaster.address);

    await retryWithBackoff(() =>
        walletContract.sendTransfer({
            secretKey: keyPair.secretKey,
            seqno,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            messages: [
                internal({
                    to: newMaster.address,
                    value: toNano('0.10'),
                    bounce: false,
                    body: mintBody,
                }),
            ],
        })
    );
    seqno = await waitForSeqnoIncrement(walletContract, seqno);

    // STEP 3: Transfer Permanent Admin to User
    console.log('\n------------------------------------------------------');
    console.log('Step 3/3: Transferring Permanent Admin Ownership to user UQAJO... (0.02 TON)');
    console.log('------------------------------------------------------');
    await sleep(3500);
    const changeAdminBody = beginCell()
        .storeUint(3, 32) // op::change_admin
        .storeUint(0, 64)
        .storeAddress(USER_OWNER_ADDRESS)
        .endCell();

    await retryWithBackoff(() =>
        walletContract.sendTransfer({
            secretKey: keyPair.secretKey,
            seqno,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            messages: [
                internal({
                    to: newMaster.address,
                    value: toNano('0.02'),
                    bounce: false,
                    body: changeAdminBody,
                }),
            ],
        })
    );
    seqno = await waitForSeqnoIncrement(walletContract, seqno);

    // FINAL VERIFICATION ON MAINNET
    console.log('\n------------------------------------------------------');
    console.log('🔍 VERIFYING FINAL STATE ON TON MAINNET...');
    console.log('------------------------------------------------------');
    await sleep(5000);
    const masterContract = client.open(newMaster);
    const jettonData = await retryWithBackoff(() => masterContract.getJettonData());
    const userJettonWalletAddr = await retryWithBackoff(() => masterContract.getWalletAddress(USER_OWNER_ADDRESS));

    console.log('📊 Total Supply:             ', fromNano(jettonData.totalSupply), 'QTON');
    console.log('👑 Permanent Admin Address:   ', jettonData.adminAddress.toString({ bounceable: false }));
    console.log('💎 Mintable (Unlimited Mode): ', jettonData.mintable);
    console.log('📦 User QTON Jetton Wallet:   ', userJettonWalletAddr.toString({ bounceable: true }));
    console.log('🔗 User Jetton Explorer:      ', 'https://tonscan.org/address/' + userJettonWalletAddr.toString({ bounceable: true }));

    // Record deployment in deployment-mainnet.json
    const deploymentRecord = {
        network: 'ton-mainnet',
        chainId: -239,
        caip2: 'ton:-239',
        rpcEndpoint: RPC_ENDPOINT,
        status: 'CONFIRMED_ACTIVE_ON_MAINNET',
        contracts: {
            qtonMaster: {
                address: masterBounceable,
                explorer: 'https://tonscan.org/address/' + masterBounceable,
                tonviewer: 'https://tonviewer.com/' + masterBounceable,
            },
            qtonLaunchpad: {
                address: 'EQBxuhnE1YLSpGGml2pKDb72QGO8Tl07-PJRm6G9uIyabl7W',
                explorer: 'https://tonscan.org/address/EQBxuhnE1YLSpGGml2pKDb72QGO8Tl07-PJRm6G9uIyabl7W',
                tonviewer: 'https://tonviewer.com/EQBxuhnE1YLSpGGml2pKDb72QGO8Tl07-PJRm6G9uIyabl7W',
            },
            userJettonWallet: {
                address: userJettonWalletAddr.toString({ bounceable: true }),
                addressNonBounceable: userJettonWalletAddr.toString({ bounceable: false }),
                owner: USER_OWNER_ADDRESS.toString({ bounceable: false }),
                holding: fromNano(jettonData.totalSupply) + ' QTON',
                explorer: 'https://tonscan.org/address/' + userJettonWalletAddr.toString({ bounceable: true }),
            }
        },
        adminOwner: USER_OWNER_ADDRESS.toString({ bounceable: false }),
        totalSupply: fromNano(jettonData.totalSupply) + ' QTON',
        mintedAt: new Date().toISOString(),
    };

    fs.writeFileSync(path.resolve('deployment-mainnet.json'), JSON.stringify(deploymentRecord, null, 2));
    console.log('\n🎉 ALL DONE! 1,000,000,000 QTON MINTED TO USER & ADMIN HANDOVER COMPLETED!');
}

main().catch(console.error);
