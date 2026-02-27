import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";
import { parseEther } from "viem";

describe("CollectionFactory", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  
  let factory: any;
  let owner: any;
  let creator: any;
  let user: any;

  beforeEach(async function () {
    const accounts = await viem.getWalletClients();
    owner = accounts[0];
    creator = accounts[1];
    user = accounts[2];

    factory = await viem.deployContract("CollectionFactory", []);
  });

  describe("Deployment", async function () {
    it("Should set correct owner", async function () {
      const factoryOwner = await factory.read.owner();
      assert.equal(factoryOwner.toLowerCase(), owner.account.address.toLowerCase());
    });
  });

  describe("Collection Creation", async function () {
    it("Should create a new collection", async function () {
      await factory.write.createCollection([
        "My Collection",
        "MYC",
        100n,
        500n,
        "https://api.example.com/metadata/"
      ], { account: creator.account });

      const collections = await factory.read.getCollectionsByCreator([creator.account.address]);
      assert.equal(collections.length, 1);
    });

    it("Should track collections by creator", async function () {
      await factory.write.createCollection([
        "Collection 1",
        "COL1",
        100n,
        500n,
        "https://api.example.com/metadata/"
      ], { account: creator.account });

      await factory.write.createCollection([
        "Collection 2",
        "COL2",
        50n,
        250n,
        "https://api.example.com/metadata/"
      ], { account: creator.account });

      const collections = await factory.read.getCollectionsByCreator([creator.account.address]);
      assert.equal(collections.length, 2);
    });

    it("Should increase total collections count", async function () {
      await factory.write.createCollection([
        "Collection 1",
        "COL1",
        100n,
        500n,
        "https://api.example.com/metadata/"
      ], { account: creator.account });

      const total = await factory.read.totalCollections();
      assert.equal(total, 1n);
    });

    it("Should mark collection as valid", async function () {
      await factory.write.createCollection([
        "My Collection",
        "MYC",
        100n,
        500n,
        "https://api.example.com/metadata/"
      ], { account: creator.account });

      const collections = await factory.read.getCollectionsByCreator([creator.account.address]);
      const isCollection = await factory.read.isCollection([collections[0]]);
      assert.equal(isCollection, true);
    });

    it("Should create collection with mint price", async function () {
      await factory.write.createCollectionWithMintPrice([
        "Paid Collection",
        "PAID",
        100n,
        500n,
        "https://api.example.com/metadata/",
        parseEther("0.1")
      ], { account: creator.account });

      const collections = await factory.read.getCollectionsByCreator([creator.account.address]);
      assert.equal(collections.length, 1);
    });

    it("Should fail with empty name", async function () {
      let failed = false;
      try {
        await factory.write.createCollection([
          "",
          "MYC",
          100n,
          500n,
          "https://api.example.com/metadata/"
        ], { account: creator.account });
      } catch (error: any) {
        failed = true;
      }
      assert.equal(failed, true);
    });

    it("Should fail with empty symbol", async function () {
      let failed = false;
      try {
        await factory.write.createCollection([
          "My Collection",
          "",
          100n,
          500n,
          "https://api.example.com/metadata/"
        ], { account: creator.account });
      } catch (error: any) {
        failed = true;
      }
      assert.equal(failed, true);
    });

    it("Should fail with zero max supply", async function () {
      let failed = false;
      try {
        await factory.write.createCollection([
          "My Collection",
          "MYC",
          0n,
          500n,
          "https://api.example.com/metadata/"
        ], { account: creator.account });
      } catch (error: any) {
        failed = true;
      }
      assert.equal(failed, true);
    });

    it("Should fail with royalty above 10%", async function () {
      let failed = false;
      try {
        await factory.write.createCollection([
          "My Collection",
          "MYC",
          100n,
          1100n,
          "https://api.example.com/metadata/"
        ], { account: creator.account });
      } catch (error: any) {
        failed = true;
      }
      assert.equal(failed, true);
    });
  });

  describe("Collection Verification", async function () {
    it("Should allow owner to verify collection", async function () {
      await factory.write.createCollection([
        "My Collection",
        "MYC",
        100n,
        500n,
        "https://api.example.com/metadata/"
      ], { account: creator.account });

      const collections = await factory.read.getCollectionsByCreator([creator.account.address]);
      
      await factory.write.verifyCollection([collections[0], true], { account: owner.account });
      
      const isVerified = await factory.read.isVerified([collections[0]]);
      assert.equal(isVerified, true);
    });

    it("Should allow owner to unverify collection", async function () {
      await factory.write.createCollection([
        "My Collection",
        "MYC",
        100n,
        500n,
        "https://api.example.com/metadata/"
      ], { account: creator.account });

      const collections = await factory.read.getCollectionsByCreator([creator.account.address]);
      
      await factory.write.verifyCollection([collections[0], true], { account: owner.account });
      await factory.write.verifyCollection([collections[0], false], { account: owner.account });
      
      const isVerified = await factory.read.isVerified([collections[0]]);
      assert.equal(isVerified, false);
    });

    it("Should fail verifying non-collection address", async function () {
      let failed = false;
      try {
        await factory.write.verifyCollection([user.account.address, true], { account: owner.account });
      } catch (error: any) {
        failed = true;
      }
      assert.equal(failed, true);
    });
  });

  describe("Getter Functions", async function () {
    it("Should return collection at index", async function () {
      await factory.write.createCollection([
        "Collection 1",
        "COL1",
        100n,
        500n,
        "https://api.example.com/metadata/"
      ], { account: creator.account });

      await factory.write.createCollection([
        "Collection 2",
        "COL2",
        50n,
        250n,
        "https://api.example.com/metadata/"
      ], { account: creator.account });

      const col0 = await factory.read.getCollectionAt([0n]);
      const col1 = await factory.read.getCollectionAt([1n]);

      assert.ok(col0 !== col1);
    });

    it("Should fail getting collection at invalid index", async function () {
      let failed = false;
      try {
        await factory.read.getCollectionAt([0n]);
      } catch (error: any) {
        failed = true;
      }
      assert.equal(failed, true);
    });
  });

  describe("Admin Functions", async function () {
    it("Should allow owner to set marketplace", async function () {
      await factory.write.setMarketplace([user.account.address], { account: owner.account });
      
      const marketplace = await factory.read.marketplace();
      assert.equal(marketplace.toLowerCase(), user.account.address.toLowerCase());
    });

    it("Should allow owner to pause", async function () {
      await factory.write.pause({ account: owner.account });
      
      let failed = false;
      try {
        await factory.write.createCollection([
          "My Collection",
          "MYC",
          100n,
          500n,
          "https://api.example.com/metadata/"
        ], { account: creator.account });
      } catch (error: any) {
        failed = true;
      }
      assert.equal(failed, true);
    });

    it("Should allow owner to unpause", async function () {
      await factory.write.pause({ account: owner.account });
      await factory.write.unpause({ account: owner.account });
      
      await factory.write.createCollection([
        "My Collection",
        "MYC",
        100n,
        500n,
        "https://api.example.com/metadata/"
      ], { account: creator.account });
      
      const total = await factory.read.totalCollections();
      assert.equal(total, 1n);
    });
  });
});
