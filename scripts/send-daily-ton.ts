import { TonClient, WalletContractV4 } from '@ton/ton';
import { Address, toNano, fromNano, internal, SendMode, beginCell } from '@ton/core';
import { mnemonicToPrivateKey } from '@ton/crypto';

const RPC_ENDPOINT = process.env.QTON_TESTNET_RPC || 'https://testnet.toncenter.com/api/v2/jsonRPC';
const MAX_TRANSFER_TON = 1;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function readMnemonic(): string[] {
  const raw = process.env.TESTNET_WALLET_MNEMONIC?.trim();
  if (!raw) throw new Error('TESTNET_WALLET_MNEMONIC is required; file/example mnemonic fallback is disabled');

  try {
    const parsed = JSON.parse(raw);
    const words = Array.isArray(parsed) ? parsed : parsed?.mnemonic;
    if (Array.isArray(words) && words.length >= 12 && words.every((word) => typeof word === 'string')) {
      return words;
    }
  } catch {
    const words = raw.split(/\s+/);
    if (words.length >= 12) return words;
  }
  throw new Error('TESTNET_WALLET_MNEMONIC must contain a valid mnemonic word array/string');
}

function transferConfig() {
  if (process.env.QTON_ENABLE_TESTNET_TRANSFER !== 'true') {
    throw new Error('QTON_ENABLE_TESTNET_TRANSFER=true is required for an on-chain transfer');
  }
  const recipientRaw = process.env.QTON_TESTNET_RECIPIENT?.trim();
  if (!recipientRaw) throw new Error('QTON_TESTNET_RECIPIENT is required');

  const amountRaw = process.env.QTON_TESTNET_AMOUNT?.trim() || '0.1';
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_TRANSFER_TON) {
    throw new Error(`QTON_TESTNET_AMOUNT must be > 0 and <= ${MAX_TRANSFER_TON} TON`);
  }
  return { recipient: Address.parse(recipientRaw), amountRaw };
}

async function retryTonCall<T>(fn: () => Promise<T>, retries = 6, delay = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      await sleep(1500);
      return await fn();
    } catch (error: any) {
      if (
        error?.response?.status === 429 ||
        error?.message?.includes('429') ||
        error?.message?.includes('Ratelimit')
      ) {
        console.log(`Toncenter rate limit; retrying after ${delay / 1000}s (${i + 1}/${retries})`);
        await sleep(delay);
        delay = Math.ceil(delay * 1.5);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Exceeded maximum retries for TON RPC');
}

async function main() {
  const { recipient, amountRaw } = transferConfig();
  const mnemonic = readMnemonic();
  const client = new TonClient({ endpoint: RPC_ENDPOINT });
  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  const contract = client.open(wallet);
  const recipientFriendly = recipient.toString({ bounceable: false, testOnly: true });

  console.log('QTON explicit TON Testnet transfer');
  console.log('Sender:', wallet.address.toString({ testOnly: true }));
  console.log('Recipient:', recipientFriendly);
  console.log('Amount:', amountRaw, 'TON');

  const balance = await retryTonCall(() => client.getBalance(wallet.address));
  const required = toNano(amountRaw) + toNano('0.05');
  if (balance < required) {
    throw new Error(`insufficient testnet balance: ${fromNano(balance)} TON; need at least ${fromNano(required)} TON`);
  }

  const seqno = await retryTonCall(() => contract.getSeqno());
  const memoBody = beginCell()
    .storeUint(0, 32)
    .storeStringTail('Explicit QTON Testnet transfer')
    .endCell();

  await retryTonCall(() =>
    contract.sendTransfer({
      secretKey: keyPair.secretKey,
      seqno,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      messages: [
        internal({
          to: recipient,
          value: toNano(amountRaw),
          bounce: false,
          body: memoBody,
        }),
      ],
    })
  );

  for (let i = 0; i < 10; i++) {
    await sleep(3500);
    const currentSeqno = await retryTonCall(() => contract.getSeqno());
    if (currentSeqno > seqno) {
      const txs = await retryTonCall(() => client.getTransactions(wallet.address, { limit: 1 }));
      const tx = txs[0];
      console.log('Confirmed on TON Testnet.');
      if (tx) {
        console.log('Tx hash:', tx.id.hash);
        console.log('Tx LT:', tx.id.lt);
      }
      return;
    }
  }

  throw new Error('transfer was submitted but confirmation was not observed within the polling window');
}

main().catch((error) => {
  console.error('Testnet transfer failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
