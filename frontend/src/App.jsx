import { useState } from "react";
import { useWallet, useVaults, useContractWrite } from "./hooks/useVaultPledge";
import { fmt, vaultStatus } from "./utils/helpers";

/* ── Global CSS injection ──────────────────────────────────────────────────── */
{
  const el = document.createElement("style");
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#0a0a0f;--surf:#13131c;--surf2:#191926;--brd:#1e1e2e;
      --txt:#e8e8f0;--dim:#6b6b8a;
      --a:#7c6af7;--a2:#f7b96a;--g:#5af7b9;--r:#f76a6a;
      --rd:12px;--mono:'DM Mono',monospace;--sans:'Syne',sans-serif;
    }
    html,body,#root{min-height:100vh;background:var(--bg);color:var(--txt);font-family:var(--sans)}
    ::selection{background:var(--a);color:#fff}
    input,textarea{
      font-family:var(--sans);font-size:.93rem;background:var(--bg);
      border:1px solid var(--brd);color:var(--txt);border-radius:var(--rd);
      padding:.72rem 1rem;width:100%;outline:none;transition:border-color .2s;
    }
    input:focus,textarea:focus{border-color:var(--a)}
    input::placeholder,textarea::placeholder{color:var(--dim)}
    textarea{resize:vertical;min-height:80px}
    button{font-family:var(--sans);cursor:pointer}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes shim{0%{background-position:-500px 0}100%{background-position:500px 0}}
    .up{animation:up .4s ease both}
    .skel{
      background:linear-gradient(90deg,var(--surf) 25%,var(--brd) 50%,var(--surf) 75%);
      background-size:500px 100%;animation:shim 1.3s infinite;border-radius:6px;
    }
    ::-webkit-scrollbar{width:5px}
    ::-webkit-scrollbar-thumb{background:var(--brd);border-radius:3px}
  `;
  document.head.appendChild(el);
}

/* ── Design tokens ─────────────────────────────────────────────────────────── */
const STATUS = {
  active:    { label:"Active",     color:"var(--a)",  bg:"#7c6af718", brd:"#7c6af730" },
  funded:    { label:"Goal Met",   color:"var(--g)",  bg:"#5af7b918", brd:"#5af7b930" },
  claimable: { label:"Claimable",  color:"var(--a2)", bg:"#f7b96a18", brd:"#f7b96a30" },
  failed:    { label:"Failed",     color:"var(--r)",  bg:"#f76a6a18", brd:"#f76a6a30" },
  released:  { label:"Released",   color:"var(--dim)",bg:"#6b6b8a18", brd:"#6b6b8a30" },
};

/* ── Atoms ─────────────────────────────────────────────────────────────────── */
function Spin({ size=15, color="currentColor" }) {
  return <span style={{
    display:"inline-block",width:size,height:size,flexShrink:0,
    border:`2px solid ${color}30`,borderTopColor:color,
    borderRadius:"50%",animation:"spin .65s linear infinite",
  }}/>;
}

function Btn({ children, onClick, disabled, loading, variant="primary", full, sz="md", style:xs={} }) {
  const V = {
    primary:  {background:"var(--a)",   color:"#fff",       border:"none"},
    secondary:{background:"transparent",color:"var(--txt)", border:"1px solid var(--brd)"},
    ghost:    {background:"transparent",color:"var(--dim)", border:"none"},
    success:  {background:"#5af7b915", color:"var(--g)",   border:"1px solid #5af7b940"},
    danger:   {background:"#f76a6a15", color:"var(--r)",   border:"1px solid #f76a6a40"},
  };
  const pad = sz==="sm"?".38rem .75rem":sz==="lg"?".85rem 2rem":".6rem 1.2rem";
  const off = disabled||loading;
  return (
    <button onClick={onClick} disabled={off} style={{
      display:"inline-flex",alignItems:"center",gap:7,padding:pad,borderRadius:10,
      fontSize:sz==="lg"?"1rem":".87rem",fontWeight:600,transition:"opacity .15s,transform .1s",
      opacity: off ? 0.5 : 1, cursor: off ? "not-allowed" : "pointer",
      width:full?"100%":undefined,justifyContent:full?"center":undefined,
      whiteSpace:"nowrap",...V[variant],...xs,
    }}
    onMouseEnter={e=>{if(!off)e.currentTarget.style.opacity=".8"}}
    onMouseLeave={e=>{e.currentTarget.style.opacity="1"}}
    onMouseDown ={e=>{if(!off)e.currentTarget.style.transform="scale(.97)"}}
    onMouseUp   ={e=>{e.currentTarget.style.transform="scale(1)"}}
    >
      {loading&&<Spin size={13} color={V[variant].color}/>}
      {children}
    </button>
  );
}

function Badge({ status }) {
  const s = STATUS[status]||STATUS.active;
  return <span style={{
    fontSize:".65rem",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",
    fontFamily:"var(--mono)",color:s.color,background:s.bg,
    border:`1px solid ${s.brd}`,borderRadius:5,padding:"2px 8px",whiteSpace:"nowrap",
  }}>{s.label}</span>;
}

function Bar({ pct, status }) {
  const c = pct>=100?"var(--g)":status==="failed"?"var(--a2)":"var(--a)";
  return (
    <div style={{height:6,background:"var(--brd)",borderRadius:3,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${Math.min(100,pct)}%`,background:c,borderRadius:3,
        transition:"width .7s cubic-bezier(.34,1.56,.64,1)"}}/>
    </div>
  );
}

function Card({ children, onClick, className="", style:xs={} }) {
  return (
    <div onClick={onClick} className={className} style={{
      background:"var(--surf)",border:"1px solid var(--brd)",
      borderRadius:"var(--rd)",padding:"1.5rem",
      transition:"border-color .2s,transform .2s,box-shadow .2s",
      cursor:onClick?"pointer":"default",...xs,
    }}
    onMouseEnter={e=>{if(onClick){e.currentTarget.style.borderColor="#7c6af750";e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 28px #7c6af712"}}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--brd)";e.currentTarget.style.transform="";e.currentTarget.style.boxShadow=""}}
    >{children}</div>
  );
}

function ErrBox({ msg }) {
  return msg ? (
    <div style={{background:"#f76a6a0e",border:"1px solid #f76a6a30",borderRadius:8,
      padding:".65rem 1rem",fontSize:".82rem",color:"var(--r)",marginTop:".7rem"}}>
      ⚠ {msg}
    </div>
  ) : null;
}

function TxStatus({ s, network="sepolia" }) {
  const link = `https://${network}.etherscan.io/tx/${s.hash}`;
  const Hash = () => s.hash ? (
    <a href={link} target="_blank" rel="noopener noreferrer" style={{
      fontSize:".75rem",fontFamily:"var(--mono)",color:"var(--a)",
      background:"#7c6af710",borderRadius:5,padding:"2px 8px",
      border:"1px solid #7c6af725",textDecoration:"none",
    }}>↗ {s.hash.slice(0,10)}…</a>
  ) : null;

  const row = (icon, msg, extra=null) => (
    <div style={{display:"flex",alignItems:"center",gap:8,fontSize:".82rem",color:"var(--dim)",marginTop:".7rem"}}>
      {icon}{msg}{extra}
    </div>
  );

  if (s.status==="waiting") return row(<Spin size={13} color="var(--dim)"/>, "Waiting for wallet…");
  if (s.status==="pending") return row(<Spin size={13} color="var(--a)"/>,  "Confirming on-chain…", <Hash/>);
  if (s.status==="success") return <div style={{marginTop:".7rem",fontSize:".82rem",color:"var(--g)",display:"flex",alignItems:"center",gap:8}}>✓ Confirmed! <Hash/></div>;
  if (s.status==="error")   return <ErrBox msg={s.error}/>;
  return null;
}

function Toast({ toast, clear }) {
  if (!toast) return null;
  const c = toast.type==="error"?"var(--r)":"var(--g)";
  return (
    <div style={{
      position:"fixed",bottom:24,right:24,zIndex:9999,
      background:"var(--surf)",border:`1px solid ${c}40`,borderLeft:`3px solid ${c}`,
      borderRadius:12,padding:"1rem 1.25rem",maxWidth:340,
      display:"flex",gap:10,alignItems:"flex-start",
      boxShadow:"0 8px 32px #00000080",animation:"up .3s ease",
      fontSize:".87rem",lineHeight:1.5,
    }}>
      <span style={{flex:1}}>{toast.msg}</span>
      <button onClick={clear} style={{background:"none",border:"none",color:"var(--dim)",fontSize:"1.3rem",lineHeight:1}}>×</button>
    </div>
  );
}

function Overlay({ onClose, children }) {
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{
      position:"fixed",inset:0,zIndex:1000,background:"#00000090",
      display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem",
    }}>{children}</div>
  );
}

function X({ onClick }) {
  return <button onClick={onClick} style={{background:"none",border:"none",color:"var(--dim)",fontSize:"1.5rem",lineHeight:1,padding:0}}>×</button>;
}

/* ── Skeleton ──────────────────────────────────────────────────────────────── */
function Skel() {
  return (
    <Card>
      <div className="skel" style={{height:18,width:"60%",marginBottom:10}}/>
      <div className="skel" style={{height:13,width:"85%",marginBottom:20}}/>
      <div className="skel" style={{height:6,marginBottom:14}}/>
      <div style={{display:"flex",justifyContent:"space-between"}}>
        <div className="skel" style={{height:12,width:"35%"}}/>
        <div className="skel" style={{height:12,width:"22%"}}/>
      </div>
    </Card>
  );
}

/* ── Create Modal ──────────────────────────────────────────────────────────── */
function CreateModal({ onClose, onSuccess }) {
  const { createVault, txState } = useContractWrite();
  const [f, setF] = useState({ title:"", desc:"", goal:"", days:"14" });
  const [e, setE] = useState({});
  const busy = txState.status==="waiting"||txState.status==="pending";

  const F = (id, label, type="text", ph="") => {
    const err = e[id];
    return (
      <div style={{marginBottom:"1rem"}}>
        <label style={{fontSize:".77rem",color:"var(--dim)",display:"block",marginBottom:5}}>{label}</label>
        {type==="textarea"
          ? <textarea placeholder={ph} value={f[id]} onChange={ev=>setF(p=>({...p,[id]:ev.target.value}))}/>
          : <input type={type} placeholder={ph} value={f[id]}
              onChange={ev=>setF(p=>({...p,[id]:ev.target.value}))}
              style={err?{borderColor:"var(--r)"}:{}}/>
        }
        {err&&<p style={{color:"var(--r)",fontSize:".73rem",marginTop:3}}>{err}</p>}
      </div>
    );
  };

  async function submit() {
    const errs={};
    if (!f.title.trim()) errs.title="Required";
    if (!f.goal||parseFloat(f.goal)<=0) errs.goal="Must be > 0";
    if (!f.days||parseInt(f.days)<1) errs.days="Min 1 day";
    if (Object.keys(errs).length) { setE(errs); return; }
    try {
      await createVault({ title:f.title, description:f.desc, goal:f.goal, durationDays:parseInt(f.days) });
      onSuccess();
    } catch{}
  }

  return (
    <Overlay onClose={onClose}>
      <Card style={{maxWidth:500,width:"100%",animation:"up .25s ease"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
          <h2 style={{fontSize:"1.2rem",fontWeight:700}}>Create Vault</h2>
          <X onClick={onClose}/>
        </div>
        {F("title","Vault Title *","text","Fund my indie game")}
        {F("desc","Description","textarea","What are you raising funds for?")}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
          {F("goal","Goal (XLM) *","number","100")}
          {F("days","Duration (days) *","number","14")}
        </div>
        <TxStatus s={txState}/>
        <div style={{display:"flex",gap:".75rem",justifyContent:"flex-end",marginTop:"1.25rem"}}>
          <Btn variant="secondary" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn onClick={submit} loading={busy}>
            {txState.status==="waiting"?"Confirm in wallet…":"Create Vault"}
          </Btn>
        </div>
      </Card>
    </Overlay>
  );
}

/* ── Vault Action Modal ─────────────────────────────────────────────────────── */
function VaultModal({ vault, account, onClose, onSuccess }) {
  const { pledgeToVault, releaseVault, refundVault, txState } = useContractWrite();
  const [amt, setAmt] = useState("");
  const [amtErr, setAmtErr] = useState("");
  const status    = vaultStatus(vault);
  const pct       = fmt.pct(vault.raised, vault.goal);
  const isCreator = account?.toLowerCase() === vault.creator?.toLowerCase();
  const busy      = txState.status==="waiting"||txState.status==="pending";

  const doPledge = async () => {
    if (!amt||parseFloat(amt)<=0) { setAmtErr("Enter a valid XLM amount"); return; }
    setAmtErr("");
    try { await pledgeToVault(vault.id, amt); onSuccess(); } catch{}
  };
  const doRelease = async () => { try { await releaseVault(vault.id); onSuccess(); } catch{} };
  const doRefund  = async () => { try { await refundVault(vault.id);  onSuccess(); } catch{} };

  return (
    <Overlay onClose={onClose}>
      <Card style={{maxWidth:500,width:"100%",animation:"up .25s ease"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.25rem"}}>
          <div>
            <Badge status={status}/>
            <h2 style={{fontSize:"1.15rem",fontWeight:700,marginTop:8}}>{vault.title}</h2>
          </div>
          <X onClick={onClose}/>
        </div>

        {vault.description&&(
          <p style={{fontSize:".87rem",color:"var(--dim)",marginBottom:"1.2rem",lineHeight:1.6}}>
            {vault.description}
          </p>
        )}

        {/* Progress */}
        <Bar pct={pct} status={status}/>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:9,fontSize:".84rem"}}>
          <span style={{fontWeight:600,fontFamily:"var(--mono)"}}>{fmt.eth(vault.raised)} XLM raised</span>
          <span style={{color:"var(--dim)"}}>of {fmt.eth(vault.goal)} XLM goal</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:".73rem",color:"var(--dim)",fontFamily:"var(--mono)"}}>
          <span>{pct}% funded</span>
          <span>{fmt.timeLeft(vault.deadline, status)}</span>
        </div>

        <hr style={{border:"none",borderTop:"1px solid var(--brd)",margin:"1.2rem 0"}}/>

        {/* Actions */}
        {status==="active"&&(
          <div style={{display:"flex",gap:".75rem"}}>
            <div style={{flex:1}}>
              <input type="number" min="0.1" step="0.1" placeholder="10 XLM"
                value={amt} onChange={e=>{setAmt(e.target.value);setAmtErr("")}}
                style={amtErr?{borderColor:"var(--r)"}:{}}/>
              {amtErr&&<p style={{color:"var(--r)",fontSize:".73rem",marginTop:3}}>{amtErr}</p>}
            </div>
            <Btn onClick={doPledge} loading={busy}>
              {txState.status==="waiting"?"Confirm…":"Pledge XLM"}
            </Btn>
          </div>
        )}
        {status==="claimable"&&isCreator&&(
          <Btn variant="success" full onClick={doRelease} loading={busy} xs={{padding:".85rem"}}>
            🎉 Release Funds to Wallet
          </Btn>
        )}
        {status==="claimable"&&!isCreator&&(
          <p style={{textAlign:"center",color:"var(--dim)",fontSize:".87rem"}}>
            Goal met! Waiting for creator to release funds.
          </p>
        )}
        {status==="failed"&&(
          <Btn variant="danger" full onClick={doRefund} loading={busy} xs={{padding:".85rem"}}>
            ↩ Claim My Refund
          </Btn>
        )}
        {status==="funded"&&(
          <p style={{textAlign:"center",color:"var(--g)",fontSize:".87rem"}}>
            🎯 Goal reached! Deadline still active — funds locked.
          </p>
        )}
        {status==="released"&&(
          <p style={{textAlign:"center",color:"var(--dim)",fontSize:".87rem"}}>
            ✓ Funds released to creator.
          </p>
        )}

        <TxStatus s={txState}/>

        <div style={{marginTop:"1rem",display:"flex",flexWrap:"wrap",gap:8,fontSize:".72rem",color:"var(--dim)",fontFamily:"var(--mono)"}}>
          <span>Creator: {fmt.addr(vault.creator)}</span>
          <span>·</span>
          <span>Deadline: {fmt.date(vault.deadline)}</span>
          <span>·</span>
          <span>Vault #{vault.id}</span>
        </div>
      </Card>
    </Overlay>
  );
}

/* ── Vault Card ─────────────────────────────────────────────────────────────── */
function VaultCard({ vault, account, onRefetch, delay=0 }) {
  const [open, setOpen] = useState(false);
  const status = vaultStatus(vault);
  const pct    = fmt.pct(vault.raised, vault.goal);
  return (
    <>
      <Card className="up" onClick={()=>setOpen(true)} style={{animationDelay:`${delay}s`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:".75rem"}}>
          <h3 style={{fontSize:".98rem",fontWeight:700,lineHeight:1.3,flex:1,marginRight:10}}>{vault.title}</h3>
          <Badge status={status}/>
        </div>
        {vault.description&&(
          <p style={{fontSize:".81rem",color:"var(--dim)",marginBottom:"1rem",lineHeight:1.55,
            display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
            {vault.description}
          </p>
        )}
        <Bar pct={pct} status={status}/>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:10,fontSize:".81rem"}}>
          <span style={{fontWeight:600,fontFamily:"var(--mono)"}}>{fmt.eth(vault.raised)}/{fmt.eth(vault.goal)} XLM</span>
          <span style={{color:"var(--dim)",fontFamily:"var(--mono)"}}>{fmt.timeLeft(vault.deadline,status)}</span>
        </div>
        <div style={{marginTop:4,fontSize:".71rem",color:"var(--dim)"}}>
          {pct}% · {fmt.addr(vault.creator)}
        </div>
      </Card>
      {open&&(
        <VaultModal vault={vault} account={account}
          onClose={()=>setOpen(false)}
          onSuccess={()=>{setOpen(false);onRefetch();}}/>
      )}
    </>
  );
}

/* ── App ────────────────────────────────────────────────────────────────────── */
const FILTERS = ["all","active","funded","claimable","failed","released"];

export default function App() {
  const W  = useWallet();
  const { vaults, loading, error:vErr, refetch, lastFetch } = useVaults(W.account, W.chainId);
  const [showCreate, setCreate] = useState(false);
  const [filter,     setFilter] = useState("all");
  const [toast,      setToast]  = useState(null);

  const notify = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(()=>setToast(null), 4500);
  };

  const shown = filter==="all" ? vaults : vaults.filter(v=>vaultStatus(v)===filter);
  const totalRaised = vaults.reduce((s,v)=>s+BigInt(v.raised??0),0n);
  const activeN = vaults.filter(v=>vaultStatus(v)==="active").length;

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column"}}>

      {/* ── Header ────────────────────────────────────────── */}
      <header style={{
        display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:"1rem 2rem",borderBottom:"1px solid var(--brd)",
        background:"#0a0a0fee",backdropFilter:"blur(12px)",
        position:"sticky",top:0,zIndex:100,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{
            width:34,height:34,borderRadius:9,fontSize:"1.1rem",
            background:"linear-gradient(135deg,var(--a),var(--a2))",
            display:"flex",alignItems:"center",justifyContent:"center",
          }}>⬡</div>
          <span style={{fontWeight:800,fontSize:"1.15rem",letterSpacing:"-.03em"}}>VaultPledge</span>
          <span style={{fontSize:".6rem",fontFamily:"var(--mono)",fontWeight:800,
            background:W.isCorrectNetwork?"var(--brd)":"var(--r)",
            color:W.isCorrectNetwork?"var(--dim)":"#fff",
            borderRadius:4,padding:"2px 7px"}}>
            {W.network || "FREIGHTER"}
          </span>
        </div>
        <div style={{display:"flex",gap:".75rem",alignItems:"center"}}>
          {W.account&&<Btn onClick={()=>setCreate(true)}>+ New Vault</Btn>}
          {W.account ? (
            <>
              <span style={{width:8,height:8,borderRadius:"50%",display:"inline-block",
                background:W.isCorrectNetwork?"var(--g)":"var(--r)",
                boxShadow:W.isCorrectNetwork?"0 0 6px var(--g)":"0 0 6px var(--r)"}}/>
              <span style={{fontSize:".81rem",fontFamily:"var(--mono)",color:"var(--dim)"}}>
                {fmt.addr(W.account)}
              </span>
              <Btn variant="ghost" onClick={W.disconnect} sz="sm">Disconnect</Btn>
            </>
          ) : (
            <Btn onClick={W.connect} loading={W.connecting}>
              {W.connecting?"Connecting…":"Connect Wallet"}
            </Btn>
          )}
        </div>
      </header>

      {/* ── Warnings ──────────────────────────────────────── */}
      {W.account&&!W.isCorrectNetwork&&(
        <div style={{background:"#f76a6a12",borderBottom:"1px solid #f76a6a30",
          padding:".55rem 2rem",textAlign:"center",fontSize:".83rem",color:"var(--r)"}}>
          ⚠ Network Mismatch: Please switch to Stellar Testnet (TESTNET)
        </div>
      )}
      {W.error&&(
        <div style={{background:"#f76a6a", borderBottom:"1px solid #f76a6a50",
          padding:".75rem 2rem",textAlign:"center",fontSize:".9rem",color:"#fff", fontWeight:700}}>
          ⚠ {W.error}
        </div>
      )}

      {/* ── Hero ──────────────────────────────────────────── */}
      <div style={{
        padding:"5rem 2rem 3.5rem",textAlign:"center",
        background:"radial-gradient(ellipse 70% 50% at 50% -5%,#7c6af722,transparent)",
      }}>
        <h1 style={{
          fontSize:"clamp(2.2rem,5vw,3.8rem)",fontWeight:800,
          letterSpacing:"-.05em",lineHeight:1.08,marginBottom:"1rem",
        }}>
          Trustless Crowdfunding<br/>
          <span style={{background:"linear-gradient(90deg,var(--a),var(--a2))",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
            On Stellar.
          </span>
        </h1>
        <p style={{color:"var(--dim)",fontSize:"1.05rem",maxWidth:480,
          margin:"0 auto 2rem",lineHeight:1.7}}>
          Create vaults, pledge XLM, release on goal met — or refund if it falls short.
          No middlemen. No custody. Smart contract enforces everything.
        </p>
        {!W.account&&(
          <Btn onClick={W.connect} loading={W.connecting} sz="lg">
            {W.connecting?"Connecting…":"Connect Wallet to Start"}
          </Btn>
        )}
      </div>

      {/* ── Stats bar ─────────────────────────────────────── */}
      <div style={{
        display:"flex",justifyContent:"center",gap:"4rem",
        padding:"1.2rem 2rem",background:"var(--surf)",
        borderTop:"1px solid var(--brd)",borderBottom:"1px solid var(--brd)",
      }}>
        {[["Vaults",vaults.length],["Total Raised",`${fmt.eth(totalRaised)} XLM`],["Active",activeN]].map(([l,v])=>(
          <div key={l} style={{textAlign:"center"}}>
            <div style={{fontSize:"1.55rem",fontWeight:800,fontFamily:"var(--mono)"}}>{v}</div>
            <div style={{fontSize:".67rem",color:"var(--dim)",textTransform:"uppercase",letterSpacing:".1em",marginTop:3}}>{l}</div>
          </div>
        ))}
      </div>

      {/* ── Main ──────────────────────────────────────────── */}
      <main style={{flex:1,maxWidth:1080,width:"100%",margin:"0 auto",padding:"2rem"}}>

        {/* Filters */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          marginBottom:"1.5rem",flexWrap:"wrap",gap:"1rem"}}>
          <div style={{display:"flex",gap:".4rem",flexWrap:"wrap"}}>
            {FILTERS.map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{
                padding:".36rem .82rem",borderRadius:8,
                fontFamily:"var(--sans)",fontSize:".79rem",fontWeight:600,
                cursor:"pointer",textTransform:"capitalize",transition:"all .15s",
                border:"1px solid",
                borderColor:filter===f?"var(--a)":"var(--brd)",
                background:filter===f?"#7c6af718":"transparent",
                color:filter===f?"var(--a)":"var(--dim)",
              }}>{f}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:".5rem",alignItems:"center"}}>
            {lastFetch&&<span style={{fontSize:".71rem",color:"var(--dim)",fontFamily:"var(--mono)"}}>
              cached {Math.round((Date.now()-lastFetch)/1000)}s ago
            </span>}
            <Btn variant="secondary" onClick={refetch} sz="sm">↻ Refresh</Btn>
          </div>
        </div>

        {/* No wallet */}
        {!W.account&&(
          <div style={{textAlign:"center",padding:"5rem 2rem",color:"var(--dim)"}}>
            <div style={{fontSize:"3.5rem",marginBottom:"1rem"}}>🔐</div>
            <p style={{marginBottom:"1.5rem"}}>Connect your wallet to view and interact with vaults.</p>
            <Btn onClick={W.connect} loading={W.connecting}>Connect Wallet</Btn>
          </div>
        )}

        {/* Error */}
        {W.account&&vErr&&(
          <Card style={{textAlign:"center",padding:"2.5rem",borderColor:"#f76a6a30"}}>
            <p style={{color:"var(--r)",marginBottom:"1rem"}}>⚠ {vErr}</p>
            <Btn variant="secondary" onClick={refetch}>Try Again</Btn>
          </Card>
        )}

        {/* Loading */}
        {W.account&&loading&&!vErr&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"1rem"}}>
            {[1,2,3].map(i=><Skel key={i}/>)}
          </div>
        )}

        {/* Empty */}
        {W.account&&!loading&&!vErr&&shown.length===0&&(
          <div style={{textAlign:"center",padding:"5rem 2rem",color:"var(--dim)"}}>
            <div style={{fontSize:"3rem",marginBottom:"1rem"}}>📭</div>
            <p style={{marginBottom:"1.5rem"}}>
              {filter==="all"?"No vaults yet — create the first one!": `No ${filter} vaults found.`}
            </p>
            {filter==="all"&&<Btn onClick={()=>setCreate(true)}>Create First Vault</Btn>}
          </div>
        )}

        {/* Grid */}
        {W.account&&!loading&&shown.length>0&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"1rem"}}>
            {shown.map((v,i)=>(
              <VaultCard key={v.id} vault={v} account={W.account} delay={i*.06}
                onRefetch={()=>{refetch();notify("Updated ✓");}}/>
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer style={{
        borderTop:"1px solid var(--brd)",padding:"1.5rem 2rem",
        textAlign:"center",color:"var(--dim)",fontSize:".77rem",fontFamily:"var(--mono)",
      }}>
        VaultPledge · Orange Belt Level 3 dApp · Stellar Testnet (Freighter) · React + Vite
      </footer>

      {showCreate&&(
        <CreateModal onClose={()=>setCreate(false)}
          onSuccess={()=>{setCreate(false);refetch();notify("Vault created! 🎉");}}/>
      )}

      <Toast toast={toast} clear={()=>setToast(null)}/>
    </div>
  );
}
