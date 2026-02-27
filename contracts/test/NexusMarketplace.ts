import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";
import { parseEther } from "viem";

describe("NexusMarketplace", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  
  let marketplace: any;
  let nftCollection: any;
  let factory: any;
  let owner: any;
  let seller: any;
  let buyer: any;
  let feeRecipient: any;

  beforeEach(async function () {
    const accounts = await viem.getWalletClients();
    owner = accounts[0];
    seller = accounts[1];
    buyer = accounts[2];
    feeRecipient = accounts[3];

    factory = await viem.deployContract("CollectionFactory", []);

    marketplace = await viem.deployContract("NexusMarketplace", [
      feeRecipient.account.address,
      factory.address
    ]);

    const createTx = await factory.write.createCollection([
      "Test Collection",
      "TEST",
      100n,
      500n,
      "https://api.example.com/metadata/"
    ], { account: seller.account });

    const collections = await factory.read.getCollectionsByCreator([seller.account.address]);
    const collectionAddress = collections[0];
    
    nftCollection = await viem.getContractAt("NFTCollection", collectionAddress);
    
    await nftCollection.write.mint([seller.account.address, 1n, "token1.json"], { account: seller.account });
    await nftCollection.write.mint([seller.account.address, 2n, "token2.json"], { account: seller.account });
    await nftCollection.write.mint([seller.account.address, 3n, "token3.json"], { account: seller.account });
  });

  describe("Deployment", async function () {
    it("Should set correct fee recipient", async function () {
      const recipient = await marketplace.read.feeRecipient();
      assert.equal(recipient.toLowerCase(), feeRecipient.account.address.toLowerCase());
    });

    it("Should set correct factory", async function () {
      const factoryAddr = await marketplace.read.factory();
      assert.equal(factoryAddr.toLowerCase(), factory.address.toLowerCase());
    });

    it("Should set default marketplace fee", async function () {
      const fee = await marketplace.read.marketplaceFeePercent();
      assert.equal(fee, 150n);
    });

    it("Should support ETH as default currency", async function () {
      const supported = await marketplace.read.supportedCurrencies(["0x0000000000000000000000000000000000000000"]);
      assert.equal(supported, true);
    });
  });

  describe("Fixed Price Listings", async function () {
    it("Should list an item for sale", async function () {
      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });
      
      await marketplace.write.listItem([
        nftCollection.address,
        1n,
        parseEther("1"),
        "0x0000000000000000000000000000000000000000"
      ], { account: seller.account });

      const listing = await marketplace.read.getListing([nftCollection.address, 1n]);
      assert.equal(listing.active, true);
    });

    it("Should transfer NFT to marketplace when listed", async function () {
      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });
      
      await marketplace.write.listItem([
        nftCollection.address,
        1n,
        parseEther("1"),
        "0x0000000000000000000000000000000000000000"
      ], { account: seller.account });

      const owner = await nftCollection.read.ownerOf([1n]);
      assert.equal(owner.toLowerCase(), marketplace.address.toLowerCase());
    });

    it("Should fail listing without approval", async function () {
      try {
        await marketplace.write.listItem([
          nftCollection.address,
          1n,
          parseEther("1"),
          "0x0000000000000000000000000000000000000000"
        ], { account: seller.account });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Not approved"));
      }
    });

    it("Should fail listing by non-owner", async function () {
      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });
      
      try {
        await marketplace.write.listItem([
          nftCollection.address,
          1n,
          parseEther("1"),
          "0x0000000000000000000000000000000000000000"
        ], { account: buyer.account });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Not owner"));
      }
    });

    it("Should buy a listed item", async function () {
      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });
      
      await marketplace.write.listItem([
        nftCollection.address,
        1n,
        parseEther("1"),
        "0x0000000000000000000000000000000000000000"
      ], { account: seller.account });

      const sellerBalanceBefore = await publicClient.getBalance({ address: seller.account.address });
      
      await marketplace.write.buyItem([nftCollection.address, 1n], {
        account: buyer.account,
        value: parseEther("1")
      });

      const newOwner = await nftCollection.read.ownerOf([1n]);
      assert.equal(newOwner.toLowerCase(), buyer.account.address.toLowerCase());
    });

    it("Should fail buying with insufficient payment", async function () {
      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });
      
      await marketplace.write.listItem([
        nftCollection.address,
        1n,
        parseEther("1"),
        "0x0000000000000000000000000000000000000000"
      ], { account: seller.account });

      try {
        await marketplace.write.buyItem([nftCollection.address, 1n], {
          account: buyer.account,
          value: parseEther("0.5")
        });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Insufficient payment"));
      }
    });

    it("Should allow seller to cancel listing", async function () {
      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });
      
      await marketplace.write.listItem([
        nftCollection.address,
        1n,
        parseEther("1"),
        "0x0000000000000000000000000000000000000000"
      ], { account: seller.account });

      await marketplace.write.cancelListing([nftCollection.address, 1n], { account: seller.account });

      const owner = await nftCollection.read.ownerOf([1n]);
      assert.equal(owner.toLowerCase(), seller.account.address.toLowerCase());
    });

    it("Should allow seller to update listing price", async function () {
      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });
      
      await marketplace.write.listItem([
        nftCollection.address,
        1n,
        parseEther("1"),
        "0x0000000000000000000000000000000000000000"
      ], { account: seller.account });

      await marketplace.write.updateListing([nftCollection.address, 1n, parseEther("2")], { account: seller.account });

      const listing = await marketplace.read.getListing([nftCollection.address, 1n]);
      assert.equal(listing.price, parseEther("2"));
    });

    it("Should list item with expiry", async function () {
      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });
      
      const duration = 3600n;
      await marketplace.write.listItemWithExpiry([
        nftCollection.address,
        1n,
        parseEther("1"),
        "0x0000000000000000000000000000000000000000",
        duration
      ], { account: seller.account });

      const listing = await marketplace.read.getListing([nftCollection.address, 1n]);
      assert.ok(listing.endTime > 0n);
    });
  });

  describe("Auctions", async function () {
    it("Should create an auction", async function () {
      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });
      
      await marketplace.write.createAuction([
        nftCollection.address,
        1n,
        parseEther("0.5"),
        parseEther("1"),
        86400n,
        "0x0000000000000000000000000000000000000000"
      ], { account: seller.account });

      const auction = await marketplace.read.getAuction([nftCollection.address, 1n]);
      assert.equal(auction.seller.toLowerCase(), seller.account.address.toLowerCase());
    });

    it("Should place a bid", async function () {
      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });
      
      await marketplace.write.createAuction([
        nftCollection.address,
        1n,
        parseEther("0.5"),
        parseEther("1"),
        86400n,
        "0x0000000000000000000000000000000000000000"
      ], { account: seller.account });

      await marketplace.write.placeBid([nftCollection.address, 1n], {
        account: buyer.account,
        value: parseEther("0.5")
      });

      const auction = await marketplace.read.getAuction([nftCollection.address, 1n]);
      assert.equal(auction.highestBid, parseEther("0.5"));
    });

    it("Should fail bid below starting price", async function () {
      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });
      
      await marketplace.write.createAuction([
        nftCollection.address,
        1n,
        parseEther("0.5"),
        parseEther("1"),
        86400n,
        "0x0000000000000000000000000000000000000000"
      ], { account: seller.account });

      try {
        await marketplace.write.placeBid([nftCollection.address, 1n], {
          account: buyer.account,
          value: parseEther("0.3")
        });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Below starting price"));
      }
    });

    it("Should fail seller bidding on own auction", async function () {
      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });
      
      await marketplace.write.createAuction([
        nftCollection.address,
        1n,
        parseEther("0.5"),
        parseEther("1"),
        86400n,
        "0x0000000000000000000000000000000000000000"
      ], { account: seller.account });

      try {
        await marketplace.write.placeBid([nftCollection.address, 1n], {
          account: seller.account,
          value: parseEther("0.5")
        });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Cannot bid on own"));
      }
    });

    it("Should allow seller to cancel auction without bids", async function () {
      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });
      
      await marketplace.write.createAuction([
        nftCollection.address,
        1n,
        parseEther("0.5"),
        parseEther("1"),
        86400n,
        "0x0000000000000000000000000000000000000000"
      ], { account: seller.account });

      await marketplace.write.cancelAuction([nftCollection.address, 1n], { account: seller.account });

      const owner = await nftCollection.read.ownerOf([1n]);
      assert.equal(owner.toLowerCase(), seller.account.address.toLowerCase());
    });

    it("Should fail cancelling auction with bids", async function () {
      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });
      
      await marketplace.write.createAuction([
        nftCollection.address,
        1n,
        parseEther("0.5"),
        parseEther("1"),
        86400n,
        "0x0000000000000000000000000000000000000000"
      ], { account: seller.account });

      await marketplace.write.placeBid([nftCollection.address, 1n], {
        account: buyer.account,
        value: parseEther("0.5")
      });

      try {
        await marketplace.write.cancelAuction([nftCollection.address, 1n], { account: seller.account });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Has bids"));
      }
    });

    it("Should fail auction with invalid duration", async function () {
      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });

      try {
        await marketplace.write.createAuction([
          nftCollection.address,
          1n,
          parseEther("0.5"),
          parseEther("1"),
          100n,
          "0x0000000000000000000000000000000000000000"
        ], { account: seller.account });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Invalid duration"));
      }
    });
  });

  describe("Offers", async function () {
    it("Should make an offer", async function () {
      const expiryTime = BigInt(Math.floor(Date.now() / 1000) + 86400);
      
      await marketplace.write.makeOffer([
        nftCollection.address,
        1n,
        parseEther("1"),
        expiryTime,
        "0x0000000000000000000000000000000000000000"
      ], {
        account: buyer.account,
        value: parseEther("1")
      });

      const offer = await marketplace.read.getOffer([nftCollection.address, 1n, buyer.account.address]);
      assert.equal(offer.active, true);
    });

    it("Should accept an offer", async function () {
      const expiryTime = BigInt(Math.floor(Date.now() / 1000) + 86400);
      
      await marketplace.write.makeOffer([
        nftCollection.address,
        1n,
        parseEther("1"),
        expiryTime,
        "0x0000000000000000000000000000000000000000"
      ], {
        account: buyer.account,
        value: parseEther("1")
      });

      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });
      
      await marketplace.write.acceptOffer([nftCollection.address, 1n, buyer.account.address], { account: seller.account });

      const newOwner = await nftCollection.read.ownerOf([1n]);
      assert.equal(newOwner.toLowerCase(), buyer.account.address.toLowerCase());
    });

    it("Should allow buyer to cancel offer", async function () {
      const expiryTime = BigInt(Math.floor(Date.now() / 1000) + 86400);
      
      await marketplace.write.makeOffer([
        nftCollection.address,
        1n,
        parseEther("1"),
        expiryTime,
        "0x0000000000000000000000000000000000000000"
      ], {
        account: buyer.account,
        value: parseEther("1")
      });

      await marketplace.write.cancelOffer([nftCollection.address, 1n], { account: buyer.account });

      const offer = await marketplace.read.getOffer([nftCollection.address, 1n, buyer.account.address]);
      assert.equal(offer.active, false);
    });

    it("Should make a collection offer", async function () {
      const expiryTime = BigInt(Math.floor(Date.now() / 1000) + 86400);
      
      await marketplace.write.makeCollectionOffer([
        nftCollection.address,
        parseEther("0.5"),
        expiryTime,
        "0x0000000000000000000000000000000000000000"
      ], {
        account: buyer.account,
        value: parseEther("0.5")
      });

      const offer = await marketplace.read.getCollectionOffer([nftCollection.address, buyer.account.address]);
      assert.equal(offer.active, true);
    });

    it("Should fail offer with invalid expiry", async function () {
      const expiryTime = BigInt(Math.floor(Date.now() / 1000) + 100);
      
      try {
        await marketplace.write.makeOffer([
          nftCollection.address,
          1n,
          parseEther("1"),
          expiryTime,
          "0x0000000000000000000000000000000000000000"
        ], {
          account: buyer.account,
          value: parseEther("1")
        });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Invalid expiry"));
      }
    });
  });

  describe("Admin Functions", async function () {
    it("Should allow owner to set marketplace fee", async function () {
      await marketplace.write.setMarketplaceFeePercent([500n], { account: owner.account });
      
      const fee = await marketplace.read.marketplaceFeePercent();
      assert.equal(fee, 500n);
    });

    it("Should fail setting fee above max", async function () {
      try {
        await marketplace.write.setMarketplaceFeePercent([600n], { account: owner.account });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Fee too high"));
      }
    });

    it("Should allow owner to set fee recipient", async function () {
      await marketplace.write.setFeeRecipient([buyer.account.address], { account: owner.account });
      
      const recipient = await marketplace.read.feeRecipient();
      assert.equal(recipient.toLowerCase(), buyer.account.address.toLowerCase());
    });

    it("Should allow owner to pause", async function () {
      await marketplace.write.pause({ account: owner.account });
      
      let failed = false;
      try {
        await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });
        await marketplace.write.listItem([
          nftCollection.address,
          1n,
          parseEther("1"),
          "0x0000000000000000000000000000000000000000"
        ], { account: seller.account });
      } catch (error: any) {
        failed = true;
      }
      assert.equal(failed, true);
    });

    it("Should allow owner to unpause", async function () {
      await marketplace.write.pause({ account: owner.account });
      await marketplace.write.unpause({ account: owner.account });
      
      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });
      await marketplace.write.listItem([
        nftCollection.address,
        1n,
        parseEther("1"),
        "0x0000000000000000000000000000000000000000"
      ], { account: seller.account });

      const listing = await marketplace.read.getListing([nftCollection.address, 1n]);
      assert.equal(listing.active, true);
    });

    it("Should allow owner to set supported currency", async function () {
      await marketplace.write.setSupportedCurrency([buyer.account.address, true], { account: owner.account });

      const supported = await marketplace.read.supportedCurrencies([buyer.account.address]);
      assert.equal(supported, true);
    });
  });

  describe("Security: Auction bid ordering", async function () {
    it("Should reject a bid that does not exceed the current highest bid", async function () {
      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });

      await marketplace.write.createAuction([
        nftCollection.address,
        1n,
        parseEther("0.5"),
        parseEther("1"),
        86400n,
        "0x0000000000000000000000000000000000000000"
      ], { account: seller.account });

      const accounts = await viem.getWalletClients();
      const bidder2 = accounts[4];

      // First bid succeeds
      await marketplace.write.placeBid([nftCollection.address, 1n], {
        account: buyer.account,
        value: parseEther("0.6")
      });

      // Equal bid must be rejected
      try {
        await marketplace.write.placeBid([nftCollection.address, 1n], {
          account: bidder2.account,
          value: parseEther("0.6")
        });
        assert.fail("Should have reverted: equal bid");
      } catch (error: any) {
        assert.ok(error.message.includes("Bid not higher"));
      }

      // Lower bid must be rejected
      try {
        await marketplace.write.placeBid([nftCollection.address, 1n], {
          account: bidder2.account,
          value: parseEther("0.5")
        });
        assert.fail("Should have reverted: lower bid");
      } catch (error: any) {
        assert.ok(error.message.includes("Bid not higher"));
      }

      // Higher bid must succeed and the previous bidder is refunded
      const prevBidderBalanceBefore = await publicClient.getBalance({ address: buyer.account.address });
      await marketplace.write.placeBid([nftCollection.address, 1n], {
        account: bidder2.account,
        value: parseEther("0.7")
      });
      const prevBidderBalanceAfter = await publicClient.getBalance({ address: buyer.account.address });
      assert.ok(prevBidderBalanceAfter > prevBidderBalanceBefore, "Previous bidder should be refunded");

      const auction = await marketplace.read.getAuction([nftCollection.address, 1n]);
      assert.equal(auction.highestBid, parseEther("0.7"));
      assert.equal(auction.highestBidder.toLowerCase(), bidder2.account.address.toLowerCase());
    });

    it("Should reject bid below starting price even when no prior bids", async function () {
      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });

      await marketplace.write.createAuction([
        nftCollection.address,
        1n,
        parseEther("1"),
        parseEther("2"),
        86400n,
        "0x0000000000000000000000000000000000000000"
      ], { account: seller.account });

      try {
        await marketplace.write.placeBid([nftCollection.address, 1n], {
          account: buyer.account,
          value: parseEther("0.9")
        });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Below starting price"));
      }
    });
  });

  describe("Security: Fee and payment accuracy", async function () {
    it("Should accumulate correct marketplace fees on sale", async function () {
      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });

      await marketplace.write.listItem([
        nftCollection.address,
        1n,
        parseEther("1"),
        "0x0000000000000000000000000000000000000000"
      ], { account: seller.account });

      const feesBefore = await marketplace.read.accumulatedFees();

      await marketplace.write.buyItem([nftCollection.address, 1n], {
        account: buyer.account,
        value: parseEther("1")
      });

      const feesAfter = await marketplace.read.accumulatedFees();
      // 1.5% of 1 ETH = 0.015 ETH
      assert.equal(feesAfter - feesBefore, parseEther("0.015"));
    });

    it("Should refund overpayment to buyer", async function () {
      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });

      await marketplace.write.listItem([
        nftCollection.address,
        1n,
        parseEther("1"),
        "0x0000000000000000000000000000000000000000"
      ], { account: seller.account });

      const buyerBalanceBefore = await publicClient.getBalance({ address: buyer.account.address });

      // Overpay by 0.5 ETH
      await marketplace.write.buyItem([nftCollection.address, 1n], {
        account: buyer.account,
        value: parseEther("1.5")
      });

      const buyerBalanceAfter = await publicClient.getBalance({ address: buyer.account.address });
      // Net spend should be ~1 ETH plus gas, not 1.5 ETH
      const spent = buyerBalanceBefore - buyerBalanceAfter;
      // Allow up to 0.01 ETH for gas; overpayment (0.5 ETH) must be refunded
      assert.ok(spent < parseEther("1.01"), "Overpayment should be refunded");
    });

    it("Should only allow owner to withdraw fees", async function () {
      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });
      await marketplace.write.listItem([
        nftCollection.address,
        1n,
        parseEther("1"),
        "0x0000000000000000000000000000000000000000"
      ], { account: seller.account });
      await marketplace.write.buyItem([nftCollection.address, 1n], {
        account: buyer.account,
        value: parseEther("1")
      });

      try {
        await marketplace.write.withdrawFees({ account: seller.account });
        assert.fail("Non-owner should not withdraw fees");
      } catch (error: any) {
        assert.ok(
          error.message.includes("OwnableUnauthorizedAccount") ||
          error.message.includes("Ownable"),
          "Expected ownership revert"
        );
      }
    });

    it("Should not allow changing fee above 5%", async function () {
      try {
        await marketplace.write.setMarketplaceFeePercent([501n], { account: owner.account });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Fee too high"));
      }
    });
  });

  describe("Security: Access control", async function () {
    it("Should prevent non-owner from pausing", async function () {
      try {
        await marketplace.write.pause({ account: seller.account });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(
          error.message.includes("OwnableUnauthorizedAccount") ||
          error.message.includes("Ownable")
        );
      }
    });

    it("Should prevent non-owner from setting fee recipient", async function () {
      try {
        await marketplace.write.setFeeRecipient([buyer.account.address], { account: seller.account });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(
          error.message.includes("OwnableUnauthorizedAccount") ||
          error.message.includes("Ownable")
        );
      }
    });

    it("Should reject zero address as fee recipient", async function () {
      try {
        await marketplace.write.setFeeRecipient(
          ["0x0000000000000000000000000000000000000000"],
          { account: owner.account }
        );
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Invalid recipient"));
      }
    });

    it("Should prevent buyer from cancelling seller listing", async function () {
      await nftCollection.write.setApprovalForAll([marketplace.address, true], { account: seller.account });
      await marketplace.write.listItem([
        nftCollection.address,
        1n,
        parseEther("1"),
        "0x0000000000000000000000000000000000000000"
      ], { account: seller.account });

      try {
        await marketplace.write.cancelListing([nftCollection.address, 1n], { account: buyer.account });
        assert.fail("Should have reverted");
      } catch (error: any) {
        assert.ok(error.message.includes("Not seller"));
      }
    });
  });
});
