import { network } from "hardhat";

async function main() {
  const { viem } = await network.connect();
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log("Deploying contracts with account:", deployer.account.address);

  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log("Account balance:", balance.toString(), "wei\n");

  // ── CollectionFactory ────────────────────────────────────────────────────
  console.log("Deploying CollectionFactory...");
  const factory = await viem.deployContract("CollectionFactory", []);
  console.log("CollectionFactory:", factory.address);

  // ── NexusMarketplace ─────────────────────────────────────────────────────
  console.log("Deploying NexusMarketplace...");
  const marketplace = await viem.deployContract("NexusMarketplace", [
    deployer.account.address, // feeRecipient — replace with your multisig for mainnet
    factory.address,
  ]);
  console.log("NexusMarketplace:", marketplace.address);

  // Wire factory ↔ marketplace
  await factory.write.setMarketplace([marketplace.address]);
  console.log("Factory wired to marketplace\n");

  // ── Output ───────────────────────────────────────────────────────────────
  console.log("=== Deployment complete ===\n");
  console.log("Copy these into your frontend/.env and subgraph/.env:\n");
  console.log(`NEXT_PUBLIC_COLLECTION_FACTORY_ADDRESS=${factory.address}`);
  console.log(`NEXT_PUBLIC_MARKETPLACE_ADDRESS=${marketplace.address}`);
  console.log(`\nSubgraph .env:`);
  console.log(`COLLECTION_FACTORY_ADDRESS=${factory.address}`);
  console.log(`MARKETPLACE_ADDRESS=${marketplace.address}`);
  console.log(`START_BLOCK=<set to the block number of this transaction>`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
