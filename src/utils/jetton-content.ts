import { beginCell, Cell, Dictionary } from '@ton/core';
import { sha256_sync } from '@ton/crypto';

const ON_CHAIN_CONTENT_PREFIX = 0x00;
const SNAKE_PREFIX = 0x00;

export function toKey(key: string): bigint {
    return BigInt('0x' + sha256_sync(key).toString('hex'));
}

export function makeSnakeCell(data: Buffer): Cell {
    const chunks: Buffer[] = [];
    let cur = data;
    while (cur.length > 0) {
        chunks.push(cur.subarray(0, 127));
        cur = cur.subarray(127);
    }
    let cell = beginCell();
    for (let i = chunks.length - 1; i >= 0; i--) {
        const curCell = beginCell();
        if (i === 0) {
            curCell.storeUint(SNAKE_PREFIX, 8);
        }
        curCell.storeBuffer(chunks[i]);
        if (i < chunks.length - 1) {
            curCell.storeRef(cell.endCell());
        }
        cell = curCell;
    }
    return cell.endCell();
}

export function buildOnchainMetadata(data: { [key: string]: string }): Cell {
    const dict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
    for (const [k, v] of Object.entries(data)) {
        dict.set(toKey(k), makeSnakeCell(Buffer.from(v, 'utf8')));
    }
    return beginCell().storeUint(ON_CHAIN_CONTENT_PREFIX, 8).storeDict(dict).endCell();
}
