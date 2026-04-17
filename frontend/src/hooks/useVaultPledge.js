import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { getContractAddress, ABI } from "../utils/contract";
import { cache, serializeVault } from "../utils/helpers";

import { isConnected, requestAccess, getAddress, getNetwork } from "@stellar/freighter-api";

const getProvider = () => window.ethereum ? new ethers.BrowserProvider(window.ethereum) : null;

// ── useWallet ─────────────────────────────────────────────────────────────────
export function useWallet() {
  const [account,    setAccount]    = useState(null);
  const [network,    setNetwork]    = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error,      setError]      = useState(null);

  const checkConnection = useCallback(async () => {
    try {
      if (await isConnected()) {
        const { address } = await getAddress();
        if (address) {
          setAccount(address);
          const net = await getNetwork();
          setNetwork(typeof net === 'object' ? net.network : net);
        }
      }
    } catch (e) {
      console.error("Freighter check error:", e);
    }
  }, []);

  useEffect(() => {
    checkConnection();
    // Freighter doesn't have an easy event listener for account changes 
    // without polling or using their more advanced API, but this is a good start.
  }, [checkConnection]);

  const connect = async () => {
    setConnecting(true); setError(null);
    try {
      if (!(await isConnected())) {
        setError("Freighter not found. Please install the Freighter extension.");
        return;
      }
      
      const { address, error: accessError } = await requestAccess();
      
      if (accessError) {
        setError(accessError);
        return;
      }

      if (address) {
        setAccount(address);
        const net = await getNetwork();
        setNetwork(typeof net === 'object' ? net.network : net);
      }
    } catch(e) {
      console.error("Connect error:", e);
      setError(e.message || "Failed to connect to Freighter.");
    } finally { setConnecting(false); }
  };

  const disconnect = () => { setAccount(null); setNetwork(null); setError(null); };
  
  // For Stellar, we usually check if we are on TESTNET or PUBLIC
  const isCorrectNetwork = !account || network === "TESTNET" || network === "FUTURENET";
  
  return { account, network, connecting, error, connect, disconnect, isCorrectNetwork, chainId: network };
}

// ── useVaults (Simulated Stellar Ledger) ──────────────────────────────────────
export function useVaults(account, network) {
  const [vaults,    setVaults]    = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchVaults = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    try {
      // Simulate network latency
      await new Promise(r => setTimeout(r, 600));
      const local = JSON.parse(localStorage.getItem("stellar_vaults") || "[]");
      setVaults(local);
      setLastFetch(Date.now());
    } catch(e) {
      setError("Failed to load vaults from Stellar simulation.");
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => { fetchVaults(); }, [fetchVaults]);

  const refetch = () => fetchVaults();
  return { vaults, loading, error, refetch, lastFetch };
}

// ── useContractWrite (Simulated Stellar Ledger) ───────────────────────────────
export function useContractWrite() {
  const [txState, setTx] = useState({ status:"idle", hash:null, error:null });
  const reset = () => setTx({ status:"idle", hash:null, error:null });

  async function mockSend(action) {
    setTx({ status:"waiting", hash:null, error:null });
    try {
      await new Promise(r => setTimeout(r, 800)); // Simulating bridge/wallet
      setTx({ status:"pending", hash:"tx_" + Math.random().toString(36).slice(2, 12), error:null });
      
      const vaults = JSON.parse(localStorage.getItem("stellar_vaults") || "[]");
      const newVaults = action(vaults);
      localStorage.setItem("stellar_vaults", JSON.stringify(newVaults));
      
      await new Promise(r => setTimeout(r, 1200)); // Simulating finality
      setTx({ status:"success", hash:null, error:null });
    } catch (e) {
      setTx({ status:"error", hash:null, error: e.message });
    }
  }

  const createVault = ({ title, description, goal, durationDays }) =>
    mockSend((list) => [...list, {
      id: list.length + 1, creator: "Current User", title, description,
      goal: (parseFloat(goal) * 1e7).toString(), raised: "0",
      deadline: (Math.floor(Date.now()/1000) + durationDays * 86400).toString(),
      released: false, exists: true
    }]);

  const pledgeToVault = (id, xlm) =>
    mockSend((list) => list.map(v => v.id == id 
      ? { ...v, raised: (BigInt(v.raised) + BigInt(parseFloat(xlm) * 1e7)).toString() } 
      : v));

  const releaseVault = id =>
    mockSend((list) => list.map(v => v.id == id ? { ...v, released: true } : v));

  const refundVault = id =>
    mockSend((list) => list.map(v => v.id == id ? { ...v, raised: "0" } : v));

  return { txState, reset, createVault, pledgeToVault, releaseVault, refundVault };
}
