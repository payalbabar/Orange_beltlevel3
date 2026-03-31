const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const envPath = path.join(__dirname, "frontend", ".env.local");
  const env = fs.readFileSync(envPath, "utf8");
  const addr = env.split("=")[1].trim();

  const contract = await ethers.getContractAt("VaultPledge", addr);
  const result = await contract.getAllVaults();
  console.log("Result:", result);
}

main().catch(console.error);
