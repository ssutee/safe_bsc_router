const { default: BigNumber } = require("bignumber.js");
const { expect } = require("chai");
const { web3, artifacts } = require("hardhat");
const { toWei, fromWei } = require("web3-utils");

const IERC20 = artifacts.require("IERC20");
const IUniswapRouterETH = artifacts.require("IUniswapRouterETH");
const SafeBscRouter = artifacts.require("SafeBscRouter");

describe("SafeBscRouter", function () {
  let deployer, feeAddress, bob, marry, john;
  let pancakeRouter, safeBscRouter;
  let busdToken, bakeToken;
  const feePercent = 0.3;
  let precision = BigNumber(toWei("1"));

  before(async function () {
    accounts = await web3.eth.getAccounts();
    deployer = accounts[0];
    feeAddress = accounts[1];
    bob = accounts[2];
    marry = accounts[3];
    john = accounts[4];
    newFeeAddress = accounts[5];

    pancakeRouter = await IUniswapRouterETH.at(
      "0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F"
    );
    busdToken = await IERC20.at("0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56");
    wbnbToken = await IERC20.at("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c");
    bakeToken = await IERC20.at("0xE02dF9e3e622DeBdD69fb838bB799E3F168902c5");
  });

  beforeEach(async function () {
    safeBscRouter = await SafeBscRouter.new(
      precision.times(feePercent).toString(),
      feeAddress
    );
  });

  describe("constructor", async function () {
    it("assigns properties", async function () {
      expect(await safeBscRouter.feeAddress()).to.eq(feeAddress);
      expect((await safeBscRouter.feePercent()).toString()).to.eq(
        precision.times(feePercent).toString()
      );
    });
  });

  describe("setFeePercent", async function () {
    it("should revert if caller is not owner", async function () {
      await expect(
        safeBscRouter.setFeePercent(toWei("1"), { from: bob })
      ).revertedWith("caller is not the owner");
    });
    it("should revert if fee percent is more than 3%", async function () {
      await expect(
        safeBscRouter.setFeePercent(toWei("4"), { from: deployer })
      ).revertedWith(">maximum limit");
    });
    it("should set fee percent", async function () {
      await safeBscRouter.setFeePercent(toWei("1"), { from: deployer });
      const feePercent = await safeBscRouter.feePercent();
      expect(toWei("1")).to.eq(feePercent.toString());
    });
  });

  describe("setFeeAddress", async function () {
    it("should revert if caller is not owner", async function () {
      await expect(
        safeBscRouter.setFeeAddress(newFeeAddress, { from: bob })
      ).revertedWith("caller is not the owner");
    });
    it("should revert if address is the same", async function () {
      await expect(
        safeBscRouter.setFeeAddress(feeAddress, { from: deployer })
      ).revertedWith("same address");
    });
    it("should revert if address is zero address", async function () {
      await expect(
        safeBscRouter.setFeeAddress(
          "0x0000000000000000000000000000000000000000",
          { from: deployer }
        )
      ).revertedWith("invalid address");
    });
    it("should set fee address", async function () {
      await safeBscRouter.setFeeAddress(newFeeAddress, { from: deployer });
      const currentFeeAddress = await safeBscRouter.feeAddress();
      expect(currentFeeAddress).to.eq(newFeeAddress);
    });
  });

  describe("swapExactTokensForTokens", async function () {
    it("should swap and reduce output at fee percent", async function () {
      let currentBlock = await web3.eth.getBlock("latest");
      await pancakeRouter.swapExactETHForTokens(
        0,
        [wbnbToken.address, busdToken.address],
        bob,
        currentBlock.timestamp + 60,
        { value: toWei("100"), from: bob }
      );

      currentBlock = await web3.eth.getBlock("latest");
      await busdToken.approve(safeBscRouter.address, toWei("100"), {
        from: bob,
      });
      await safeBscRouter.swapExactTokensForTokens(
        pancakeRouter.address,
        toWei("100"),
        0,
        [busdToken.address, bakeToken.address],
        bob,
        currentBlock.timestamp + 60,
        { from: bob }
      );
      console.log(
        "Bob's Bake Amount:",
        fromWei((await bakeToken.balanceOf(bob)).toString())
      );
      console.log(
        "Dev's Bake Amount:",
        fromWei((await bakeToken.balanceOf(feeAddress)).toString())
      );
    });
  });

  describe("swapExactETHForTokens", async function () {
    it("should swap and reduce output at fee percent", async function () {
      let currentBlock = await web3.eth.getBlock("latest");
      await safeBscRouter.swapExactETHForTokens(
        pancakeRouter.address,
        0,
        [wbnbToken.address, bakeToken.address],
        marry,
        currentBlock.timestamp + 60,
        { value: toWei("100"), from: marry }
      );
      console.log(
        "Marry's Bake Amount:",
        fromWei((await bakeToken.balanceOf(marry)).toString())
      );
      console.log(
        "Dev's Bake Amount:",
        fromWei((await bakeToken.balanceOf(feeAddress)).toString())
      );
    });
  });

  describe("swapExactTokensForETH", async function () {
    it("should swap and reduce output at fee percent", async function () {
      let currentBlock = await web3.eth.getBlock("latest");
      await pancakeRouter.swapExactETHForTokens(
        0,
        [wbnbToken.address, busdToken.address],
        john,
        currentBlock.timestamp + 60,
        { value: toWei("100"), from: john }
      );
      console.log(
        "John's BNB Amount:",
        fromWei((await web3.eth.getBalance(john)).toString())
      );
      currentBlock = await web3.eth.getBlock("latest");
      let busdAmount = BigNumber((await busdToken.balanceOf(john)).toString());
      console.log("John's BUSD Amount", fromWei(busdAmount.toFixed()));

      await busdToken.approve(safeBscRouter.address, busdAmount.toFixed(), {
        from: john,
      });
      await safeBscRouter.swapExactTokensForETH(
        pancakeRouter.address,
        busdAmount.toFixed(),
        0,
        [busdToken.address, wbnbToken.address],
        john,
        currentBlock.timestamp + 60,
        { from: john }
      );
      console.log(
        "John's BNB Amount:",
        fromWei((await web3.eth.getBalance(john)).toString())
      );
      console.log(
        "Dev's BNB Amount:",
        fromWei((await web3.eth.getBalance(feeAddress)).toString())
      );
    });
  });
});
