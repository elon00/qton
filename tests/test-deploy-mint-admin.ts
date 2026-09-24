import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, Address, beginCell } from '@ton/core';
import { QtonMaster } from '../src/contracts/QtonMaster';
import { QtonWallet } from '../src/contracts/QtonWallet';
import { buildOnchainMetadata } from '../src/utils/jetton-content';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

async function testDeployMintAdminTransfer() {
    const blockchain = await Blockchain.create();
    const relayer = await blockchain.treasury('relayer');
    const userWalletAddress = Address.parse('UQAJO_hgYMZq3ULuzFv7927z-WgsM0BApc0IRniDrHORTzm3');

    const masterBoc = fs.readFileSync(path.resolve('build/qton_master.boc.b64'), 'utf8');
    const walletBoc = fs.readFileSync(path.resolve('build/qton_wallet.boc.b64'), 'utf8');
    const masterCode = Cell.fromBase64(masterBoc);
    const walletCode = Cell.fromBase64(walletBoc);

    const content = buildOnchainMetadata({
        name: 'Quantum TON',
        symbol: 'QTON',
        description: 'Post-Quantum Token on TON Blockchain with Unlimited Supply and NIST FIPS 204 Security',
        decimals: '9',
    });

    // 1. Deploy with relayer as initial setup admin
    const master = blockchain.openContract(
        QtonMaster.createFromConfig(
            {
                totalSupply: 0n,
                adminAddress: relayer.address,
                content,
                walletCode,
            },
            masterCode
        )
    );

    console.log('1. Deploying QTON Master...');
    const deployRes = await master.sendDeploy(relayer.getSender(), toNano('0.08'));
    assert.strictEqual(deployRes.transactions.length > 0, true);

    // 2. Mint 1,000,000,000 QTON to User
    console.log('2. Minting 1,000,000,000 QTON to user wallet UQAJO...');
    const mintAmount = toNano('1000000000');
    await master.sendMint(relayer.getSender(), {
        toAddress: userWalletAddress,
        jettonAmount: mintAmount,
        forwardTonAmount: toNano('0.01'),
        totalTonAmount: toNano('0.1'),
    });

    // Verify user jetton wallet balance
    const userJettonWalletAddr = await master.getWalletAddress(userWalletAddress);
    const userJettonWallet = blockchain.openContract(QtonWallet.createFromAddress(userJettonWalletAddr));
    const userWalletData = await userJettonWallet.getWalletData();
    assert.strictEqual(userWalletData.balance, mintAmount, 'User must have 1B QTON');
    console.log('✅ User received 1,000,000,000 QTON in their Jetton Wallet!');

    // 3. Transfer admin to user permanently
    console.log('3. Transferring permanent admin ownership to user UQAJO...');
    const changeAdminBody = beginCell()
        .storeUint(3, 32) // op::change_admin
        .storeUint(0, 64) // query_id
        .storeAddress(userWalletAddress)
        .endCell();

    await relayer.send({
        to: master.address,
        value: toNano('0.02'),
        body: changeAdminBody,
    });

    // 4. Verify Master final data
    const finalData = await master.getJettonData();
    assert.strictEqual(finalData.totalSupply, mintAmount);
    assert.strictEqual(finalData.mintable, true);
    assert.strictEqual(finalData.adminAddress.equals(userWalletAddress), true);
    console.log('✅ Permanent Admin transferred to:', finalData.adminAddress.toString({ bounceable: false }));
    console.log('✅ Final Total Supply:', finalData.totalSupply.toString());
    console.log('🎉 ALL INVARIANTS PASS: Minted + Transferred Admin in 1 Sequence!');
}

testDeployMintAdminTransfer().catch(console.error);
