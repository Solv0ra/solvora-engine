// Read access to the on-chain EntityRegistry contract.

import { Contract, JsonRpcProvider } from "ethers";
import type { Entity, EntityType } from "../types/index.js";

const ENTITY_TYPES: EntityType[] = ["Treasury", "Amm", "LendingMarket", "Generic"];

const ENTITY_REGISTRY_ABI = [
  "function totalEntities() view returns (uint256)",
  "function getEntity(uint256 entityId) view returns (tuple(uint256 id, address owner, string label, uint8 entityType, uint256 chainId, address[] contractAddresses, uint256 createdAt) entity)",
];

interface EntityRecord {
  id: bigint;
  owner: string;
  label: string;
  entityType: bigint;
  chainId: bigint;
  contractAddresses: string[];
  createdAt: bigint;
}

interface EntityRegistryContract {
  totalEntities(): Promise<bigint>;
  getEntity(entityId: bigint): Promise<EntityRecord>;
}

export function entityRegistryContract(
  provider: JsonRpcProvider,
  address: string,
): EntityRegistryContract {
  return new Contract(address, ENTITY_REGISTRY_ABI, provider) as unknown as EntityRegistryContract;
}

export async function listEntities(provider: JsonRpcProvider, address: string): Promise<Entity[]> {
  const registry = entityRegistryContract(provider, address);
  const total = await registry.totalEntities();
  const entities: Entity[] = [];
  for (let i = 0n; i < total; i++) {
    entities.push(await getEntity(provider, address, i));
  }
  return entities;
}

export async function getEntity(
  provider: JsonRpcProvider,
  address: string,
  entityId: bigint,
): Promise<Entity> {
  const registry = entityRegistryContract(provider, address);
  const entity = await registry.getEntity(entityId);

  return {
    id: entity.id,
    owner: entity.owner,
    label: entity.label,
    entityType: ENTITY_TYPES[Number(entity.entityType)] ?? "Generic",
    chainId: Number(entity.chainId),
    contractAddresses: [...entity.contractAddresses],
    createdAt: Number(entity.createdAt),
  };
}
