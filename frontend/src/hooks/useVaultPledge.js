import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { getContractAddress, ABI } from "../utils/contract";
import { cache, serializeVault } from "../utils/helpers";

const getProvider = () => window.ethereum ? new ethers.BrowserProvider(window.ethereum) : null;

// ── useWallet ─────────────────────────────────────────────────────────────────
export function useWallet() {
  const [account,    setAccount]    = useState(null);
  const [chainId,    setChainId]    = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    if (!window.ethereum) return;
    const p = getProvider();
    p.listAccounts().then(a => a[0] && setAccount(a[0].address)).catch(()=>{});
    p.getNetwork().then(n => setChainId(Number(n.chainId))).catch(()=>{});
    
    const hA = a => setAccount(a[0]?.address ?? (a[0] || null));
    const hC = c => setChainId(parseInt(c,16));

    window.ethereum.on("accountsChanged", hA);
    window.ethereum.on("chainChanged",    hC);
    return () => {
      window.ethereum.removeListener("accountsChanged", hA);
      window.ethereum.removeListener("chainChanged",    hC);
    };
  }, []);

  const connect = async () => {
    if (!window.ethereum) { setError("MetaMask not found. Install it at metamask.io"); return; }
    setConnecting(true); setError(null);
    try {
      const p = getProvider();
      await p.send("eth_requestAccounts", []);
      const s = await p.getSigner();
      const n = await p.getNetwork();
      setAccount(s.address); setChainId(Number(n.chainId));
    } catch(e) {
      console.error("Connect error:", e);
      if (e.code === 4001) {
        try {
          await window.ethereum.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] });
          const p = getProvider();
          const s = await p.getSigner();
          setAccount(s.address);
        } catch (err) {
          setError("Connection rejected. Please approve the request in MetaMask.");
        }
      } else if (e.code === -32002) {
        setError("Connection request already pending. Open your wallet!");
      } else {
        setError(e.message || "Failed to connect wallet.");
      }
    } finally { setConnecting(false); }
  };

  const disconnect = () => { setAccount(null); setChainId(null); setError(null); };
  const isCorrectNetwork = !account || chainId === 11155111 || chainId === 31337;
  
  useEffect(() => {
    if (account && !isCorrectNetwork) {
      console.warn(`[Wallet] Incorrect network detected: ${chainId}. Please switch to Sepolia (11155111) or Hardhat (31337).`);
    }
  }, [account, chainId, isCorrectNetwork]);

  return { account, chainId, connecting, error, connect, disconnect, isCorrectNetwork };
}

// ── useVaults ─────────────────────────────────────────────────────────────────
export function useVaults(account, chainId) {
  const [vaults,    setVaults]    = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const dead = useRef(false);

  const fetchVaults = useCallback(async (force = false) => {
    if (!window.ethereum || !account) return;
    if (chainId !== 11155111 && chainId !== 31337) return;
    
    const addr = getContractAddress(chainId);
    if (!addr || addr === "0x0000000000000000000000000000000000000000") {
      setError(`Contract address not configured for chain ${chainId}`);
      return;
    }

    if (!force) { const c = cache.read(); if (c) { setVaults(c); return; } }
    dead.current = false;
    setLoading(true); setError(null);
    try {
      console.log(`[useVaults] Fetching from ${addr} on Chain ${chainId}`);
      const p = getProvider();
      const c = new ethers.Contract(addr, ABI, p);
      const raw = await c.getAllVaults();
      if (dead.current) return;
      const data = raw.map(serializeVault);
      setVaults(data); cache.write(data); setLastFetch(Date.now());
    } catch(e) {
      if (!dead.current) setError(e.message || "Failed to load vaults.");
    } finally {
      if (!dead.current) setLoading(false);
    }
  }, [account, chainId]);

  useEffect(() => { fetchVaults(); return () => { dead.current = true; }; }, [fetchVaults]);

  const refetch = () => { cache.clear(); fetchVaults(true); };
  return { vaults, loading, error, refetch, lastFetch };
}

// ── useContractWrite ──────────────────────────────────────────────────────────
export function useContractWrite() {
  const [txState, setTx] = useState({ status:"idle", hash:null, error:null });
  const reset = () => setTx({ status:"idle", hash:null, error:null });

  const parseErr = e =>
    e.code === 4001 ? "Rejected in wallet." :
    e.reason        ? e.reason :
    e.shortMessage  ? e.shortMessage :
    e.message?.includes("insufficient funds") ? "Insufficient ETH." :
    e.message || "Transaction failed.";

  async function send(fn) {
    setTx({ status:"waiting", hash:null, error:null });
    try {
      const p  = getProvider(); if (!p) throw new Error("No wallet");
      const n  = await p.getNetwork();
      const addr = getContractAddress(Number(n.chainId));
      const s  = await p.getSigner();
      const tx = await fn(s, addr);
      setTx({ status:"pending", hash:tx.hash, error:null });
      await tx.wait();
      setTx({ status:"success", hash:tx.hash, error:null });
      cache.clear();
      return tx.hash;
    } catch(e) {
      setTx({ status:"error", hash:null, error:parseErr(e) });
      throw e;
    }
  }

  const createVault = ({ title, description, goal, durationDays }) =>
    send((s, addr) => new ethers.Contract(addr, ABI, s)
      .createVault(title, description, ethers.parseEther(goal), BigInt(durationDays)));

  const pledgeToVault = (id, eth) =>
    send((s, addr) => new ethers.Contract(addr, ABI, s)
      .pledge(BigInt(id), { value: ethers.parseEther(eth) }));

  const releaseVault = id =>
    send((s, addr) => new ethers.Contract(addr, ABI, s).release(BigInt(id)));

  const refundVault = id =>
    send((s, addr) => new ethers.Contract(addr, ABI, s).refund(BigInt(id)));

  return { txState, reset, createVault, pledgeToVault, releaseVault, refundVault };
}
