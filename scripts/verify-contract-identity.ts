import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Cell } from '@ton/core';

export interface ContractIdentity {
    contract: string;
    network: 'ton-testnet' | 'ton-mainnet';
    sourceFile: string;
    compiler: string;
    compilerVersion: string;
    bocSha256: string;
    tvmCodeHash: string;
    deployedAddress?: string;
    verified: boolean;
}

export const CANONICAL_CONTRACT_IDENTITIES: ContractIdentity[] = [
    {
        contract: 'QTON_MASTER',
        network: 'ton-testnet',
        sourceFile: 'contracts/qton_master.fc',
        compiler: '@ton-community/func-js',
        compilerVersion: '0.11.0',
        bocSha256: 'e94b9807e13b318b01e7a39b20b43614d69d548088fa64a82d9901be07d3586d',
        tvmCodeHash: '5ff2bfdc7f5ba6336c236aadbac0a4b76aedd626d47b718719f0e487088869cf',
        deployedAddress: 'kQCI8yoRda7UzQSOOypvN_trGrzNb4tGmRR9N-S9LOG-wW58',
        verified: true
    },
    {
        contract: 'QTON_WALLET',
        network: 'ton-testnet',
        sourceFile: 'contracts/qton_wallet.fc',
        compiler: '@ton-community/func-js',
        compilerVersion: '0.11.0',
        bocSha256: '7f22bc379cdd106476037d45b30842fa35dd35b832eb663f519b27272102c4af',
        tvmCodeHash: 'b5acf741bd062b0fdb3a3b9ebe27fb05deaa3dc8fc18c48ec8cad331601758b2',
        verified: true
    },
    {
        contract: 'QTON_LAUNCHPAD',
        network: 'ton-testnet',
        sourceFile: 'contracts/qton_launchpad.fc',
        compiler: '@ton-community/func-js',
        compilerVersion: '0.11.0',
        bocSha256: 'b217e1f945ed53d0b685a27c2e1005d41f694b436dd1a901b2c6b03e85043e75',
        tvmCodeHash: 'd274fbb3840833170540da9581722566face55aee2972a73320c1f4028afb29e',
        deployedAddress: 'kQAHuKwr2EhHjjq4wG_xbUA7WtSw9j9OH9rfFrcBvxczgpmh',
        verified: true
    }
];

export function auditContractIdentities(): boolean {
    console.log('🏛️ ================================================================');
    console.log('   QTON SURGICAL STRIKE #3 — CONTRACT IDENTITY & CODE HASH AUDIT');
    console.log('   Standard: Bit-Exact BOC & 256-Bit TVM Code Hash Invariant');
    console.log('================================================================\n');

    let allValid = true;

    for (const item of CANONICAL_CONTRACT_IDENTITIES) {
        console.log(`🔍 Auditing ${item.contract} (${item.network})...`);
        console.log(`   Source: ${item.sourceFile} | Compiler: ${item.compiler} v${item.compilerVersion}`);

        // Check if source exists
        if (!fs.existsSync(item.sourceFile)) {
            console.error(`   ❌ Source file ${item.sourceFile} missing!`);
            allValid = false;
            continue;
        }

        // Check compiled BOC
        const bocFile = path.resolve('build', `${path.basename(item.sourceFile, '.fc')}.boc.b64`);
        if (!fs.existsSync(bocFile)) {
            console.error(`   ❌ Compiled BOC artifact ${bocFile} missing! Run npm run build first.`);
            allValid = false;
            continue;
        }

        const b64 = fs.readFileSync(bocFile, 'utf8').trim();
        const derivedBocSha = crypto.createHash('sha256').update(b64).digest('hex');
        const cell = Cell.fromBase64(b64);
        const derivedCodeHash = cell.hash().toString('hex');

        console.log(`   BOC SHA-256:  ${derivedBocSha}`);
        console.log(`   TVM CodeHash: ${derivedCodeHash}`);

        if (derivedBocSha !== item.bocSha256) {
            console.error(`   ❌ BOC SHA-256 mismatch! Expected: ${item.bocSha256}`);
            allValid = false;
        } else if (derivedCodeHash !== item.tvmCodeHash) {
            console.error(`   ❌ TVM CodeHash mismatch! Expected: ${item.tvmCodeHash}`);
            allValid = false;
        } else {
            console.log(`   ✅ ${item.contract} bit-exact code identity 100% VERIFIED.`);
            if (item.deployedAddress) {
                console.log(`   🌐 Testnet Address: ${item.deployedAddress}`);
            }
        }
        console.log('');
    }

    if (allValid) {
        console.log('================================================================');
        console.log('🏆 ALL CONTRACT IDENTITIES MATCH CANONICAL REPRODUCIBLE BUILDS');
        console.log('================================================================\n');
        return true;
    } else {
        console.error('================================================================');
        console.error('❌ CONTRACT IDENTITY AUDIT FAILED — UNVERIFIED CODE DRIFT DETECTED');
        console.error('================================================================\n');
        return false;
    }
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('verify-contract-identity')) {
    const ok = auditContractIdentities();
    process.exit(ok ? 0 : 1);
}
