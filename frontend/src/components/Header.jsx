import React, { useState } from "react";
import { checkConnection, retrievePublicKey, getBalance, sendXLM } from "../utils/Freighter";
import { formatBalance, shortenKey } from "../utils/formatters";

/* ── Style Injection ──────────────────────────────────────────────────────── */
if (typeof document !== "undefined") {
  const el = document.createElement("style");
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
    body { margin: 0; padding: 0; font-family: 'Syne', sans-serif; overflow-x: hidden; }
    * { box-sizing: border-box; }
    input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  `;
  document.head.appendChild(el);
}

const Header = () => {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [balance, setBalance] = useState("0");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [txResult, setTxResult] = useState("");
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);

  const connectWallet = async () => {
    try {
      const allowed = await checkConnection();
      if (!allowed) return alert("Please allow Freighter access.");
      const key = await retrievePublicKey();
      const bal = await getBalance();
      setPublicKey(key);
      setBalance(formatBalance(bal));
      setConnected(true);
    } catch (e) {
      alert("Failed to connect: " + e.message);
    }
  };

  const disconnectWallet = () => {
    setConnected(false);
    setPublicKey("");
    setBalance("0");
    setDestination("");
    setAmount("");
    setTxResult("");
    setTxHash("");
  };

  const handleSend = async () => {
    if (!destination || !amount) {
      alert("Please enter destination and amount.");
      return;
    }
    try {
      setLoading(true);
      setTxResult("Sending...");
      setTxHash("");
      const res = await sendXLM(destination, amount);
      setTxResult("Transaction Successful!");
      setTxHash(res.hash);
      const bal = await getBalance();
      setBalance(formatBalance(bal));
    } catch (e) {
      setTxResult("Transaction Failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const shortKey = shortenKey(publicKey);

  // Common Styles for Premium Look
  const pageStyle = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
    fontFamily: "'Syne', sans-serif",
    color: "#fff",
    display: "flex",
    flexDirection: "column"
  };

  const navStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.25rem 2rem",
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    position: "sticky",
    top: 0,
    zIndex: 100
  };

  if (!connected) {
    return (
      <div style={pageStyle}>
        <nav style={navStyle}>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "800", color: "#a78bfa" }}>🌟 Stellar Pay</h1>
        </nav>
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "28px", padding: "40px", width: "100%", maxWidth: "480px", textAlign: "center", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
            <h2 style={{ fontSize: "2rem", fontWeight: "800", marginBottom: "8px" }}>Welcome to Stellar Pay</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "32px" }}>Send XLM instantly on the Stellar Testnet</p>
            <button 
              onClick={connectWallet} 
              style={{ width: "100%", padding: "16px", background: "linear-gradient(135deg, #7c3aed, #a78bfa)", border: "none", borderRadius: "14px", color: "#fff", fontSize: "1.1rem", fontWeight: "bold", cursor: "pointer", boxShadow: "0 10px 15px -3px rgba(124,58,237,0.3)", transition: "transform 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              🔗 Connect Freighter Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <nav style={navStyle}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "800", color: "#a78bfa" }}>🌟 Stellar Pay</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: "20px", padding: "6px 14px", fontSize: "13px", color: "#a78bfa", fontWeight: "600" }}>
            {"🔑 " + shortKey}
          </span>
          <span style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: "20px", padding: "6px 14px", fontSize: "13px", color: "#34d399", fontWeight: "600" }}>
            {"💰 " + balance + " XLM"}
          </span>
          <button onClick={disconnectWallet} style={{ background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444", borderRadius: "20px", padding: "6px 14px", fontSize: "13px", color: "#ef4444", fontWeight: "600", cursor: "pointer" }}>
            Disconnect
          </button>
        </div>
      </nav>

      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
        <div style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "28px", padding: "40px", width: "100%", maxWidth: "480px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
          <h2 style={{ fontSize: "1.85rem", fontWeight: "800", marginBottom: "16px", textAlign: "center" }}>Send XLM</h2>

          <div style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "18px", padding: "16px", textAlign: "center", marginBottom: "24px" }}>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", fontWeight: "600", margin: "0 0 4px 0" }}>Available Balance</p>
            <p style={{ color: "#34d399", fontSize: "32px", fontWeight: "900", margin: "0" }}>{balance} <span style={{ fontSize: "1.1rem" }}>XLM</span></p>
          </div>

          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px", fontWeight: "600", margin: "0 0 8px 8px" }}>Destination Address</p>
          <input
            type="text"
            placeholder="G... (Stellar address)"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            style={{ width: "100%", padding: "14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "15px", outline: "none", boxSizing: "border-box", marginBottom: "16px", fontFamily: "inherit" }}
          />

          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px", fontWeight: "600", margin: "0 0 8px 8px" }}>Amount (XLM)</p>
          <input
            type="number"
            placeholder="e.g. 10"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            style={{ width: "100%", padding: "14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "15px", outline: "none", boxSizing: "border-box", marginBottom: "16px", fontFamily: "inherit" }}
          />

          <button
            onClick={handleSend}
            disabled={loading}
            style={{ width: "100%", padding: "16px", background: loading ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg, #7c3aed, #a78bfa)", border: "none", borderRadius: "14px", color: "#fff", fontSize: "1.1rem", fontWeight: "bold", cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 10px 15px -3px rgba(124,58,237,0.3)", transition: "transform 0.2s" }}
            onMouseEnter={(e) => { if(!loading) e.currentTarget.style.transform = "scale(1.02)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            {loading ? "Processing..." : "🚀 Send XLM"}
          </button>

          {txResult !== "" && (
            <div style={{ marginTop: "20px", borderRadius: "16px", padding: "16px", background: txResult.includes("Successful") ? "rgba(52,211,153,0.05)" : txResult.includes("Failed") ? "rgba(239,68,68,0.05)" : "rgba(167,139,250,0.05)", border: txResult.includes("Successful") ? "1px solid rgba(52,211,153,0.3)" : txResult.includes("Failed") ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(167,139,250,0.3)" }}>
              <p style={{ margin: "0 0 8px 0", fontWeight: "bold", fontSize: "15px" }}>{txResult}</p>
              {txHash !== "" && (
                <div>
                  <p style={{ margin: "0 0 4px 0", color: "rgba(255,255,255,0.4)", fontSize: "12px", fontWeight: "600" }}>TRANSACTION HASH:</p>
                  <a href={"https://stellar.expert/explorer/testnet/tx/" + txHash} target="_blank" rel="noreferrer" style={{ color: "#a78bfa", fontSize: "13px", wordBreak: "break-all", textDecoration: "none", borderBottom: "1px dashed #a78bfa" }}>
                    {txHash}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;
