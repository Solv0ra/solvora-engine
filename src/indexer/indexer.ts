// Indexer — reads ERC-20 Transfer events and current balances from an EVM RPC for a set of
// entity addresses. Produces raw events, balances, and accounting entries.

import { Contract, JsonRpcProvider, zeroPadValue } from "ethers";
import { ERC20_TRANSFER_TOPIC, GenericTreasuryAdapter } from "../adapters/GenericTreasuryAdapter.js";
import { tokenListForChain } from "../services/tokens.js";
import { matchKnownEvent } from "../services/events.js";
import type { AccountingEntry, AssetBalance, EvmEvent } from "../types/index.js";

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

interface Erc20Contract {
  balanceOf(account: string, overrides?: { blockTag?: number | string }): Promise<bigint>;
}

function erc20(token: string, provider: JsonRpcProvider): Erc20Contract {
  return new Contract(token, ERC20_ABI, provider) as unknown as Erc20Contract;
}

export class Indexer {
  constructor(private readonly provider: JsonRpcProvider) {}

  // All ERC-20 Transfer logs where the entity's addresses are the sender or receiver.
  // Used for cash-flow reports — requires an RPC that serves eth_getLogs.
  async getRawTransfers(
    addresses: string[],
    fromBlock: number,
    toBlock: number,
  ): Promise<EvmEvent[]> {
    // Indexed address topics must be left-padded to 32 bytes; some nodes reject 20-byte
    // addresses in the topics filter.
    const padded = addresses.map((a) => zeroPadValue(a, 32));
    const incoming = [ERC20_TRANSFER_TOPIC, null, padded];
    const outgoing = [ERC20_TRANSFER_TOPIC, padded, null];

    const [inLogs, outLogs] = await Promise.all([
      this.provider.getLogs({ fromBlock, toBlock, topics: incoming }),
      this.provider.getLogs({ fromBlock, toBlock, topics: outgoing }),
    ]);

    return [...inLogs, ...outLogs].map((log) => ({
      blockNumber: log.blockNumber,
      logIndex: log.index,
      address: log.address,
      topics: [...log.topics],
      data: log.data,
    }));
  }

  // Current ERC-20 balances across the entity addresses, discovered from the token list via
  // balanceOf (archive-free). Tokens with zero balance are omitted.
  async getTokenBalances(
    addresses: string[],
    blockNumber: number,
    chainId: number,
  ): Promise<AssetBalance[]> {
    const results = await Promise.all(
      tokenListForChain(chainId).map(async (token) => {
        const contract = erc20(token.address, this.provider);
        let amount = 0n;
        for (const addr of addresses) {
          amount += await contract.balanceOf(addr, { blockTag: blockNumber });
        }
        return { token, amount };
      }),
    );

    return results
      .filter((r) => r.amount > 0n)
      .map((r) => ({
        asset: r.token.address.toLowerCase(),
        symbol: r.token.symbol,
        decimals: r.token.decimals,
        amount: r.amount,
      }));
  }

  // Current native ETH balance, summed across the entity addresses.
  async getNativeBalance(addresses: string[], blockNumber: number): Promise<AssetBalance> {
    const amounts = await Promise.all(
      addresses.map((a) => this.provider.getBalance(a, blockNumber)),
    );
    const amount = amounts.reduce((sum, b) => sum + b, 0n);
    return { asset: "native", symbol: "ETH", decimals: 18, amount };
  }

  // Unix timestamp (seconds) of a block.
  async getBlockTimestamp(blockNumber: number): Promise<number> {
    const block = await this.provider.getBlock(blockNumber);
    return block?.timestamp ?? 0;
  }

  // First block whose timestamp is >= the given unix timestamp (binary search over the
  // chain, which has strictly increasing block timestamps).
  async timestampToBlock(targetTimestamp: number): Promise<number> {
    const latest = await this.provider.getBlockNumber();
    const latestBlock = await this.provider.getBlock(latest);
    if ((latestBlock?.timestamp ?? 0) <= targetTimestamp) return latest;

    let low = 0;
    let high = latest;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const block = await this.provider.getBlock(mid);
      const ts = block?.timestamp ?? 0;
      if (ts < targetTimestamp) low = mid + 1;
      else high = mid;
    }
    return low;
  }

  // Current balances for a specific set of token assets, summed across the entity addresses.
  async getBalancesForAssets(
    addresses: string[],
    assets: string[],
    blockNumber: number,
  ): Promise<Map<string, bigint>> {
    const pairs = await Promise.all(
      assets.map(async (asset) => {
        const contract = erc20(asset, this.provider);
        let amount = 0n;
        for (const addr of addresses) {
          amount += await contract.balanceOf(addr, { blockTag: blockNumber });
        }
        return [asset, amount] as const;
      }),
    );
    return new Map(pairs);
  }

  async getEntries(
    entityId: bigint,
    addresses: string[],
    fromBlock: number,
    toBlock: number,
  ): Promise<AccountingEntry[]> {
    const raw = await this.getRawTransfers(addresses, fromBlock, toBlock);
    const adapter = new GenericTreasuryAdapter(entityId, addresses);
    const entries: AccountingEntry[] = [];
    for (const event of raw) {
      entries.push(...adapter.parseEvent(event));
    }

    for (const entry of entries) {
      if (entry.entryType === "outflow" && entry.counterparty) {
        const label = matchKnownEvent(entry.counterparty);
        if (label) entry.description = label;
      }
    }

    return entries;
  }
}
