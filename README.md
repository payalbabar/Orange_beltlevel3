# ⬡ VaultPledge (Stellar Edition)

> **Trustless Crowdfunding · Orange Belt Level 3 Challenge · Stellar Testnet**

[![Stellar](https://img.shields.io/badge/Network-Stellar_Testnet-blue?logo=stellar)](https://stellar.expert/explorer/testnet)
[![Freighter](https://img.shields.io/badge/Wallet-Freighter-purple)](https://www.freighter.app/)
[![Vite](https://img.shields.io/badge/Frontend-Vite_%2B_React-646CFF?logo=vite)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-3_Passing-brightgreen)](#-tests)

---

## 🎯 Overview

**VaultPledge** is a premium decentralized crowdfunding platform migrated from Ethereum to the **Stellar Ecosystem**. It enables entrepreneurs and creators to raise funds in XLM through transparent "Vaults" that strictly enforce deadlines and funding goals.

This project represents the final submission for the **Orange Belt Level 3 Challenge**, demonstrating a full migration of smart contract logic into a Stellar-friendly architecture.

### 🔄 Migration Highlight: Ethereum → Stellar
- **Wallet**: Replaced MetaMask (EVM) with **Freighter** (Stellar).
- **Network**: Transitioned from Sepolia Testnet to **Stellar Testnet**.
- **Logic**: Adapted Solidity contract state into a high-performance **Stellar Simulation Ledger** (localStorage-based) to ensure 0-latency UX while maintaining the trustless "Vault" model.

---

## 🌐 Live Demo & Video

- **Live Deployment**: [https://orange-beltlevel3-vyoy.vercel.app/](https://orange-beltlevel3-vyoy.vercel.app/)
- **Demo Video**: [Actual Demo Link Here](https://youtu.be/example)

---

## ✨ Features

- **Freighter Authentication**: Secure, one-click connection using the leading Stellar browser wallet.
- **Vault Lifecycle Management**: 
  - **Creation**: Set titles, descriptions, XLM goals, and custom deadlines.
  - **Pledging**: Instantly contribute XLM from a Freighter wallet.
  - **Releasing**: Creators can only claim funds if the goal is met before the deadline.
  - **Refunds**: Pledgers are guaranteed their funds back if a project fails to hit its target.
- **Premium UX/UI**:
  - **Glassmorphism Design**: High-end frosted glass effects and vibrant gradients.
  - **Real-time Stats**: Track total raised across all vaults and current active counts.
  - **Interactive States**: Smooth transitions, loading skeletons, and transactional toasts.

---

## 🏗 Project Structure

```
orange-belt/
├── frontend/
│   ├── src/
│   │   ├── components/       ← UI Components & Modals
│   │   ├── hooks/            ← useVaultPledge (Core Logic)
│   │   ├── utils/            ← Freighter & Formatting Helpers
│   │   ├── App.jsx           ← Main Crowdfunding Dashboard
│   │   └── main.jsx
│   ├── tests/                ← Vitest Suite (Stellar Utilities)
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🧪 Tests

The project uses **Vitest** to ensure the integrity of Stellar address handling and XLM balance calculations.

![Test Results](./test_output.png)

| Test Case | Description | Status |
|---|---|---|
| XLM Formatting | Ensures XLM balances are padded to 2 decimal places | ✅ Passing |
| Key Slicing | Verifies shortened public keys (GABC...WXYZ) for UI safety | ✅ Passing |
| Amount Validation | Validates valid/invalid XLM inputs for transactions | ✅ Passing |

---

## 🚀 Local Development

### 1. Setup Environment
```bash
cd frontend
npm install
```

### 2. Configure Freighter
- Install [Freighter](https://www.freighter.app/).
- Switch network to **Testnet**.
- Fund your account via the [Stellar Friendbot](https://laboratory.stellar.org/#account-creator?network=testnet).

### 3. Launch App
```bash
npm run dev
```

---

## 🔐 Security & Operations

- **Non-Custodial**: Funds are simulated to be held in project-specific vaults.
- **Expiry Protection**: Built-in deadline checks prevent late pledges or early releases.
- **Responsive Layout**: Designed for seamless performance across desktops and mobile browsers.

---

MIT License · Orange Belt Level 3 dApp Challenge
