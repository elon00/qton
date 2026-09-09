import { compileFunc } from '@ton-community/func-js';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log('Compiling QTON FunC contracts via @ton-community/func-js...');
    const root = process.cwd();
    
    // 1. Wallet
    console.log('Compiling qton_wallet.fc...');
    const walletRes = await compileFunc({
        targets: ['contracts/qton_wallet.fc'],
        sources: (filePath) => fs.readFileSync(path.resolve(root, filePath), 'utf8'),
    });
    if (walletRes.status === 'error') {
        console.error('Wallet compilation error:\n', walletRes.message);
        process.exit(1);
    }
    console.log('qton_wallet compiled successfully! BOC length:', walletRes.codeBoc.length);

    // 2. Master
    console.log('Compiling qton_master.fc...');
    const masterRes = await compileFunc({
        targets: ['contracts/qton_master.fc'],
        sources: (filePath) => fs.readFileSync(path.resolve(root, filePath), 'utf8'),
    });
    if (masterRes.status === 'error') {
        console.error('Master compilation error:\n', masterRes.message);
        process.exit(1);
    }
    console.log('qton_master compiled successfully! BOC length:', masterRes.codeBoc.length);

    // 3. Launchpad
    console.log('Compiling qton_launchpad.fc...');
    const launchpadRes = await compileFunc({
        targets: ['contracts/qton_launchpad.fc'],
        sources: (filePath) => fs.readFileSync(path.resolve(root, filePath), 'utf8'),
    });
    if (launchpadRes.status === 'error') {
        console.error('Launchpad compilation error:\n', launchpadRes.message);
        process.exit(1);
    }
    console.log('qton_launchpad compiled successfully! BOC length:', launchpadRes.codeBoc.length);

    // 4. Timelock Governance
    console.log('Compiling qton_timelock.fc...');
    const timelockRes = await compileFunc({
        targets: ['contracts/qton_timelock.fc'],
        sources: (filePath) => fs.readFileSync(path.resolve(root, filePath), 'utf8'),
    });
    if (timelockRes.status === 'error') {
        console.error('Timelock compilation error:\n', timelockRes.message);
        process.exit(1);
    }
    console.log('qton_timelock compiled successfully! BOC length:', timelockRes.codeBoc.length);

    // 5. PQC Gateway
    console.log('Compiling qton_pqc_gateway.fc...');
    const pqcGatewayRes = await compileFunc({
        targets: ['contracts/qton_pqc_gateway.fc'],
        sources: (filePath) => fs.readFileSync(path.resolve(root, filePath), 'utf8'),
    });
    if (pqcGatewayRes.status === 'error') {
        console.error('PQC Gateway compilation error:\n', pqcGatewayRes.message);
        process.exit(1);
    }
    console.log('qton_pqc_gateway compiled successfully! BOC length:', pqcGatewayRes.codeBoc.length);

    // Save build artifacts
    fs.mkdirSync(path.join(root, 'build'), { recursive: true });
    fs.writeFileSync(path.join(root, 'build/qton_wallet.boc.b64'), walletRes.codeBoc);
    fs.writeFileSync(path.join(root, 'build/qton_master.boc.b64'), masterRes.codeBoc);
    fs.writeFileSync(path.join(root, 'build/qton_launchpad.boc.b64'), launchpadRes.codeBoc);
    fs.writeFileSync(path.join(root, 'build/qton_timelock.boc.b64'), timelockRes.codeBoc);
    fs.writeFileSync(path.join(root, 'build/qton_pqc_gateway.boc.b64'), pqcGatewayRes.codeBoc);
    console.log('All 5 production build artifacts saved in build/ directory!');
}

main().catch(err => {
    console.error('Fatal compile error:', err);
    process.exit(1);
});
