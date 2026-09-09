/**
 * QTON Market Infrastructure — DeDust.io V2 Integration Engine
 * Standard: DeDust V2 Native Vault & Volatility Pool Swaps
 */

import { Address, beginCell, Cell, toNano } from '@ton/core';

export interface DeDustQuote {
  assetIn: 'TON' | 'QTON';
  assetOut: 'TON' | 'QTON';
  amountIn: bigint;
  amountOut: bigint;
  minAmountOut: bigint;
  tradeFee: bigint;
  poolType: 'VOLATILE' | 'STABLE';
}

export class DeDustIntegration {
  // Official DeDust V2 Factory & Native Vault
  public static readonly DEDUST_FACTORY_TESTNET = Address.parseRaw('0:8b13735bb95ea52bc437b019623e1f13b1940ee3bf377f065369651c68bf7a16');
  public static readonly DEDUST_SWAP_OP = 0x61ee544e;
  public static readonly DEDUST_DEPOSIT_LIQUIDITY_OP = 0xd55e4686;

  /**
   * Calculate DeDust Volatile Pool Quote (0.25% pool fee)
   */
  public static calculateDeDustQuote(
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
    slippageToleranceBps: number = 50
  ): DeDustQuote {
    if (reserveIn <= 0n || reserveOut <= 0n) {
      throw new Error('DeDust pool reserves must be positive');
    }

    const feeNumerator = 25n; // 0.25% fee on DeDust V2 Volatile pools
    const feeDenominator = 10000n;
    const fee = (amountIn * feeNumerator) / feeDenominator;
    const netAmountIn = amountIn - fee;

    const amountOut = (netAmountIn * reserveOut) / (reserveIn + netAmountIn);
    const minAmountOut = (amountOut * BigInt(10000 - slippageToleranceBps)) / 10000n;

    return {
      assetIn: 'TON',
      assetOut: 'QTON',
      amountIn,
      amountOut,
      minAmountOut,
      tradeFee: fee,
      poolType: 'VOLATILE',
    };
  }

  /**
   * Build DeDust Swap Step Cell for forwarding Jetton Swap
   */
  public static buildDeDustSwapPayload(
    poolAddress: Address,
    minAmountOut: bigint,
    recipient: Address
  ): Cell {
    const swapStep = beginCell()
      .storeAddress(poolAddress)
      .storeUint(0, 1) // limit: none
      .storeCoins(minAmountOut)
      .storeMaybeRef(null)
      .endCell();

    return beginCell()
      .storeUint(this.DEDUST_SWAP_OP, 32)
      .storeRef(swapStep)
      .storeAddress(recipient)
      .endCell();
  }
}
