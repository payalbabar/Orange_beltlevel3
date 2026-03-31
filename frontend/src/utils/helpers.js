import { ethers } from "ethers";

export const fmt = {
  eth: (wei) => {
    try { return parseFloat(ethers.formatEther(BigInt(wei ?? 0))).toFixed(4); }
    catch { return "0.0000"; }
  },
  addr: (a) => a ? `${a.slice(0,6)}…${a.slice(-4)}` : "—",
  date: (ts) => ts ? new Date(Number(ts)*1000).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—",
  pct:  (raised, goal) => {
    try {
      const r = BigInt(raised ?? 0), g = BigInt(goal ?? 0);
      if (g === 0n) return 0;
      return Math.min(100, Math.round(Number(r * 10000n / g) / 100));
    } catch { return 0; }
  },
  timeLeft: (ts, status) => {
    if (status === "released" || status === "failed") return "Ended";
    const diff = Number(ts) - Math.floor(Date.now()/1000);
    if (diff <= 0) return "Ended";
    const d = Math.floor(diff/86400), h = Math.floor((diff%86400)/3600);
    return d > 0 ? `${d}d ${h}h left` : `${h}h ${Math.floor((diff%3600)/60)}m left`;
  },
};

export function vaultStatus(v) {
  const now = Math.floor(Date.now()/1000);
  const dl  = Number(v.deadline);
  const met = BigInt(v.raised ?? 0) >= BigInt(v.goal ?? 0);
  if (v.released)           return "released";
  if (dl < now && !met)     return "failed";
  if (dl < now &&  met)     return "claimable";
  if (met)                  return "funded";
  return "active";
}

export function serializeVault(v) {
  return {
    id: v.id.toString(), creator: v.creator, title: v.title,
    description: v.description, goal: v.goal.toString(),
    raised: v.raised.toString(), deadline: v.deadline.toString(),
    released: v.released, exists: v.exists,
  };
}

const KEY = "vp_cache_v1", TTL = 30000;
export const cache = {
  read: () => { try { const d=JSON.parse(localStorage.getItem(KEY)||"null"); return d&&Date.now()-d.ts<TTL?d.data:null; } catch{return null;} },
  write: (data) => { try { localStorage.setItem(KEY,JSON.stringify({data,ts:Date.now()})); } catch{} },
  clear: () => { try { localStorage.removeItem(KEY); } catch{} },
};
