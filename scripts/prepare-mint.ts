import { Address, beginCell, toNano, Cell } from '@ton/core';
import { QtonQrEngine } from '../src/utils/qr_generator';
import fs from 'fs';
import path from 'path';

// QTON Jetton Master on Mainnet
const MASTER_ADDRESS = Address.parse('EQAPtVJbQWDFq0ZMILt3aXvYAmOVUv3IDqmiELF8_gdtW7Jh');
// User Admin Wallet
const USER_ADDRESS = Address.parse('UQAJO_hgYMZq3ULuzFv7927z-WgsM0BApc0IRniDrHORTzm3');

// Default initial mint amount: 1,000,000,000 QTON (1 Billion QTON)
const DEFAULT_MINT_AMOUNT = toNano('1000000000'); // 1B with 9 decimals

export function buildMintPayload(toAddress: Address, jettonAmount: bigint, forwardTon = toNano('0.02'), forwardGasToWallet = toNano('0.05')) {
    const masterMsg = beginCell()
        .storeUint(0x178d4519, 32) // op::internal_transfer
        .storeUint(0, 64)          // query_id
        .storeCoins(jettonAmount)   // jetton_amount
        .storeAddress(MASTER_ADDRESS) // from_address
        .storeAddress(toAddress)      // response_address
        .storeCoins(forwardTon)       // forward_ton_amount
        .storeUint(0, 1)              // forward payload: empty
        .endCell();

    const bodyCell = beginCell()
        .storeUint(21, 32)            // op::mint
        .storeUint(0, 64)             // query_id
        .storeAddress(toAddress)       // to_address
        .storeCoins(forwardGasToWallet)// ton_amount sent to jetton wallet
        .storeRef(masterMsg)          // master_msg
        .endCell();

    return bodyCell;
}

async function main() {
    const mintAmountStr = process.argv[2] || '1000000000';
    const mintAmount = toNano(mintAmountStr);
    const tonAttachValue = toNano('0.15'); // 0.15 TON for fee + jetton wallet deployment reserve

    const bodyCell = buildMintPayload(USER_ADDRESS, mintAmount);
    const bocBase64 = bodyCell.toBoc().toString('base64');
    const bocBase64UrlSafe = bocBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Standard ton:// deep link format for tonkeeper / telegram wallet
    // ton://transfer/<address>?amount=<nanotons>&bin=<boc>
    const tonDeepLink = `ton://transfer/${MASTER_ADDRESS.toString()}?amount=${tonAttachValue.toString()}&bin=${bocBase64UrlSafe}`;
    const tonkeeperLink = `https://app.tonkeeper.com/transfer/${MASTER_ADDRESS.toString()}?amount=${tonAttachValue.toString()}&bin=${bocBase64UrlSafe}`;

    console.log('\n======================================================');
    console.log('💎 QTON MAINNET TOKEN MINT GENERATOR');
    console.log('======================================================');
    console.log('Recipient / Admin: ', USER_ADDRESS.toString({ bounceable: false }));
    console.log('QTON Master:        ', MASTER_ADDRESS.toString());
    console.log('Tokens to Mint:     ', mintAmountStr, 'QTON');
    console.log('Transaction Value:  ', '0.15 TON (Gas + Wallet deploy rent)');
    console.log('Payload BOC (Base64):');
    console.log(bocBase64);
    console.log('\n🔗 1-CLICK TONKEEPER / MOBILE WALLET LINK:');
    console.log(tonkeeperLink);
    console.log('\n⚡ DIRECT PROTOCOL LINK:');
    console.log(tonDeepLink);
    console.log('======================================================\n');

    // Generate QR Code
    const qr = await QtonQrEngine.generateGenericQr(tonDeepLink);
    console.log('📱 SCAN WITH TONKEEPER / TELEGRAM WALLET TO SIGN & MINT:');
    console.log(qr.asciiTerminal);

    const outDir = path.resolve('public');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    fs.writeFileSync(path.join(outDir, 'mint_qr.svg'), qr.svgString);
    fs.writeFileSync(path.resolve('mint-transaction.json'), JSON.stringify({
        masterAddress: MASTER_ADDRESS.toString(),
        recipient: USER_ADDRESS.toString({ bounceable: false }),
        qtonAmount: mintAmountStr,
        attachedTon: '0.15',
        bocBase64,
        bocBase64UrlSafe,
        tonDeepLink,
        tonkeeperLink,
        createdAt: new Date().toISOString()
    }, null, 2));

    console.log('💾 Saved payload to mint-transaction.json and public/mint_qr.svg');
}

main().catch(console.error);
