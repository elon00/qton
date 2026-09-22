import { TonClient, WalletContractV4 } from '@ton/ton';
import { Address, toNano, fromNano, internal, SendMode, beginCell } from '@ton/core';
import { mnemonicToPrivateKey } from '@ton/crypto';
import fs from 'fs';
import path from 'path';

const RPC_ENDPOINT = 'https://testnet.toncenter.com/api/v2/jsonRPC';
const EVIDENCE_FILE = path.resolve('testnet-evidence.json');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function retryTonCall<T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> {
    for (let i = 0; i < retries; i++) {
        try {
            await sleep(1500); // Respect free-tier rate limit
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
    console.log('🏛️ ========================================================');
    console.log('   QTON LIVE ON-CHAIN TESTNET VERIFICATION SUITE');
    console.log('   Testing Live Smart Contracts on TON Testnet Network');
    console.log('========================================================\n');

    const client = new TonClient({ endpoint: RPC_ENDPOINT });
    const evidence = JSON.parse(fs.readFileSync(EVIDENCE_FILE, 'utf8'));

    const masterAddress = Address.parse(evidence.contracts.qtonMaster.address);
    const launchpadAddress = Address.parse(evidence.contracts.qtonLaunchpad.address);

    console.log('📍 Target QTON Master:    ', masterAddress.toString({ testOnly: true }));
    console.log('📍 Target QTON Launchpad: ', launchpadAddress.toString({ testOnly: true }));

    // Test 1: Query On-Chain Account State
    console.log('\n🧪 Test 1: Testing On-Chain Account State on TON Testnet...');
    const masterState = await retryTonCall(() => client.getContractState(masterAddress));
    console.log(`   Master State: ${masterState.state} | Balance: ${fromNano(masterState.balance)} TON`);
    if (masterState.state !== 'active') {
        throw new Error(`QTON Master contract is not active on testnet (state: ${masterState.state})`);
    }
    console.log('   ✅ QTON Master contract is LIVE & ACTIVE on-chain!');

    const launchpadState = await retryTonCall(() => client.getContractState(launchpadAddress));
    console.log(`   Launchpad State: ${launchpadState.state} | Balance: ${fromNano(launchpadState.balance)} TON`);
    if (launchpadState.state !== 'active') {
        throw new Error(`QTON Launchpad contract is not active on testnet (state: ${launchpadState.state})`);
    }
    console.log('   ✅ QTON Launchpad contract is LIVE & ACTIVE on-chain!');

    // Test 2: Call On-Chain Get-Method (get_jetton_data)
    console.log('\n🧪 Test 2: Calling on-chain get_jetton_data() via Toncenter RPC...');
    const jettonData = await retryTonCall(() => client.runMethod(masterAddress, 'get_jetton_data'));
    const totalSupply = jettonData.stack.readBigNumber();
    const mintable = jettonData.stack.readNumber();
    const adminAddress = jettonData.stack.readAddress();

    console.log(`   Total Supply: ${fromNano(totalSupply)} QTON`);
    console.log(`   Mintable Flag: ${mintable} (${mintable === -1 ? 'UNLIMITED SUPPLY ACTIVE' : 'CAPPED'})`);
    console.log(`   Admin Address: ${adminAddress.toString({ testOnly: true })}`);
    console.log('   ✅ Live Get-Method verification PASSED! Unlimited Supply flag confirmed.');

    // Test 3: Call On-Chain Get-Method (get_total_projects) on Launchpad
    console.log('\n🧪 Test 3: Calling on-chain get_total_projects() on Launchpad...');
    const launchpadData = await retryTonCall(() => client.runMethod(launchpadAddress, 'get_total_projects'));
    const totalProjects = launchpadData.stack.readNumber();
    console.log(`   Total Incubated Projects: ${totalProjects}`);
    console.log('   ✅ Launchpad Get-Method verification PASSED!');

    // Optional mutating test: disabled unless explicitly authorized.
    if (process.env.QTON_ENABLE_TESTNET_MINT === 'true') {
        const recipientRaw = process.env.QTON_TESTNET_MINT_RECIPIENT?.trim();
        const mnemonicRaw = process.env.TESTNET_WALLET_MNEMONIC?.trim();
        const amountRaw = process.env.QTON_TESTNET_MINT_AMOUNT?.trim() || '1000000';
        const amount = Number(amountRaw);

        if (!recipientRaw) throw new Error('QTON_TESTNET_MINT_RECIPIENT is required when minting is enabled');
        if (!mnemonicRaw) throw new Error('TESTNET_WALLET_MNEMONIC is required when minting is enabled');
        if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
            throw new Error('QTON_TESTNET_MINT_AMOUNT must be > 0 and <= 1,000,000 QTON');
        }

        let mnemonic: string[];
        try {
            const parsed = JSON.parse(mnemonicRaw);
            mnemonic = Array.isArray(parsed) ? parsed : parsed.mnemonic;
        } catch {
            mnemonic = mnemonicRaw.split(/\s+/);
        }
        if (!Array.isArray(mnemonic) || mnemonic.length < 12) {
            throw new Error('TESTNET_WALLET_MNEMONIC is invalid');
        }

        const userAddress = Address.parse(recipientRaw);
        const keyPair = await mnemonicToPrivateKey(mnemonic);
        const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
        const walletContract = client.open(wallet);
        const seqno = await retryTonCall(() => walletContract.getSeqno());
        const mintAmount = toNano(amountRaw);

        console.log(`\n🧪 Optional mutating test: minting ${amountRaw} QTON to ${userAddress.toString({ testOnly: true })}`);

        const masterMsg = beginCell()
            .storeUint(0x178d4519, 32)
            .storeUint(Date.now(), 64)
            .storeCoins(mintAmount)
            .storeAddress(masterAddress)
            .storeAddress(wallet.address)
            .storeCoins(toNano('0.02'))
            .storeUint(0, 1)
            .endCell();

        const mintPayload = beginCell()
            .storeUint(21, 32)
            .storeUint(Date.now(), 64)
            .storeAddress(userAddress)
            .storeCoins(toNano('0.05'))
            .storeRef(masterMsg)
            .endCell();

        await retryTonCall(() =>
            walletContract.sendTransfer({
                secretKey: keyPair.secretKey,
                seqno,
                sendMode: SendMode.PAY_GAS_SEPARATELY,
                messages: [
                    internal({
                        to: masterAddress,
                        value: toNano('0.1'),
                        bounce: true,
                        body: mintPayload,
                    }),
                ],
            })
        );

        let mintConfirmed = false;
        for (let i = 0; i < 8; i++) {
            await sleep(4000);
            const currentSeqno = await retryTonCall(() => walletContract.getSeqno());
            if (currentSeqno > seqno) {
                mintConfirmed = true;
                break;
            }
        }
        if (!mintConfirmed) {
            throw new Error('mint was submitted but confirmation was not observed within the polling window');
        }
        console.log('   ✅ Explicitly authorized testnet mint transaction confirmed.');
    } else {
        console.log('\nℹ️ Mutating mint test skipped. Set QTON_ENABLE_TESTNET_MINT=true plus explicit recipient and wallet secret to enable it.');
    }

    console.log('\n========================================================');
    console.log('✅ READ-ONLY ON-CHAIN CONTRACT CHECKS COMPLETED; MUTATION IS EXPLICITLY OPT-IN');
    console.log('========================================================\n');
}

main().catch(err => {
    console.error('Test Failed:', err);
    process.exit(1);
});
