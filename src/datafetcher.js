require("dotenv").config();
const txn = require("@stacks/transactions");
const { StacksMainnet } = require("@stacks/network");
const mongoose = require("mongoose");
const dataModel = require("./datamodel");

const rpcUrl = process.env.RPC_URL;
const connectionString = process.env.MONGODB_CONNECTION_STRING;

let data = {
  prices: { stx: 0, uwu: 0, susdt: 0 },
  oracle: { price: 0, timestamp: { proxy: 0, source: 0 } },
  system: { collateral: { stx: 0, usd: 0 }, debt: 0, ratio: 0, vaults: { total: 0, active: 0, liquidated: 0 }, holders: { uwu: 0 }, new: { collateral: { stx: 0 }, debt: 0 } },
  revenue: { borrow: 0, usm: 0, new: { borrow: 0, usm: 0 } },
  usm: { uwu: 0, susdt: 0, usd: 0, feeX: 0, feeY: 0 },
  treasury: { id: "uwu.id", balances: { uwu: 0, stx: 0, susdt: 0, usd: 0 } },
  pools: { "SP1Z92MPDQEWZXW36VX71Q25HKF5K2EPCJ304F275-liquidity-token-v5kglq1fqfp": { uwu: 0, stx: 0, usd: 0 } }
};

if (!rpcUrl || !connectionString) {
  console.error(`[Data Fetcher - ${Date.now()}] Missing one or more of the required environment variables.`);
  process.exit(1);
};

mongoose.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log(`[Data Fetcher - ${Date.now()}] Successfully connected to MongoDB database.`))
  .catch(err => {
    console.error(`[Data Fetcher - ${Date.now()}] An error occurred while connecting to MongoDB database using ${connectionString}.`);
    throw new Error(`ERROR: ${err}`);
  });

const fetchJSON = async (url) => {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (err) {
    console.error(`[Data Fetcher - ${Date.now()}] An error occurred while fetching data from ${url}.`);
    throw new Error(`ERROR: ${err}`);
  };
};

const callReadOnly = async (contractAddress, contractName, functionName) => {
  const options = {
    contractAddress,
    contractName,
    functionName,
    functionArgs: [],
    network: new StacksMainnet(),
    senderAddress: "SP2AKWJYC7BNY18W1XXKPGP0YVEK63QJG4793Z2D4",
  };

  try {
    return await txn.callReadOnlyFunction(options);
  } catch (err) {
    console.error(`[Data Fetcher - ${Date.now()}] An error occurred while calling a read only function from ${contractAddress}.${contractName}.${functionName}.`);
    throw new Error(`ERROR: ${err}`);
  };
};

const fetchTokenBalance = async (token, address, type = "balance") => {
  const url = `${rpcUrl}/extended/v1/address/${address}/balances?unanchored=true`;
  const response = await fetchJSON(url);

  const balance = token === "stx"
    ? response.stx?.[type]
    : response.fungible_tokens?.[token]?.[type];

  if (balance === undefined) {
    console.error(`[Data Fetcher - ${Date.now()}] An error occurred while fetching a token balance from ${address}.`);
    throw new Error(`ERROR: Missing ${type} for token ${token} in response.`);
  };

  return balance;
};

const fetchTimestamp = async (address) => {
  const url = `${rpcUrl}/extended/v1/address/${address}/transactions?limit=1`;
  const response = await fetchJSON(url);

  const timestamp = response.results?.[0]?.burn_block_time;

  if (timestamp === undefined) {
    console.error(`[Data Fetcher - ${Date.now()}] An error occurred while fetching a recent transaction timestamp from ${address}.`)
    throw new Error(`ERROR: Missing burn_block_time in response.`);
  };

  return timestamp;
};

const fetchSTXBalance = (address, type = "balance") => fetchTokenBalance("stx", address, type);
const fetchUWUBalance = (address, type = "balance") => fetchTokenBalance("SP2AKWJYC7BNY18W1XXKPGP0YVEK63QJG4793Z2D4.uwu-token-v1-1-0::uwu", address, type);
const fetchSUSDTBalance = (address, type = "balance") => fetchTokenBalance("SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.token-susdt::bridged-usdt", address, type);

const fetchAllData = async () => {
  try {
    data.prices.stx = (await fetchJSON("https://api.coingecko.com/api/v3/simple/price?ids=blockstack&vs_currencies=usd")).blockstack.usd;
    data.prices.susdt = (await fetchJSON("https://api.coingecko.com/api/v3/simple/price?ids=alex-wrapped-usdt&vs_currencies=usd"))["alex-wrapped-usdt"].usd;

    data.oracle.price = Number((await callReadOnly("SP2AKWJYC7BNY18W1XXKPGP0YVEK63QJG4793Z2D4", "uwu-oracle-proxy-v1-1-0", "get-stx-price")).value.value) / 1000000;
    data.oracle.timestamp.source = await fetchTimestamp("SP32BWYT80264254QRAB4ZZSR1W14VTKSQ92Y1GZ3");
    data.oracle.timestamp.proxy = await fetchTimestamp("SP17BSF329AQEY7YA3CWQHN3KGQYTYYP7208CQH4G");

    data.system.collateral.stx = Number((await fetchJSON(`${rpcUrl}/extended/v1/address/SP2AKWJYC7BNY18W1XXKPGP0YVEK63QJG4793Z2D4.uwu-factory-v1-1-0/stx?unanchored=true`)).balance) / 1000000;
    data.system.collateral.usd = data.system.collateral.stx * data.prices.stx;
    data.system.debt = Number((await callReadOnly("SP2AKWJYC7BNY18W1XXKPGP0YVEK63QJG4793Z2D4", "uwu-token-v1-1-0", "get-total-supply")).value.value) / 1000000;
    data.system.ratio = ((data.system.collateral.stx * data.oracle.price) / data.system.debt) * 100;

    data.system.holders.uwu = 0;

    data.system.vaults.total = Number((await callReadOnly("SP2AKWJYC7BNY18W1XXKPGP0YVEK63QJG4793Z2D4", "uwu-factory-v1-1-0", "get-last-vault-id")).value.value);
    data.system.vaults.active = Number((await callReadOnly("SP2AKWJYC7BNY18W1XXKPGP0YVEK63QJG4793Z2D4", "uwu-factory-v1-1-0", "get-opened-vault-count")).value.value);
    data.system.vaults.liquidated = Number((await callReadOnly("SP2AKWJYC7BNY18W1XXKPGP0YVEK63QJG4793Z2D4", "uwu-factory-v1-1-0", "get-liquidated-vault-count")).value.value);

    data.revenue.borrow = Number(await fetchUWUBalance("SP2AKWJYC7BNY18W1XXKPGP0YVEK63QJG4793Z2D4.xuwu-fee-claim-v1-1-0", "total_received")) / 1000000;
    data.revenue.usm = Number(await fetchUWUBalance("SP2AKWJYC7BNY18W1XXKPGP0YVEK63QJG4793Z2D4", "total_received")) / 1000000 - 125;
    
    const docs = await dataModel.find().sort({ _id: -1 }).limit(2).exec();
    if(docs.length > 0) {
      data.revenue.new.borrow = data.revenue.borrow - docs[0].revenue.borrow;
      data.revenue.new.usm = data.revenue.usm - docs[0].revenue.usm;

      data.system.new.collateral.stx = data.system.collateral.stx - docs[0].system.collateral.stx;
      data.system.new.debt = data.system.debt - docs[0].system.debt;
    };

    data.usm.uwu = Number(await fetchUWUBalance("SP2AKWJYC7BNY18W1XXKPGP0YVEK63QJG4793Z2D4.uwu-stability-module-v1-1-0")) / 1000000;
    data.usm.susdt = Number(await fetchSUSDTBalance("SP2AKWJYC7BNY18W1XXKPGP0YVEK63QJG4793Z2D4.uwu-stability-module-v1-1-0")) / 100000000;
    data.usm.feeX = Number(0.50);
    data.usm.feeY = Number(0.00);

    data.treasury.balances.uwu = Number(await fetchUWUBalance("SP6BE9VJRG7YDAH46FC26FC3YYHNE8FA4E4EADTV")) / 1000000;
    data.treasury.balances.stx = Number(await fetchSTXBalance("SP6BE9VJRG7YDAH46FC26FC3YYHNE8FA4E4EADTV")) / 1000000;
    data.treasury.balances.susdt = Number(await fetchSUSDTBalance("SP6BE9VJRG7YDAH46FC26FC3YYHNE8FA4E4EADTV")) / 100000000;

    const lpData = (await callReadOnly("SP1Z92MPDQEWZXW36VX71Q25HKF5K2EPCJ304F275", "liquidity-token-v5kglq1fqfp", "get-lp-data")).value.data;
    data.pools["SP1Z92MPDQEWZXW36VX71Q25HKF5K2EPCJ304F275-liquidity-token-v5kglq1fqfp"].stx = Number(lpData["balance-x"].value) / 1000000;
    data.pools["SP1Z92MPDQEWZXW36VX71Q25HKF5K2EPCJ304F275-liquidity-token-v5kglq1fqfp"].uwu = Number(lpData["balance-y"].value) / 1000000;
    data.prices.uwu = Number((data.pools["SP1Z92MPDQEWZXW36VX71Q25HKF5K2EPCJ304F275-liquidity-token-v5kglq1fqfp"].stx / data.pools["SP1Z92MPDQEWZXW36VX71Q25HKF5K2EPCJ304F275-liquidity-token-v5kglq1fqfp"].uwu) * data.prices.stx);
    data.pools["SP1Z92MPDQEWZXW36VX71Q25HKF5K2EPCJ304F275-liquidity-token-v5kglq1fqfp"].usd = (data.pools["SP1Z92MPDQEWZXW36VX71Q25HKF5K2EPCJ304F275-liquidity-token-v5kglq1fqfp"].stx * data.prices.stx) + (data.pools["SP1Z92MPDQEWZXW36VX71Q25HKF5K2EPCJ304F275-liquidity-token-v5kglq1fqfp"].uwu * data.prices.uwu);

    data.usm.usd = (data.usm.uwu * data.prices.uwu) + (data.usm.susdt * data.prices.susdt);
    data.treasury.balances.usd = (data.treasury.balances.stx * data.prices.stx) + (data.treasury.balances.uwu * data.prices.uwu) + (data.treasury.balances.susdt * data.prices.susdt);

    const model = new dataModel(data);
    await model.save();
    console.log(`[Data Fetcher - ${Date.now()}] Successfully saved data to MongoDB database.`);

    await mongoose.disconnect();
    console.log(`[Data Fetcher - ${Date.now()}] Successfully disconnected from MongoDB database.`);
  } catch (err) {
    console.error(`[Data Fetcher - ${Date.now()}] An error occurred while fetching all data.`);
    throw new Error(`ERROR: ${err}`);
  };
};

fetchAllData();
