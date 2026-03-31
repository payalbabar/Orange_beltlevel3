const ADDRESSES = {
  31337: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", // Hardhat Local
  11155111: import.meta.env.VITE_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000" // Sepolia
};

export const getContractAddress = (chainId) => ADDRESSES[chainId] || ADDRESSES[31337];

// Keep for backward compatibility if needed, but we should move to dynamic
export const CONTRACT_ADDRESS = ADDRESSES[31337];

export const ABI = [
  "event VaultCreated(uint256 indexed id, address indexed creator, string title, uint256 goal, uint256 deadline)",
  "event Pledged(uint256 indexed id, address indexed pledger, uint256 amount)",
  "event Released(uint256 indexed id, address indexed creator, uint256 amount)",
  "event Refunded(uint256 indexed id, address indexed pledger, uint256 amount)",

  "function createVault(string calldata _title, string calldata _description, uint256 _goal, uint256 _durationDays) external returns (uint256 id)",
  "function pledge(uint256 _id) external payable",
  "function release(uint256 _id) external",
  "function refund(uint256 _id) external",

  "function vaultCount() external view returns (uint256)",
  "function getAllVaults() external view returns (tuple(uint256 id, address creator, string title, string description, uint256 goal, uint256 raised, uint256 deadline, bool released, bool exists)[])",
  "function getVault(uint256 _id) external view returns (tuple(uint256 id, address creator, string title, string description, uint256 goal, uint256 raised, uint256 deadline, bool released, bool exists))",
  "function getPledge(uint256 _id, address _pledger) external view returns (uint256)",
  "function isGoalMet(uint256 _id) external view returns (bool)",
];
