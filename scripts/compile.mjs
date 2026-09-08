import { compileFunc } from '@ton-community/func-js';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log('Compiling QTON FunC contracts via @ton-community/func-js...');
    const root = 'C:/Users/marti/Ton-Society-India';
    
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

    // Save build artifacts
    fs.mkdirSync(path.join(root, 'build'), { recursive: true });
    fs.writeFileSync(path.join(root, 'build/qton_wallet.boc.b64'), walletRes.codeBoc);
    fs.writeFileSync(path.join(root, 'build/qton_master.boc.b64'), masterRes.codeBoc);
    fs.writeFileSync(path.join(root, 'build/qton_launchpad.boc.b64'), launchpadRes.codeBoc);
    console.log('All build artifacts saved in build/ directory!');
}

main().catch(err => {
    console.error('Fatal compile error:', err);
    process.exit(1);
});
