const { default: BigNumber } = require("bignumber.js");
const { expect } = require("chai");
const { web3, artifacts } = require("hardhat");
const { toWei } = require("web3-utils");

const IERC20 = artifacts.require("IERC20");
const IUniswapRouterETH = artifacts.require("IUniswapRouterETH");
const SafeBscRouter = artifacts.require("SafeBscRouter");

let deployer, feeAddress, bob;
let pancakeRouter, safeBscRouter;
let busdToken, sczToken;
const feePercent = 0.3;
let precision = BigNumber(toWei("1"));

const main = async () => {
  const accounts = await web3.eth.getAccounts();
  const deployer = accounts[0];
  const feeAddress = accounts[1];
  safeBscRouter = await SafeBscRouter.new(precision.times(feePercent).toString(), feeAddress);
  console.log("SafeBscRouter:", safeBscRouter.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });