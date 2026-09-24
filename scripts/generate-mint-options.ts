import { Address, toNano } from '@ton/core';
import { buildMintPayload } from './prepare-mint';
import { QtonQrEngine } from '../src/utils/qr_generator';
import fs from 'fs';
import path from 'path';

const MASTER_ADDRESS = Address.parse('EQAPtVJbQWDFq0ZMILt3aXvYAmOVUv3IDqmiELF8_gdtW7Jh');
const USER_ADDRESS = Address.parse('UQAJO_hgYMZq3ULuzFv7927z-WgsM0BApc0IRniDrHORTzm3');

const amounts = [
    { label: '100 Million QTON', amountStr: '100000000', nano: toNano('100000000') },
    { label: '1 Billion QTON (Standard)', amountStr: '1000000000', nano: toNano('1000000000') },
    { label: '10 Billion QTON', amountStr: '10000000000', nano: toNano('10000000000') }
];

async function generateAll() {
    const results: any[] = [];
    const tonAttachValue = toNano('0.15');

    for (const item of amounts) {
        const bodyCell = buildMintPayload(USER_ADDRESS, item.nano);
        const bocBase64 = bodyCell.toBoc().toString('base64');
        const bocBase64UrlSafe = bocBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const tonDeepLink = `ton://transfer/${MASTER_ADDRESS.toString()}?amount=${tonAttachValue.toString()}&bin=${bocBase64UrlSafe}`;
        const tonkeeperLink = `https://app.tonkeeper.com/transfer/${MASTER_ADDRESS.toString()}?amount=${tonAttachValue.toString()}&bin=${bocBase64UrlSafe}`;
        const qr = await QtonQrEngine.generateGenericQr(tonDeepLink);

        results.push({
            label: item.label,
            amount: item.amountStr,
            bocBase64,
            tonDeepLink,
            tonkeeperLink,
            qrSvg: qr.svgString
        });
    }

    fs.writeFileSync(path.resolve('mint-options.json'), JSON.stringify(results, null, 2));
    console.log('✅ Generated mint-options.json successfully');
}

generateAll().catch(console.error);
