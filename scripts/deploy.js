const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const network    = await ethers.provider.getNetwork();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  VaultPledge · Deployment");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Network  :", network.name, `(${network.chainId})`);
  console.log("Deployer :", deployer.address);
  console.log("Balance  :", ethers.formatEther(
    await ethers.provider.getBalance(deployer.address)
  ), "ETH");

  const Factory  = await ethers.getContractFactory("VaultPledge");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const addr = await contract.getAddress();
  console.log("\n✅  Deployed:", addr);

  // Auto-write to frontend/.env.local
  const fs = require("fs");
  const path = require("path");
  const envPath = path.join(__dirname, "..", "frontend", ".env.local");
  fs.writeFileSync(envPath, `VITE_CONTRACT_ADDRESS=${addr}\n`);
  console.log("\n✅  Auto-updated frontend/.env.local with VITE_CONTRACT_ADDRESS=" + addr);
  
  console.log("\nNext →");
  console.log("  npx hardhat verify --network sepolia " + addr);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch(e => { console.error(e); process.exitCode = 1; });
