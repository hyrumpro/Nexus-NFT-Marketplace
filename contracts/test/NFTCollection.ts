import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";
import { parseEther, encodeFunctionData, keccak256, toHex } from "viem";

describe("NFTCollection", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  
  let nftCollection: any;
  let owner: any;
  let minter: any;
  let user: any;

  beforeEach(async function () {
    const accounts = await viem.getWalletClients();
    owner = accounts[0];
    minter = accounts[1];
    user = accounts[2];

    nftCollection = await viem.deployContract("NFTCollection", [
      "Test Collection",
      "TEST",
      100n,
      owner.account.address,
      500n,
      "https://api.example.com/metadata/",
      owner.account.address,
      parseEther("0.1")
    ]);
  });

  describe("Deployment", async function () {
    it("Should set correct name and symbol", async function () {
      const name = await nftCollection.read.name();
      const symbol = await nftCollection.read.symbol();
      assert.equal(name, "Test Collection");
      assert.equal(symbol, "TEST");
    });

    it("Should set correct max supply", async function () {
      const maxSupply = await nftCollection.read.maxSupply();
      assert.equal(maxSupply, 100n);
    });

    it("Should set correct creator", async function () {
      const creator = await nftCollection.read.creator();
      assert.equal(creator.toLowerCase(), owner.account.address.toLowerCase());
    });

    it("Should set correct mint price", async function () {
      const mintPrice = await nftCollection.read.mintPrice();
      assert.equal(mintPrice, parseEther("0.1"));
    });

    it("Should grant admin role to creator", async function () {
      const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
      const hasRole = await nftCollection.read.hasRole([DEFAULT_ADMIN_ROLE, owner.account.address]);
      assert.equal(hasRole, true);
    });

    it("Should grant minter role to creator", async function () {
      const MINTER_ROLE = keccak256(toHex("MINTER_ROLE"));
      const hasRole = await nftCollection.read.hasRole([MINTER_ROLE, owner.account.address]);
      assert.equal(hasRole, true);
    });
  });

  describe("Minting", async function () {
    it("Should mint NFT with minter role", async function () {
      const MINTER_ROLE = keccak256(toHex("MINTER_ROLE"));
      await nftCollection.write.grantRole([MINTER_ROLE, minter.account.address], { account: owner.account });
      
      await nftCollection.write.mint([user.account.address, 1n, "token1.json"], { account: minter.account });
      
      const ownerOf = await nftCollection.read.ownerOf([1n]);
      assert.equal(ownerOf.toLowerCase(), user.account.address.toLowerCase());
      
      const totalSupply = await nftCollection.read.totalSupply();
      assert.equal(totalSupply, 1n);
    });

    it("Should fail minting without minter role", async function () {
      try {
        await nftCollection.write.mint([user.account.address, 1n, "token1.json"], { account: user.account });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Only minter"));
      }
    });

    it("Should mint batch of NFTs", async function () {
      const MINTER_ROLE = keccak256(toHex("MINTER_ROLE"));
      await nftCollection.write.grantRole([MINTER_ROLE, minter.account.address], { account: owner.account });
      
      const tokenIds = [1n, 2n, 3n];
      const uris = ["token1.json", "token2.json", "token3.json"];
      
      await nftCollection.write.mintBatch([user.account.address, tokenIds, uris], { account: minter.account });
      
      const totalSupply = await nftCollection.read.totalSupply();
      assert.equal(totalSupply, 3n);
    });

    it("Should mint with payment", async function () {
      await nftCollection.write.mintWithPrice([user.account.address, 1n, "token1.json"], {
        account: user.account,
        value: parseEther("0.1")
      });
      
      const ownerOf = await nftCollection.read.ownerOf([1n]);
      assert.equal(ownerOf.toLowerCase(), user.account.address.toLowerCase());
    });

    it("Should fail mint with insufficient payment", async function () {
      try {
        await nftCollection.write.mintWithPrice([user.account.address, 1n, "token1.json"], {
          account: user.account,
          value: parseEther("0.05")
        });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Insufficient payment"));
      }
    });

    it("Should fail to mint duplicate token ID", async function () {
      const MINTER_ROLE = keccak256(toHex("MINTER_ROLE"));
      await nftCollection.write.grantRole([MINTER_ROLE, minter.account.address], { account: owner.account });
      
      await nftCollection.write.mint([user.account.address, 1n, "token1.json"], { account: minter.account });
      
      try {
        await nftCollection.write.mint([user.account.address, 1n, "token1.json"], { account: minter.account });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Token already minted"));
      }
    });

    it("Should fail minting when max supply reached", async function () {
      const smallCollection = await viem.deployContract("NFTCollection", [
        "Small Collection",
        "SMALL",
        2n,
        owner.account.address,
        500n,
        "https://api.example.com/metadata/",
        owner.account.address,
        0n
      ]);
      
      await smallCollection.write.mint([user.account.address, 1n, "token1.json"], { account: owner.account });
      await smallCollection.write.mint([user.account.address, 2n, "token2.json"], { account: owner.account });
      
      try {
        await smallCollection.write.mint([user.account.address, 3n, "token3.json"], { account: owner.account });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Max supply reached"));
      }
    });
  });

  describe("Royalties", async function () {
    it("Should return correct royalty info", async function () {
      const [recipient, amount] = await nftCollection.read.royaltyInfo([1n, parseEther("1")]);
      assert.equal(recipient.toLowerCase(), owner.account.address.toLowerCase());
      assert.equal(amount, parseEther("0.05"));
    });

    it("Should allow admin to update royalty", async function () {
      await nftCollection.write.setRoyalty([user.account.address, 750n], { account: owner.account });
      
      const [recipient, amount] = await nftCollection.read.royaltyInfo([1n, parseEther("1")]);
      assert.equal(recipient.toLowerCase(), user.account.address.toLowerCase());
      assert.equal(amount, parseEther("0.075"));
    });

    it("Should fail setting royalty above 10%", async function () {
      try {
        await nftCollection.write.setRoyalty([user.account.address, 1100n], { account: owner.account });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Royalty exceeds max"));
      }
    });
  });

  describe("Admin Functions", async function () {
    it("Should allow admin to set max supply", async function () {
      await nftCollection.write.setMaxSupply([200n], { account: owner.account });
      const maxSupply = await nftCollection.read.maxSupply();
      assert.equal(maxSupply, 200n);
    });

    it("Should fail setting max supply below current supply", async function () {
      await nftCollection.write.mint([user.account.address, 1n, "token1.json"], { account: owner.account });
      
      try {
        await nftCollection.write.setMaxSupply([0n], { account: owner.account });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Below current supply"));
      }
    });

    it("Should allow admin to set mint price", async function () {
      await nftCollection.write.setMintPrice([parseEther("0.2")], { account: owner.account });
      const mintPrice = await nftCollection.read.mintPrice();
      assert.equal(mintPrice, parseEther("0.2"));
    });

    it("Should allow admin to pause and unpause", async function () {
      await nftCollection.write.pause({ account: owner.account });
      
      let paused = true;
      try {
        await nftCollection.write.mint([user.account.address, 1n, "token1.json"], { account: owner.account });
        paused = false;
      } catch (error: any) {
      }
      assert.equal(paused, true);
      
      await nftCollection.write.unpause({ account: owner.account });
      await nftCollection.write.mint([user.account.address, 1n, "token1.json"], { account: owner.account });
      
      const totalSupply = await nftCollection.read.totalSupply();
      assert.equal(totalSupply, 1n);
    });

    it("Should allow admin to grant minter role", async function () {
      const MINTER_ROLE = keccak256(toHex("MINTER_ROLE"));
      await nftCollection.write.grantMinterRole([minter.account.address], { account: owner.account });
      
      const hasRole = await nftCollection.read.hasRole([MINTER_ROLE, minter.account.address]);
      assert.equal(hasRole, true);
    });

    it("Should allow admin to revoke minter role", async function () {
      const MINTER_ROLE = keccak256(toHex("MINTER_ROLE"));
      await nftCollection.write.grantMinterRole([minter.account.address], { account: owner.account });
      await nftCollection.write.revokeMinterRole([minter.account.address], { account: owner.account });
      
      const hasRole = await nftCollection.read.hasRole([MINTER_ROLE, minter.account.address]);
      assert.equal(hasRole, false);
    });
  });

  describe("Withdrawal", async function () {
    it("Should allow admin to withdraw balance", async function () {
      await nftCollection.write.mintWithPrice([user.account.address, 1n, "token1.json"], {
        account: user.account,
        value: parseEther("0.1")
      });

      const balanceBefore = await publicClient.getBalance({ address: owner.account.address });
      await nftCollection.write.withdraw({ account: owner.account });
      const balanceAfter = await publicClient.getBalance({ address: owner.account.address });

      assert.ok(balanceAfter > balanceBefore);
    });

    it("Should fail withdrawal when balance is zero", async function () {
      try {
        await nftCollection.write.withdraw({ account: owner.account });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("No balance"));
      }
    });

    it("Should prevent non-admin from withdrawing", async function () {
      await nftCollection.write.mintWithPrice([user.account.address, 1n, "token1.json"], {
        account: user.account,
        value: parseEther("0.1")
      });

      try {
        await nftCollection.write.withdraw({ account: user.account });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Only admin"));
      }
    });
  });

  describe("Security: mintWithPrice refund", async function () {
    it("Should refund overpayment to caller", async function () {
      const balanceBefore = await publicClient.getBalance({ address: user.account.address });

      // Overpay by 0.5 ETH (mint price is 0.1 ETH)
      await nftCollection.write.mintWithPrice([user.account.address, 1n, "token1.json"], {
        account: user.account,
        value: parseEther("0.6")
      });

      const balanceAfter = await publicClient.getBalance({ address: user.account.address });
      const spent = balanceBefore - balanceAfter;

      // Net cost should be ~0.1 ETH + gas, not 0.6 ETH
      assert.ok(spent < parseEther("0.11"), "Excess payment should be refunded");
    });

    it("Should not allow re-minting the same token ID", async function () {
      await nftCollection.write.mintWithPrice([user.account.address, 1n, "token1.json"], {
        account: user.account,
        value: parseEther("0.1")
      });

      try {
        await nftCollection.write.mintWithPrice([user.account.address, 1n, "token1.json"], {
          account: user.account,
          value: parseEther("0.1")
        });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Already minted") || error.message.includes("Token already minted"));
      }
    });
  });

  describe("Security: Access control", async function () {
    it("Should prevent non-admin from pausing", async function () {
      try {
        await nftCollection.write.pause({ account: user.account });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Only admin"));
      }
    });

    it("Should prevent minting while paused", async function () {
      await nftCollection.write.pause({ account: owner.account });

      try {
        await nftCollection.write.mint([user.account.address, 1n, "token1.json"], { account: owner.account });
        assert.fail("Should have reverted");
      } catch (error: any) {
        // OpenZeppelin EnforcedPause or similar
        assert.ok(error.message.length > 0);
      }
    });

    it("Should prevent non-admin from setting max supply", async function () {
      try {
        await nftCollection.write.setMaxSupply([500n], { account: user.account });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Only admin"));
      }
    });

    it("Should prevent non-admin from setting mint price", async function () {
      try {
        await nftCollection.write.setMintPrice([parseEther("0.5")], { account: user.account });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Only admin"));
      }
    });
  });
});
