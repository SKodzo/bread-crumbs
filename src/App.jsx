import { useState, useEffect } from "react";
import { BuyingApp, ZIP_DB } from "./BreadCrumbs.jsx";

// ── Shared colors ────────────────────────────────────────────────────────────
const C = {
  green:"#1B6B44",greenMid:"#4A9B6F",greenLight:"#E8F5EE",greenPale:"#F2FAF6",
  amber:"#E8A020",amberLight:"#FEF3DC",
  cream:"#FBF8F3",white:"#FFFFFF",charcoal:"#2C2C2C",
  gray700:"#4B5563",gray500:"#6B7280",gray400:"#9CA3AF",gray300:"#D1D5DB",gray200:"#E5E7EB",gray100:"#F3F4F6",
  red:"#DC2626",redLight:"#FEE2E2",
  blue:"#1D4ED8",blueLight:"#DBEAFE",bluePale:"#EFF6FF",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = n => "$" + Math.round(Math.max(0, n)).toLocaleString();
const fmtK = n => "$" + Math.round(Math.abs(n) / 1000) + "K";

// ── Inline fed/FICA tax for renter & seller take-home ────────────────────────
function calcFedTax(gross, status) {
  const std = { single: 14600, mfj: 29200, mfs: 14600, hoh: 21900 }[status] || 14600;
  const brackets = status === "mfj"
    ? [[0,.10],[23200,.12],[94300,.22],[201050,.24],[383900,.32],[487450,.35],[731200,.37]]
    : [[0,.10],[11600,.12],[47150,.22],[100525,.24],[191950,.32],[243725,.35],[609350,.37]];
  const t = Math.max(0, gross - std);
  let tax = 0;
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (t > brackets[i][0]) { tax = (t - brackets[i][0]) * brackets[i][1]; for (let j = i - 1; j >= 0; j--) tax += (brackets[j+1][0] - brackets[j][0]) * brackets[j][1]; break; }
  }
  return Math.round(tax);
}
const calcFica = gross => Math.round(Math.min(gross, 168600) * 0.062 + gross * 0.0145);

// ── State income tax ─────────────────────────────────────────────────────────
const ST_FLAT = {TX:0,FL:0,NV:0,SD:0,TN:0,WY:0,NH:0,WA:0,AK:0,AZ:.025,CO:.044,GA:.0519,IL:.0495,IN:.0295,IA:.038,KS:.052,KY:.035,LA:.03,MI:.0425,MS:.04,MO:.02,NC:.0399,PA:.0307,OH:.035,UT:.0445,ID:.053};
function calcStateTax(st, income) {
  if (st in ST_FLAT) return Math.round(income * ST_FLAT[st]);
  const prog = {
    CA: [[0,.01],[10099,.02],[23942,.04],[37788,.06],[52455,.08],[66295,.093],[338639,.103],[406364,.113],[677275,.123]],
    NY: [[0,.04],[8500,.045],[11700,.0525],[13900,.0585],[80650,.0625],[215400,.0685],[1077550,.0965],[5000000,.103],[25000000,.109]],
    NJ: [[0,.014],[20000,.0175],[35000,.035],[40000,.05525],[75000,.0637],[500000,.0897],[1000000,.1075]],
    MA: [[0,.05],[1083150,.09]],
    MD: [[0,.02],[1000,.03],[2000,.04],[3000,.0475],[100000,.05],[125000,.0525],[150000,.055],[250000,.0575]],
    VA: [[0,.02],[3000,.03],[5000,.05],[17000,.0575]],
    MN: [[0,.0535],[31690,.068],[104090,.0785],[183340,.0985]],
    OR: [[0,.0475],[4300,.0675],[10750,.0875],[125000,.099]],
    CT: [[0,.02],[10000,.045],[50000,.055],[100000,.06],[200000,.065],[250000,.069],[500000,.0699]],
    HI: [[0,.014],[2400,.032],[4800,.055],[9600,.064],[14400,.068],[19200,.072],[24000,.076],[36000,.079],[48000,.0825],[150000,.09],[175000,.10],[200000,.11]],
    WI: [[0,.035],[14320,.044],[28640,.053],[315310,.0765]],
  };
  const brackets = prog[st];
  if (!brackets) return Math.round(income * 0.05);
  let tax = 0;
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (income > brackets[i][0]) {
      const below = brackets.slice(0, i).reduce((s, b, j) => s + (brackets[j+1][0] - b[0]) * b[1], 0);
      tax = below + (income - brackets[i][0]) * brackets[i][1];
      break;
    }
  }
  return Math.round(tax);
}

// ── FRED live data hook ───────────────────────────────────────────────────────
const FRED_KEY = "589dc81c9ef6fd7578889b44b31e8499";
const fredUrl = (id, n = 1) =>
  `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${FRED_KEY}&sort_order=desc&limit=${n}&file_type=json`;

function useFredData() {
  const [dff, setDff] = useState(4.33);
  const [medianPrice, setMedianPrice] = useState(403200);
  const [hpiYoY, setHpiYoY] = useState(3.4);
  const [homeSales, setHomeSales] = useState({ current: 4090000, prev: 4190000 });
  const [rate30, setRate30] = useState(6.85);
  const [rate15, setRate15] = useState(6.12);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(fredUrl("DFF", 1)).then(r => r.json()).catch(() => null),
      fetch(fredUrl("MSPUS", 1)).then(r => r.json()).catch(() => null),
      fetch(fredUrl("USSTHPI", 5)).then(r => r.json()).catch(() => null),
      fetch(fredUrl("EXHOSLUSM495S", 2)).then(r => r.json()).catch(() => null),
      fetch("https://bread-crumbs-one.vercel.app/api/rates").then(r => r.json()).catch(() => null),
    ]).then(([d1, d2, d3, d4, rates]) => {
      const obs1 = d1?.observations?.[0];
      if (obs1?.value && obs1.value !== ".") { setDff(parseFloat(obs1.value)); setUpdated(obs1.date); }
      const obs2 = d2?.observations?.[0];
      if (obs2?.value && obs2.value !== ".") setMedianPrice(parseFloat(obs2.value));
      const obs3 = d3?.observations || [];
      if (obs3.length >= 5) {
        const latest = parseFloat(obs3[0].value), yearAgo = parseFloat(obs3[4].value);
        if (!isNaN(latest) && !isNaN(yearAgo) && yearAgo > 0)
          setHpiYoY(parseFloat(((latest - yearAgo) / yearAgo * 100).toFixed(1)));
      }
      const obs4 = d4?.observations || [];
      if (obs4.length >= 2) {
        const cur = parseFloat(obs4[0].value), prev = parseFloat(obs4[1].value);
        if (!isNaN(cur) && !isNaN(prev)) setHomeSales({ current: cur, prev });
      }
      if (rates?.rate30) setRate30(rates.rate30);
      if (rates?.rate15) setRate15(rates.rate15);
    }).finally(() => setLoading(false));
  }, []);

  const bestHysa = parseFloat((dff + 0.75).toFixed(2));
  return { dff, bestHysa, medianPrice, hpiYoY, homeSales, rate30, rate15, loading, updated };
}

// ── Buyers / sellers market logic ─────────────────────────────────────────────
function getMarketType(rate30, homeSales, hpiYoY) {
  let score = 0;
  if (rate30 > 7.5) score += 2; else if (rate30 > 6.5) score += 1; else if (rate30 < 5.5) score -= 2; else if (rate30 < 6.5) score -= 1;
  if (homeSales.current < homeSales.prev * 0.97) score += 1; else if (homeSales.current > homeSales.prev * 1.03) score -= 1;
  if (hpiYoY < 2) score += 1; else if (hpiYoY > 6) score -= 1;
  if (score >= 2) return "buyer";
  if (score <= -2) return "seller";
  return "balanced";
}

const MARKET_INFO = {
  buyer: {
    label: "Buyer's Market", icon: "🎯", color: C.blue, bg: C.blueLight,
    headline: "You have leverage — use it.",
    what: "More homes for sale than buyers. Sellers are waiting longer and more willing to negotiate.",
    leverage: [
      { title: "Negotiate price down", detail: "Offering 3–5% below list is reasonable and often accepted. Sellers are motivated." },
      { title: "Ask for seller concessions", detail: "Request the seller cover your closing costs (2–3% of price). Fair game in a buyer's market." },
      { title: "Keep all contingencies", detail: "Don't waive inspection or financing. You rarely need to in a buyer's market, and they protect you." },
      { title: "Request repairs", detail: "After inspection, ask for repairs or a credit. Sellers won't walk away from a deal." },
      { title: "Ask for a rate buydown", detail: "Request seller-paid points to lower your rate. Even 0.5% lower saves thousands over the loan life." },
    ]
  },
  seller: {
    label: "Seller's Market", icon: "🔥", color: C.red, bg: C.redLight,
    headline: "Competition is high — move fast and come prepared.",
    what: "More buyers than homes. Sellers get multiple offers quickly and have the upper hand.",
    leverage: [
      { title: "Get pre-approved before searching", detail: "Sellers won't look at offers without pre-approval. Have it ready before you tour a single home." },
      { title: "Move same day on new listings", detail: "Homes sell in hours. Set up instant alerts and be ready to tour immediately." },
      { title: "Offer at or above asking", detail: "Offering below list means losing. Study comps and price your offer competitively." },
      { title: "Write an escalation clause", detail: "Set your max and escalate above competing offers by a fixed amount. Beats guessing in a bidding war." },
      { title: "Flexible closing date", detail: "Sellers often need time to find their next home. A leaseback offer can win the deal at the same price." },
    ]
  },
  balanced: {
    label: "Balanced Market", icon: "⚖️", color: C.green, bg: C.greenLight,
    headline: "Standard negotiation applies — reasonable leverage on both sides.",
    what: "Roughly equal supply and demand. Neither buyer nor seller has a strong advantage.",
    leverage: [
      { title: "Offer 1–2% below list", detail: "Expect some back-and-forth. Sellers will negotiate but won't take lowball offers." },
      { title: "Keep standard contingencies", detail: "Inspection and financing are generally accepted. No pressure to waive them." },
      { title: "Ask for modest concessions", detail: "Requesting 1–2% in seller concessions is reasonable and often granted." },
      { title: "Take time on inspection", detail: "Standard 10-day inspection periods are the norm. Use the full time." },
    ]
  },
};

// ── HYSA bank list ────────────────────────────────────────────────────────────
const BANKS = [
  { name: "SoFi", apy: null },
  { name: "Marcus (Goldman Sachs)", apy: null },
  { name: "Ally Bank", apy: null },
  { name: "American Express HYSA", apy: null },
  { name: "Discover Online Savings", apy: null },
  { name: "Capital One 360", apy: null },
  { name: "Other (enter APY)", apy: null, custom: true },
];

// ── Shared web UI primitives ──────────────────────────────────────────────────
const WSlider = ({ label, min, max, step, value, onChange, display, note, color = C.green }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: C.charcoal }}>{label}</label>
      <span style={{ fontSize: 15, fontWeight: 800, color }}>{display !== undefined ? display : fmt(value)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width: "100%", accentColor: color, cursor: "pointer" }} />
    {note && <div style={{ fontSize: 11, color: C.gray500, marginTop: 3 }}>{note}</div>}
  </div>
);

const WCard = ({ children, style = {} }) => (
  <div style={{ background: C.white, borderRadius: 16, padding: "18px 16px", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", ...style }}>{children}</div>
);

const WTitle = ({ children, color = C.green }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>{children}</div>
);

const WAlert = ({ type = "info", children }) => {
  const s = { info: { bg: C.blueLight, color: C.blue }, success: { bg: C.greenLight, color: C.green }, warning: { bg: C.amberLight, color: "#92400E" }, danger: { bg: C.redLight, color: C.red } }[type];
  return <div style={{ background: s.bg, color: s.color, borderRadius: 10, padding: "10px 14px", fontSize: 12, lineHeight: 1.6, marginTop: 8 }}>{children}</div>;
};

const WInfoRow = ({ label, value, bold, valueColor, topBorder }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `0.5px solid ${C.gray100}`, borderTop: topBorder ? `1.5px solid ${C.gray300}` : "none", marginTop: topBorder ? 6 : 0 }}>
    <span style={{ fontSize: 12, color: bold ? C.charcoal : C.gray700, fontWeight: bold ? 700 : 400, flex: 1 }}>{label}</span>
    <span style={{ fontSize: 12, fontWeight: bold ? 800 : 600, color: valueColor || C.charcoal, whiteSpace: "nowrap" }}>{value}</span>
  </div>
);

const WBtnPri = ({ onClick, children, disabled, color = C.green }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ background: disabled ? C.gray300 : color, color: C.white, border: "none", borderRadius: 12, padding: "14px 20px", fontSize: 15, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", width: "100%" }}>
    {children}
  </button>
);

const WBtnSec = ({ onClick, children, color = C.green }) => (
  <button onClick={onClick}
    style={{ background: C.white, color, border: `2px solid ${color}`, borderRadius: 12, padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%" }}>
    {children}
  </button>
);

const NavRow = ({ onBack, onNext, nextLabel = "Continue →", color = C.green, disabled = false }) => (
  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
    {onBack && <WBtnSec onClick={onBack} color={color}>← Back</WBtnSec>}
    <WBtnPri onClick={onNext} color={color} disabled={disabled}>{nextLabel}</WBtnPri>
  </div>
);

const ChoiceGrid = ({ options, value, onChange, color = C.green }) => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    {options.map(o => (
      <button key={o.v} onClick={() => onChange(o.v)}
        style={{ flex: "1 1 120px", border: `2px solid ${value === o.v ? color : C.gray300}`, borderRadius: 12, padding: "12px 10px", background: value === o.v ? (color === C.green ? C.greenLight : color === C.amber ? C.amberLight : C.blueLight) : C.white, cursor: "pointer", textAlign: "center" }}>
        {o.icon && <div style={{ fontSize: 22, marginBottom: 4 }}>{o.icon}</div>}
        <div style={{ fontSize: 13, fontWeight: 700, color: value === o.v ? color : C.charcoal }}>{o.label}</div>
        {o.note && <div style={{ fontSize: 10, color: C.gray500, marginTop: 2 }}>{o.note}</div>}
      </button>
    ))}
  </div>
);

const ZipInput = ({ value, onChange, loc, color = C.green }) => (
  <div>
    <input type="text" inputMode="numeric" maxLength={5} value={value || ""} onChange={e => onChange(e.target.value)}
      placeholder="ZIP code"
      style={{ width: "100%", boxSizing: "border-box", border: `2px solid ${loc ? color : C.gray300}`, borderRadius: 10, padding: "12px 14px", fontSize: 16, fontWeight: 700, color: C.charcoal, background: loc ? (color === C.green ? C.greenLight : color === C.amber ? C.amberLight : C.blueLight) : C.white, outline: "none" }} />
    {loc && <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color }}>{loc.city}, {loc.state}</div>}
    {!loc && value?.length === 5 && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>ZIP not found — try another</div>}
  </div>
);

const StateSelect = ({ value, onChange }) => {
  const states = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];
  return (
    <select value={value || ""} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", border: `2px solid ${value ? C.blue : C.gray300}`, borderRadius: 10, padding: "12px 14px", fontSize: 15, fontWeight: 700, color: value ? C.blue : C.gray500, background: value ? C.blueLight : C.white, cursor: "pointer", outline: "none" }}>
      <option value="">Select state…</option>
      {states.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  );
};

// ── Transfer tax rates (for seller costs) ─────────────────────────────────────
const TRANSFER_TAX = { NY:4.0, CA:1.1, PA:10.0, DC:14.0, MD:5.0, NJ:5.85, CT:7.5, WA:1.78, IL:1.0, VA:1.0, DE:4.0, NH:7.5, VT:6.25, HI:1.0, MA:4.56, RI:4.6, MN:3.3, WI:3.0, MI:8.6, NV:2.55 };
const PROP_TAX = { AL:.33, AK:.98, AZ:.51, AR:.52, CA:.74, CO:.51, CT:1.79, DE:.43, FL:.83, GA:.83, HI:.28, ID:.47, IL:2.08, IN:.82, IA:1.53, KS:1.34, KY:.83, LA:.56, ME:1.09, MD:1.07, MA:1.12, MI:1.54, MN:1.02, MS:.65, MO:.91, MT:.68, NE:1.61, NV:.48, NH:1.86, NJ:2.47, NM:.55, NY:1.69, NC:.70, ND:.99, OH:1.57, OK:.90, OR:.82, PA:1.58, RI:1.50, SC:.43, SD:1.08, TN:.48, TX:1.67, UT:.55, VT:1.83, VA:.75, WA:.84, WV:.53, WI:1.76, WY:.55, DC:.85 };
const MEDIAN_PRICE = { CA:750000, NY:420000, TX:310000, FL:390000, IL:260000, PA:270000, OH:210000, GA:330000, NC:320000, MI:220000, NJ:430000, VA:370000, WA:580000, AZ:380000, MA:520000, TN:320000, IN:230000, MO:240000, MD:380000, WI:260000, CO:530000, MN:340000, SC:290000, AL:220000, LA:210000, KY:200000, OR:450000, OK:200000, CT:370000, UT:470000, NV:400000, AR:190000, MS:170000, KS:220000, NM:280000, NE:240000, ID:420000, WV:140000, HI:830000, NH:420000, ME:310000, MT:390000, RI:390000, DE:330000, SD:270000, ND:260000, AK:330000, VT:310000, WY:310000, DC:640000, IA:210000 };

// ── Market Pulse component ────────────────────────────────────────────────────
function MarketPulse({ startTab = "buying" }) {
  const { dff, bestHysa, medianPrice, hpiYoY, homeSales, rate30, rate15, loading, updated } = useFredData();
  const [tab, setTab] = useState(startTab);
  const [open, setOpen] = useState(false);
  const [bankAPY, setBankAPY] = useState(null);
  const [customAPY, setCustomAPY] = useState("");
  const [selectedBank, setSelectedBank] = useState(null);
  const [showLeverage, setShowLeverage] = useState(false);
  const [myAPY, setMyAPY] = useState(1.5);

  const marketType = getMarketType(rate30, homeSales, hpiYoY);
  const mi = MARKET_INFO[marketType];
  const salesChg = homeSales.prev > 0 ? ((homeSales.current - homeSales.prev) / homeSales.prev * 100).toFixed(1) : null;
  const salesUp = homeSales.current >= homeSales.prev;

  const displayAPY = selectedBank === "custom" ? parseFloat(customAPY) || 0 : bestHysa;
  const hysaGain = (savings, apy) => Math.round(savings * apy / 100);

  return (
    <WCard style={{ border: `1px solid ${C.gray200}` }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>📡</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.charcoal }}>Market Pulse</div>
            <div style={{ fontSize: 11, color: C.gray500 }}>{loading ? "Loading live data…" : updated ? `Updated ${updated}` : "Live federal data"}</div>
          </div>
        </div>
        <span style={{ fontSize: 18, color: C.gray400 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 16 }}>
          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {[{ v: "buying", label: "🏠 Buying" }, { v: "selling", label: "📋 Selling" }, { v: "savings", label: "💰 Savings" }].map(t => (
              <button key={t.v} onClick={() => setTab(t.v)}
                style={{ flex: 1, border: "none", borderRadius: 8, padding: "8px 4px", fontSize: 12, fontWeight: 700, cursor: "pointer", background: tab === t.v ? C.green : C.gray100, color: tab === t.v ? C.white : C.charcoal }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── BUYING TAB ── */}
          {tab === "buying" && (
            <div>
              {/* Buyers/sellers market indicator */}
              <div style={{ background: mi.bg, borderRadius: 14, padding: 16, marginBottom: 14, border: `1.5px solid ${mi.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 28 }}>{mi.icon}</span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: mi.color }}>{mi.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: mi.color }}>{mi.headline}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: C.gray700, lineHeight: 1.6, marginBottom: 10 }}>{mi.what}</div>
                {/* Signal breakdown */}
                <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.gray500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Signal breakdown</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: C.gray700 }}>30-yr mortgage rate</span>
                      <span style={{ fontWeight: 700, color: rate30 > 6.5 ? C.blue : C.green }}>{rate30.toFixed(2)}% {rate30 > 6.5 ? "↑ favors buyers" : "↓ favors sellers"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: C.gray700 }}>Existing home sales</span>
                      <span style={{ fontWeight: 700, color: salesUp ? C.red : C.blue }}>{salesChg}% MoM {salesUp ? "↑ more competition" : "↓ less competition"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: C.gray700 }}>FHFA Home Price Index</span>
                      <span style={{ fontWeight: 700, color: hpiYoY > 5 ? C.red : C.green }}>{hpiYoY > 0 ? "+" : ""}{hpiYoY}% YoY {hpiYoY > 5 ? "↑ fast appreciation" : "✓ moderate"}</span>
                    </div>
                  </div>
                </div>
                {/* Leverage tips */}
                <button onClick={() => setShowLeverage(v => !v)}
                  style={{ width: "100%", background: mi.color, color: C.white, border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {showLeverage ? "Hide" : "Show"} your leverage →
                </button>
                {showLeverage && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    {mi.leverage.map((item, i) => (
                      <div key={i} style={{ background: "rgba(255,255,255,0.7)", borderRadius: 10, padding: "10px 12px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: mi.color, marginBottom: 3 }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: C.gray700, lineHeight: 1.5 }}>{item.detail}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rate cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                {[
                  { label: "30-yr fixed", val: rate30.toFixed(2) + "%", sub: "Conventional / FHA" },
                  { label: "15-yr fixed", val: rate15.toFixed(2) + "%", sub: "Faster payoff" },
                  { label: "Fed funds rate", val: dff.toFixed(2) + "%", sub: "Federal Reserve" },
                  { label: "Median sale price", val: "$" + Math.round(medianPrice / 1000) + "K", sub: "U.S. median" },
                ].map((item, i) => (
                  <div key={i} style={{ background: C.greenPale, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: C.gray500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontSize: 19, fontWeight: 900, color: C.green, lineHeight: 1 }}>{item.val}</div>
                    <div style={{ fontSize: 10, color: C.gray500, marginTop: 3 }}>{item.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 10, color: C.gray400, textAlign: "center" }}>Sources: FRED (Federal Reserve), FHFA, U.S. Census · Rates updated daily</div>
            </div>
          )}

          {/* ── SELLING TAB ── */}
          {tab === "selling" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                {[
                  { label: "Median sale price", val: "$" + Math.round(medianPrice / 1000) + "K", sub: "U.S. median (Census)" },
                  { label: "Home price growth", val: (hpiYoY > 0 ? "+" : "") + hpiYoY + "%", sub: "FHFA HPI year-over-year", color: hpiYoY > 4 ? C.green : hpiYoY > 0 ? C.amber : C.red },
                  { label: "Existing home sales", val: (salesChg > 0 ? "+" : "") + salesChg + "%", sub: "Month-over-month", color: salesUp ? C.green : C.red },
                  { label: "30-yr mortgage rate", val: rate30.toFixed(2) + "%", sub: "Affects buyer pool", color: rate30 > 7 ? C.red : C.green },
                ].map((item, i) => (
                  <div key={i} style={{ background: C.amberLight, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: C.gray500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontSize: 19, fontWeight: 900, color: item.color || C.amber, lineHeight: 1 }}>{item.val}</div>
                    <div style={{ fontSize: 10, color: C.gray500, marginTop: 3 }}>{item.sub}</div>
                  </div>
                ))}
              </div>
              <WAlert type={salesUp ? "success" : "warning"}>
                {salesUp
                  ? `Home sales are up ${salesChg}% — more buyers are active, which can drive faster offers and higher prices.`
                  : `Home sales are down ${Math.abs(salesChg)}% — buyer demand is cooling. Price competitively and expect longer days on market.`}
              </WAlert>
              <WAlert type={hpiYoY > 3 ? "success" : "info"}>
                Home prices are {hpiYoY > 0 ? "up" : "down"} {Math.abs(hpiYoY)}% year-over-year. {hpiYoY > 4 ? "Strong appreciation — sellers have pricing power." : "Moderate growth — price close to comps to attract buyers."}
              </WAlert>
              <div style={{ fontSize: 10, color: C.gray400, textAlign: "center", marginTop: 8 }}>Sources: FRED, FHFA · Updated monthly</div>
            </div>
          )}

          {/* ── SAVINGS TAB ── */}
          {tab === "savings" && (
            <div>
              <div style={{ background: C.greenLight, borderRadius: 12, padding: 14, marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.green, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Fed funds rate</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: C.green }}>{dff.toFixed(2)}%</div>
                <div style={{ fontSize: 11, color: C.gray600, marginTop: 2 }}>The Federal Reserve's benchmark rate, which top HYSA banks closely follow</div>
              </div>

              <WTitle>High-yield savings potential</WTitle>
              <div style={{ background: C.greenPale, borderRadius: 12, padding: 14, marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: C.gray700, marginBottom: 8 }}>
                  Top HYSA banks typically offer <strong>{bestHysa.toFixed(2)}%</strong> or better (Fed rate + ~0.75%). The national savings average is only ~0.45%.
                </div>
                <WSlider label="Your current savings" min={0} max={100000} step={500} value={myAPY === 1.5 ? 10000 : 10000} onChange={() => {}} display={"$10,000"} color={C.green} />
              </div>

              <WTitle>Compare your savings</WTitle>
              <WSlider label="Your estimated savings" min={500} max={100000} step={500} value={myAPY * 1000} onChange={v => setMyAPY(v / 1000)} display={fmt(myAPY * 1000)} color={C.green} />

              <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: C.gray100, padding: "8px 12px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.gray500 }}>Account</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.gray500, textAlign: "center" }}>APY</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.gray500, textAlign: "right" }}>Yearly gain</div>
                </div>
                <div style={{ padding: "4px 12px" }}>
                  {[{ name: "National avg savings", apy: 0.45 }, { name: "Best HYSA (estimated)", apy: bestHysa }].map((b, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "8px 0", borderBottom: `0.5px solid ${C.gray100}` }}>
                      <div style={{ fontSize: 12, color: C.charcoal }}>{b.name}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: b.apy > 1 ? C.green : C.red, textAlign: "center" }}>{b.apy.toFixed(2)}%</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: b.apy > 1 ? C.green : C.gray500, textAlign: "right" }}>{fmt(myAPY * 1000 * b.apy / 100)}/yr</div>
                    </div>
                  ))}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "8px 0" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>HYSA advantage</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.green, textAlign: "center" }}>+{(bestHysa - 0.45).toFixed(2)}%</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: C.green, textAlign: "right" }}>+{fmt(myAPY * 1000 * (bestHysa - 0.45) / 100)}/yr</div>
                  </div>
                </div>
              </div>

              <WTitle>Choose a bank</WTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {[...BANKS.slice(0, 6), BANKS[6]].map((b, i) => {
                  const isSel = selectedBank === (b.custom ? "custom" : b.name);
                  return (
                    <button key={i} onClick={() => setSelectedBank(b.custom ? "custom" : b.name)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: `2px solid ${isSel ? C.green : C.gray200}`, borderRadius: 10, padding: "10px 14px", background: isSel ? C.greenLight : C.white, cursor: "pointer" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isSel ? C.green : C.charcoal }}>{b.custom ? "Other (enter APY)" : b.name}</span>
                      {!b.custom && <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>~{bestHysa.toFixed(2)}%</span>}
                    </button>
                  );
                })}
              </div>
              {selectedBank === "custom" && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.charcoal, display: "block", marginBottom: 6 }}>Enter your bank's APY (%)</label>
                  <input type="number" step="0.01" min="0" max="20" value={customAPY}
                    onChange={e => setCustomAPY(e.target.value)}
                    placeholder="e.g. 4.75"
                    style={{ width: "100%", boxSizing: "border-box", border: `2px solid ${C.green}`, borderRadius: 10, padding: "12px 14px", fontSize: 16, fontWeight: 700, color: C.green, outline: "none" }} />
                </div>
              )}

              <WAlert type="success">
                The best HYSAs today offer ~{bestHysa.toFixed(2)}% APY — nearly {Math.round(bestHysa / 0.45)}× the national average of 0.45%.
                Even small balances grow meaningfully faster.
              </WAlert>
              <div style={{ fontSize: 10, color: C.gray400, textAlign: "center", marginTop: 8 }}>APY estimates based on current Fed funds rate. Verify rates at bank websites before opening accounts.</div>
            </div>
          )}
        </div>
      )}
    </WCard>
  );
}

// ── LANDING SCREEN ────────────────────────────────────────────────────────────
function LandingScreen({ onSelect }) {
  const paths = [
    { v: "buying", icon: "🏠", label: "I'm buying", sub: "Find your budget, loan, and programs", color: C.green, bg: C.greenLight },
    { v: "renting", icon: "🔑", label: "I'm renting", sub: "Plan rent, budget, and move-in costs", color: C.blue, bg: C.blueLight },
    { v: "selling", icon: "📋", label: "I'm selling", sub: "Calculate proceeds and timeline", color: C.amber, bg: C.amberLight },
  ];
  return (
    <div style={{ background: C.cream, minHeight: "100vh", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: C.charcoal }}>
      {/* Header */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.gray100}`, padding: "12px 16px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>🍞</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: C.green, letterSpacing: "-0.02em" }}>Bread Crumbs</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.gray400, fontWeight: 600 }}>v1.2.0</span>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px 40px" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.charcoal, letterSpacing: "-0.02em", marginBottom: 6 }}>Where are you headed?</div>
          <div style={{ fontSize: 14, color: C.gray500 }}>Your honest guide to buying, renting, or selling a home.</div>
        </div>

        {/* Market Pulse — above path cards */}
        <MarketPulse startTab="buying" />

        {/* Path cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
          {paths.map(p => (
            <button key={p.v} onClick={() => onSelect(p.v)}
              style={{ display: "flex", alignItems: "center", gap: 16, background: C.white, border: `2px solid ${C.gray200}`, borderRadius: 16, padding: "18px 16px", cursor: "pointer", textAlign: "left", transition: "border-color 0.15s", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = p.color}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.gray200}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: p.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>{p.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.charcoal }}>{p.label}</div>
                <div style={{ fontSize: 13, color: C.gray500, marginTop: 2 }}>{p.sub}</div>
              </div>
              <span style={{ fontSize: 20, color: C.gray300 }}>›</span>
            </button>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 28, fontSize: 11, color: C.gray400 }}>
          All calculations are estimates for educational purposes only. Not financial advice.
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENTER FLOW
// ═══════════════════════════════════════════════════════════════════════════════
const RENTER_DEFAULT = {
  zip: "", locationInfo: null, state: "", rentalType: "apartment", roommates: 0,
  income: 65000, filingStatus: "single", score: 700,
  groc: 400, dining: 200, ent: 150, pcare: 100, car: 500, childcare: 0, healthcare: 0, edu: 0, misc: 100,
  debts: 300, student: 0,
  depositMonths: 1, appFee: 75, adminFee: 200, petCount: 0, petFeePerPet: 300,
  targetRent: 0,
  checkDone: {},
};

const FILING_LABELS = { single: "Single", mfj: "Married, filing jointly", mfs: "Married, filing separately", hoh: "Head of household" };

function RentHeader({ step, onHome }) {
  const steps = ["Profile", "Budget", "Results", "Savings", "Action"];
  return (
    <div style={{ background: C.white, borderBottom: `1px solid ${C.gray100}`, padding: "12px 16px", position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <button onClick={onHome} style={{ background: "none", border: "none", color: C.gray500, fontSize: 13, cursor: "pointer", padding: "4px 6px", borderRadius: 6 }}>← Home</button>
          <span style={{ fontSize: 22 }}>🔑</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: C.blue }}>Rent Planner</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.gray400 }}>Step {step} of {steps.length}</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < step ? C.blue : C.gray200 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RentProfile({ data, setData, onNext }) {
  const d = data;
  const onZip = zip => {
    const e = ZIP_DB[zip];
    if (e) setData({ ...d, zip, locationInfo: { state: e[0], city: e[1], county: e[2], zip }, state: e[0] });
    else setData({ ...d, zip, locationInfo: null });
  };
  const grossMo = Math.round((d.income || 0) / 12);
  const scoreColor = (d.score || 700) >= 720 ? C.green : (d.score || 700) >= 640 ? C.amber : C.red;
  const scoreNote = (d.score || 700) >= 720 ? "Most landlords approve — deposit may be waived"
    : (d.score || 700) >= 640 ? "Most landlords approve — standard deposit"
    : "May need a co-signer or larger deposit";
  const canContinue = !!(d.locationInfo || d.state);

  return (
    <div>
      <WCard>
        <WTitle color={C.blue}>What are you looking for?</WTitle>
        <ChoiceGrid color={C.blue} value={d.rentalType} onChange={v => setData({ ...d, rentalType: v })}
          options={[{ v: "apartment", icon: "🏢", label: "Apartment" }, { v: "house", icon: "🏠", label: "House" }]} />
        {d.rentalType === "house" && <WAlert type="info">Houses typically have higher utilities, yard costs, and larger deposits.</WAlert>}
      </WCard>

      <WCard>
        <WTitle color={C.blue}>Roommates</WTitle>
        <ChoiceGrid color={C.blue} value={d.roommates === 0 ? "solo" : "room"} onChange={v => setData({ ...d, roommates: v === "solo" ? 0 : Math.max(1, d.roommates) })}
          options={[{ v: "solo", label: "Just me" }, { v: "room", label: "With roommates" }]} />
        {d.roommates > 0 && (
          <div style={{ marginTop: 10 }}>
            <WSlider label="Number of roommates" min={1} max={4} step={1} value={d.roommates} onChange={v => setData({ ...d, roommates: v })} display={String(d.roommates)} color={C.blue} />
            <WAlert type="info">Rent and shared costs split evenly. Your personal expenses stay yours.</WAlert>
          </div>
        )}
      </WCard>

      <WCard>
        <WTitle color={C.blue}>Your income</WTitle>
        <WSlider label="Annual gross income" min={0} max={300000} step={1000} value={d.income || 0} onChange={v => setData({ ...d, income: v })} display={fmtK(d.income || 0) + "/yr"} note={fmt(grossMo) + "/mo gross"} color={C.blue} />
      </WCard>

      <WCard>
        <WTitle color={C.blue}>Filing status</WTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {["single", "mfj", "mfs", "hoh"].map(s => (
            <button key={s} onClick={() => setData({ ...d, filingStatus: s })}
              style={{ border: `2px solid ${d.filingStatus === s ? C.blue : C.gray300}`, borderRadius: 10, padding: "10px 14px", background: d.filingStatus === s ? C.blueLight : C.white, cursor: "pointer", textAlign: "left", fontSize: 13, fontWeight: 600, color: d.filingStatus === s ? C.blue : C.charcoal }}>
              {FILING_LABELS[s]}
            </button>
          ))}
        </div>
      </WCard>

      <WCard>
        <WTitle color={C.blue}>Credit score</WTitle>
        <WSlider label="Your score" min={300} max={850} step={10} value={d.score || 700} onChange={v => setData({ ...d, score: v })} display={String(d.score || 700)} note={scoreNote} color={scoreColor} />
      </WCard>

      <WCard>
        <WTitle color={C.blue}>Where are you looking?</WTitle>
        <ZipInput value={d.zip} onChange={onZip} loc={d.locationInfo} color={C.blue} />
        {!d.locationInfo && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, color: C.gray500, marginBottom: 6 }}>Or select state:</div>
            <StateSelect value={d.state} onChange={v => setData({ ...d, state: v })} />
          </div>
        )}
      </WCard>

      <NavRow onNext={canContinue ? onNext : null} color={C.blue} disabled={!canContinue} nextLabel="Budget →" />
      {!canContinue && <div style={{ fontSize: 11, color: C.red, textAlign: "center", marginTop: 6 }}>Enter a ZIP code or select a state to continue</div>}
    </div>
  );
}

function RentBudget({ data, setData, onNext, onBack }) {
  const d = data;
  const st = d.locationInfo?.state || d.state || "TX";
  const grossYr = d.income || 0;
  const grossMo = Math.round(grossYr / 12);
  const netMo = grossMo - Math.round((calcFedTax(grossYr, d.filingStatus || "single") + calcFica(grossYr) + calcStateTax(st, grossYr)) / 12);
  const splitCount = (d.roommates || 0) + 1;

  const cats = [
    { k: "groc", label: "Groceries", max: 1500 },
    { k: "dining", label: "Dining out", max: 1000 },
    { k: "ent", label: "Entertainment", max: 800 },
    { k: "pcare", label: "Personal care", max: 500 },
    { k: "car", label: "Car / transport", max: 1500 },
    { k: "childcare", label: "Childcare", max: 3000 },
    { k: "healthcare", label: "Healthcare out-of-pocket", max: 1000 },
    { k: "edu", label: "Education", max: 1000 },
    { k: "misc", label: "Miscellaneous", max: 500 },
  ];

  const debts = [
    { k: "student", label: "Student loans", max: 2000 },
    { k: "debts", label: "Other debt payments", max: 1500 },
  ];

  const totalExp = cats.reduce((s, c) => s + (d[c.k] || 0), 0)
    + debts.reduce((s, c) => s + (d[c.k] || 0), 0);
  const remaining = netMo - totalExp;

  return (
    <div>
      <WCard style={{ background: C.blueLight, border: `1px solid ${C.blue}` }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 10, color: C.blue, fontWeight: 700, textTransform: "uppercase" }}>Take-home</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.blue }}>{fmt(netMo)}<span style={{ fontSize: 11 }}>/mo</span></div>
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 10, color: netMo - totalExp >= 0 ? C.green : C.red, fontWeight: 700, textTransform: "uppercase" }}>After expenses</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: netMo - totalExp >= 0 ? C.green : C.red }}>{fmt(remaining)}<span style={{ fontSize: 11 }}>/mo</span></div>
          </div>
        </div>
      </WCard>

      <WCard>
        <WTitle color={C.blue}>Monthly expenses</WTitle>
        {cats.map(c => (
          <WSlider key={c.k} label={c.label} min={0} max={c.max} step={25} value={d[c.k] || 0} onChange={v => setData({ ...d, [c.k]: v })} display={fmt(d[c.k] || 0) + "/mo"} color={C.blue} />
        ))}
      </WCard>

      <WCard>
        <WTitle color={C.blue}>Debt payments</WTitle>
        {debts.map(c => (
          <WSlider key={c.k} label={c.label} min={0} max={c.max} step={25} value={d[c.k] || 0} onChange={v => setData({ ...d, [c.k]: v })} display={fmt(d[c.k] || 0) + "/mo"} color={C.blue} />
        ))}
      </WCard>

      {remaining < 0 && <WAlert type="danger">Expenses exceed take-home by {fmt(Math.abs(remaining))}/mo. Adjust before continuing.</WAlert>}

      <NavRow onBack={onBack} onNext={onNext} color={C.blue} nextLabel="Results →" />
    </div>
  );
}

function RentResults({ data, setData, onNext, onBack }) {
  const d = data;
  const grossMo = Math.round((d.income || 0) / 12);
  const st = d.locationInfo?.state || d.state || "TX";
  const netMo = grossMo - Math.round((calcFedTax(d.income || 0, d.filingStatus || "single") + calcFica(d.income || 0) + calcStateTax(st, d.income || 0)) / 12);
  const splitCount = (d.roommates || 0) + 1;

  const tiers = [
    { label: "Conservative", pct: 25, color: C.green },
    { label: "Standard", pct: 30, color: C.blue },
    { label: "Stretch", pct: 35, color: C.amber },
  ].map(t => ({ ...t, total: Math.round(grossMo * t.pct / 100), share: Math.round(grossMo * t.pct / 100 / splitCount) }));

  const depositMonths = d.depositMonths ?? 1;
  const petRent = (d.petCount || 0) > 0 ? Math.round((d.petCount || 0) * 75) : 0;
  const standardRent = tiers[1].total;
  const moveIn = standardRent + Math.round(standardRent * depositMonths) + (d.appFee || 75) * splitCount + (d.adminFee || 200) + (d.petCount || 0) * (d.petFeePerPet || 300);

  return (
    <div>
      {/* Rent tiers */}
      <WCard>
        <WTitle color={C.blue}>Your rent tiers</WTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
          {tiers.map(t => (
            <div key={t.label} style={{ background: t.color === C.green ? C.greenLight : t.color === C.blue ? C.blueLight : C.amberLight, borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: t.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.label}</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: t.color, margin: "4px 0" }}>{fmt(t.total)}</div>
              <div style={{ fontSize: 9, color: C.gray500 }}>{t.pct}% of gross</div>
              {splitCount > 1 && <div style={{ fontSize: 9, color: t.color, fontWeight: 700 }}>Your share: {fmt(t.share)}</div>}
            </div>
          ))}
        </div>
        <WAlert type="info">The 30% rule (HUD standard): spending more than 30% of gross income on rent leaves you "cost-burdened." These tiers show your range.</WAlert>
      </WCard>

      {/* Move-in costs */}
      <WCard>
        <WTitle color={C.blue}>Move-in costs</WTitle>
        <WSlider label="Security deposit (months)" min={0} max={3} step={1} value={d.depositMonths ?? 1} onChange={v => setData({ ...d, depositMonths: v })} display={(d.depositMonths ?? 1) + " mo"} color={C.blue} />
        <WSlider label="Application fee" min={0} max={300} step={25} value={d.appFee ?? 75} onChange={v => setData({ ...d, appFee: v })} display={fmt(d.appFee ?? 75)} color={C.blue} />
        <WSlider label="Admin fee (one-time)" min={0} max={500} step={25} value={d.adminFee ?? 200} onChange={v => setData({ ...d, adminFee: v })} display={fmt(d.adminFee ?? 200)} color={C.blue} />
        <WSlider label="Pets" min={0} max={3} step={1} value={d.petCount || 0} onChange={v => setData({ ...d, petCount: v })} display={String(d.petCount || 0)} color={C.blue} />
        {(d.petCount || 0) > 0 && <WSlider label="Pet deposit per pet" min={0} max={1000} step={50} value={d.petFeePerPet ?? 300} onChange={v => setData({ ...d, petFeePerPet: v })} display={fmt(d.petFeePerPet ?? 300)} color={C.blue} />}
        <div style={{ marginTop: 8, borderTop: `1px solid ${C.gray100}`, paddingTop: 8 }}>
          <WInfoRow label="First month's rent (standard)" value={fmt(standardRent)} />
          <WInfoRow label={`Security deposit (${d.depositMonths ?? 1} mo)`} value={fmt(standardRent * (d.depositMonths ?? 1))} />
          <WInfoRow label="Application fee" value={fmt((d.appFee ?? 75) * splitCount)} />
          <WInfoRow label="Admin fee" value={fmt(d.adminFee ?? 200)} />
          {(d.petCount || 0) > 0 && <WInfoRow label={`Pet deposit (${d.petCount} pet${d.petCount > 1 ? "s" : ""})`} value={fmt((d.petCount || 0) * (d.petFeePerPet ?? 300))} />}
          <WInfoRow label="Total move-in cash needed" value={fmt(moveIn)} bold />
        </div>
      </WCard>

      {/* Landlord screening checklist */}
      <WCard>
        <WTitle color={C.blue}>Landlord screening — do you qualify?</WTitle>
        {[
          { label: "Income ≥ 3× rent", pass: grossMo >= standardRent * 3, detail: `${fmt(grossMo)}/mo income vs ${fmt(standardRent * 3)} required` },
          { label: "Credit score ≥ 620", pass: (d.score || 700) >= 620, detail: `Your score: ${d.score || 700}` },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `0.5px solid ${C.gray100}` }}>
            <span style={{ fontSize: 16 }}>{item.pass ? "✅" : "⚠️"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: item.pass ? C.green : C.amber }}>{item.label}</div>
              <div style={{ fontSize: 11, color: C.gray500 }}>{item.detail}</div>
            </div>
          </div>
        ))}
      </WCard>

      <NavRow onBack={onBack} onNext={onNext} color={C.blue} nextLabel="Savings plan →" />
    </div>
  );
}

function RentSavings({ data, setData, onNext, onBack }) {
  const d = data;
  const st = d.locationInfo?.state || d.state || "TX";
  const grossMo = Math.round((d.income || 0) / 12);
  const netMo = grossMo - Math.round((calcFedTax(d.income || 0, d.filingStatus || "single") + calcFica(d.income || 0) + calcStateTax(st, d.income || 0)) / 12);
  const splitCount = (d.roommates || 0) + 1;
  const standardTier = Math.round(grossMo * 0.30);
  const [targetRent, setTargetRent] = useState(d.targetRent || standardTier);
  const targetShare = Math.round(targetRent / splitCount);
  const standardShare = Math.round(standardTier / splitCount);
  const gap = targetShare - standardShare;

  const depositMonths = d.depositMonths ?? 1;
  const moveInTotal = targetRent + targetRent * depositMonths + (d.appFee ?? 75) * splitCount + (d.adminFee ?? 200) + (d.petCount || 0) * (d.petFeePerPet ?? 300);

  const DISC = [
    { k: "dining", label: "Dining out", cutPct: 0.5 },
    { k: "ent", label: "Entertainment", cutPct: 0.5 },
    { k: "pcare", label: "Personal care", cutPct: 0.4 },
    { k: "misc", label: "Misc", cutPct: 0.5 },
    { k: "groc", label: "Groceries", cutPct: 0.2 },
    { k: "car", label: "Car / transport", cutPct: 0.15 },
  ];
  const cuts = DISC.map(({ k, label, cutPct }) => {
    const cur = d[k] || 0;
    if (cur <= 0) return null;
    return { label, cur, reduced: cur - Math.round(cur * cutPct), savings: Math.round(cur * cutPct) };
  }).filter(Boolean).sort((a, b) => b.savings - a.savings).slice(0, 3);

  return (
    <div>
      <WCard style={{ border: `1px solid ${C.blue}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 20 }}>📏</span>
          <WTitle color={C.blue}>The 30% rule</WTitle>
        </div>
        <div style={{ fontSize: 12, color: C.gray700, lineHeight: 1.6 }}>
          HUD classifies households spending more than 30% of <strong>gross monthly income</strong> on rent as "cost-burdened."
        </div>
        <div style={{ background: C.blueLight, borderRadius: 10, padding: 12, marginTop: 8 }}>
          <div style={{ fontSize: 12, color: C.gray700 }}>Gross income: <strong>{fmt(grossMo)}/mo</strong></div>
          <div style={{ fontSize: 12, color: C.gray700 }}>30% standard: <strong style={{ color: C.blue }}>{fmt(standardTier)}/mo</strong></div>
          {splitCount > 1 && <div style={{ fontSize: 12, color: C.gray700 }}>Your share (÷{splitCount}): <strong style={{ color: C.blue }}>{fmt(standardShare)}/mo</strong></div>}
        </div>
      </WCard>

      <WCard>
        <WTitle color={C.blue}>Set your target rent</WTitle>
        <WSlider label="Target rent" min={0} max={5000} step={50} value={targetRent} onChange={v => { setTargetRent(v); setData({ ...d, targetRent: v }); }} display={fmt(targetRent) + "/mo"} color={C.blue} />
        {splitCount > 1 && <div style={{ fontSize: 11, color: C.blue, marginTop: -8, marginBottom: 8 }}>Your share: {fmt(targetShare)}/mo (split {splitCount} ways)</div>}
      </WCard>

      {gap > 0
        ? <WCard style={{ border: `1.5px solid ${C.amber}` }}><WAlert type="warning">Target is {fmt(gap)}/mo above the recommended 30% tier. You'll need more income or cuts to afford this comfortably.</WAlert></WCard>
        : <WCard style={{ border: `1.5px solid ${C.green}` }}><WAlert type="success">Your target rent is at or below the 30% standard tier.</WAlert></WCard>}

      <WCard>
        <WTitle color={C.blue}>Savings timeline — move-in cash {fmt(moveInTotal)}</WTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[3, 6, 12].map(mo => {
            const perMo = Math.ceil(moveInTotal / mo);
            const ok = perMo <= netMo * 0.5;
            return (
              <div key={mo} style={{ background: ok ? C.blueLight : C.amberLight, borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: ok ? C.blue : C.amber, textTransform: "uppercase" }}>{mo} months</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: ok ? C.blue : C.amber, margin: "4px 0" }}>{fmt(perMo)}</div>
                <div style={{ fontSize: 9, color: C.gray500 }}>per month</div>
              </div>
            );
          })}
        </div>
      </WCard>

      {cuts.length > 0 && (
        <WCard>
          <WTitle color={C.blue}>Budget cut suggestions</WTitle>
          {cuts.map((c, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `0.5px solid ${C.gray100}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.charcoal }}>{c.label}</div>
                <div style={{ fontSize: 11, color: C.gray500 }}>Cut from {fmt(c.cur)} to {fmt(c.reduced)}</div>
              </div>
              <div style={{ background: C.greenLight, borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 800, color: C.green }}>+{fmt(c.savings)}/mo</div>
            </div>
          ))}
        </WCard>
      )}

      <NavRow onBack={onBack} onNext={onNext} color={C.blue} nextLabel="Action plan →" />
    </div>
  );
}

function RentAction({ data, onBack, onDone }) {
  const d = data;
  const [tab, setTab] = useState("approval");
  const [done, setDone] = useState(d.checkDone || {});
  const toggle = (tab, i) => setDone(p => ({ ...p, [`${tab}_${i}`]: !p[`${tab}_${i}`] }));

  const standardTier = Math.round((d.income || 0) / 12 * 0.30);
  const moveIn = standardTier + standardTier * (d.depositMonths ?? 1) + (d.appFee ?? 75) * ((d.roommates || 0) + 1) + (d.adminFee ?? 200) + (d.petCount || 0) * (d.petFeePerPet ?? 300);

  const phases = {
    approval: {
      label: "Approval",
      items: ["Pull all three credit reports (Experian, Equifax, TransUnion)", "Dispute any errors — takes 30 days", "Gather 2 months of pay stubs", "Gather 2 months of bank statements", "Get 2 landlord references ready", "Prepare photo ID (driver's license or passport)", "Write a short renter intro letter (optional but helpful)"]
    },
    search: {
      label: "Search",
      items: ["Set up Zillow / Apartments.com alerts for your criteria", "Tour at least 3–5 units before deciding", "Check if utilities are included in rent", "Verify pet policy in writing before applying", "Look up landlord reviews on Google / Yelp / Reddit", "Drive through the neighborhood at night"]
    },
    signing: {
      label: "Signing",
      items: ["Read the full lease before signing — all of it", "Clarify early termination terms and fees", "Understand lease renewal and rent increase policies", "Get everything verbal in writing via email", "Photograph the entire unit before moving in", "Note any existing damage on the move-in inspection form"]
    },
    movein: {
      label: "Move-in",
      items: ["Set up renter's insurance ($10–25/mo covers your belongings)", "Transfer utilities before move-in date", "Set up mail forwarding", "Deep clean before moving furniture in", "Test all locks, smoke detectors, and appliances", "Introduce yourself to neighbors", "Store a copy of your lease in a safe place"]
    }
  };

  const allItems = Object.values(phases).flatMap((p, pi) => p.items.map((_, j) => `${Object.keys(phases)[pi]}_${j}`));
  const doneCount = allItems.filter(k => done[k]).length;
  const pct = Math.round(doneCount / allItems.length * 100);

  return (
    <div>
      {/* Summary card */}
      <WCard style={{ background: C.blueLight, border: `1px solid ${C.blue}` }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: "uppercase", marginBottom: 4 }}>Move-in cash needed</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.blue }}>{fmt(moveIn)}</div>
          <div style={{ fontSize: 12, color: C.gray500, marginTop: 2 }}>Standard rent tier: {fmt(standardTier)}/mo</div>
        </div>
      </WCard>

      {/* Progress */}
      <WCard>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.charcoal }}>Overall progress</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: C.blue }}>{pct}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: C.gray200, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: C.blue, borderRadius: 4, transition: "width 0.3s" }} />
        </div>
        <div style={{ fontSize: 10, color: C.gray500, marginTop: 4 }}>{doneCount} of {allItems.length} tasks done</div>
      </WCard>

      {/* Tab switcher */}
      <WCard>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {Object.entries(phases).map(([k, p]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ flex: 1, border: "none", borderRadius: 8, padding: "8px 4px", fontSize: 11, fontWeight: 700, cursor: "pointer", background: tab === k ? C.blue : C.gray100, color: tab === k ? C.white : C.charcoal }}>
              {p.label}
            </button>
          ))}
        </div>
        {phases[tab].items.map((item, i) => {
          const key = `${tab}_${i}`;
          const isDone = !!done[key];
          return (
            <button key={i} onClick={() => toggle(tab, i)}
              style={{ display: "flex", alignItems: "flex-start", gap: 10, width: "100%", background: "none", border: "none", borderBottom: `0.5px solid ${C.gray100}`, padding: "8px 0", cursor: "pointer", textAlign: "left" }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${isDone ? C.blue : C.gray300}`, background: isDone ? C.blue : C.white, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                {isDone && <span style={{ color: C.white, fontSize: 11, fontWeight: 800 }}>✓</span>}
              </div>
              <span style={{ fontSize: 13, color: isDone ? C.gray400 : C.charcoal, textDecoration: isDone ? "line-through" : "none", lineHeight: 1.5 }}>{item}</span>
            </button>
          );
        })}
      </WCard>

      <NavRow onBack={onBack} onNext={onDone} color={C.blue} nextLabel="Done ✓" />
    </div>
  );
}

function RenterApp({ onHome }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState(RENTER_DEFAULT);
  const go = s => { setStep(s); window.scrollTo(0, 0); };
  return (
    <div style={{ background: C.cream, minHeight: "100vh", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: C.charcoal }}>
      <RentHeader step={step} onHome={onHome} />
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px 14px 40px" }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.charcoal, letterSpacing: "-0.02em" }}>
            {["🔑 Your rental profile", "💸 Monthly budget", "📊 Rent results", "🎯 Savings plan", "✅ Action plan"][step - 1]}
          </div>
        </div>
        {step === 1 && <RentProfile data={data} setData={setData} onNext={() => go(2)} />}
        {step === 2 && <RentBudget data={data} setData={setData} onNext={() => go(3)} onBack={() => go(1)} />}
        {step === 3 && <RentResults data={data} setData={setData} onNext={() => go(4)} onBack={() => go(2)} />}
        {step === 4 && <RentSavings data={data} setData={setData} onNext={() => go(5)} onBack={() => go(3)} />}
        {step === 5 && <RentAction data={data} onBack={() => go(4)} onDone={onHome} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SELLER FLOW
// ═══════════════════════════════════════════════════════════════════════════════
const SELLER_DEFAULT = {
  zip: "", locationInfo: null, state: "",
  homeValue: 385000, mortgageBalance: 245000,
  income: 86000, filingStatus: "single",
  yearsOwned: 5, propertyType: "primary",
  commissionPct: 5.5,
  repairs: 3000, staging: 1500, photography: 500,
  originalPrice: 280000, improvements: 15000,
  checkDone: {},
};

const SELLER_CAP_GAINS_SINGLE = [[0, 0], [47025, 0.15], [518900, 0.20]];
const SELLER_CAP_GAINS_MFJ = [[0, 0], [94050, 0.15], [583750, 0.20]];

function calcCapGainsRate(income, status) {
  const brackets = (status === "mfj") ? SELLER_CAP_GAINS_MFJ : SELLER_CAP_GAINS_SINGLE;
  for (let i = brackets.length - 1; i >= 0; i--) { if (income > brackets[i][0]) return brackets[i][1]; }
  return 0;
}

function SellerHeader({ step, onHome }) {
  const steps = ["Profile", "Costs", "Proceeds", "Action"];
  return (
    <div style={{ background: C.white, borderBottom: `1px solid ${C.gray100}`, padding: "12px 16px", position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <button onClick={onHome} style={{ background: "none", border: "none", color: C.gray500, fontSize: 13, cursor: "pointer", padding: "4px 6px", borderRadius: 6 }}>← Home</button>
          <span style={{ fontSize: 22 }}>📋</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: C.amber }}>Seller Planner</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.gray400 }}>Step {step} of {steps.length}</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < step ? C.amber : C.gray200 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SellerProfile({ data, setData, onNext }) {
  const d = data;
  const onZip = zip => {
    const e = ZIP_DB[zip];
    if (e) setData({ ...d, zip, locationInfo: { state: e[0], city: e[1], county: e[2], zip }, state: e[0] });
    else setData({ ...d, zip, locationInfo: null });
  };
  const st = d.locationInfo?.state || d.state || "";
  const equity = Math.max(0, (d.homeValue || 0) - (d.mortgageBalance || 0));
  const medianForState = st ? (MEDIAN_PRICE[st] || 350000) : null;
  const exclusion = { single: 250000, mfj: 500000, mfs: 250000, hoh: 250000 }[d.filingStatus || "single"];

  return (
    <div>
      <WCard>
        <WTitle color={C.amber}>Where is your home?</WTitle>
        <ZipInput value={d.zip} onChange={onZip} loc={d.locationInfo} color={C.amber} />
        {!d.locationInfo && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, color: C.gray500, marginBottom: 6 }}>Or select state:</div>
            <StateSelect value={d.state} onChange={v => setData({ ...d, state: v })} />
          </div>
        )}
        {st && medianForState && (
          <div style={{ marginTop: 8, background: C.amberLight, borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 12, color: C.gray500 }}>Median home price in {st}: <strong style={{ color: C.amber }}>{fmt(medianForState)}</strong></div>
          </div>
        )}
      </WCard>

      <WCard>
        <WTitle color={C.amber}>Home value</WTitle>
        <WSlider label="Estimated value" min={0} max={2000000} step={5000} value={d.homeValue || 0} onChange={v => setData({ ...d, homeValue: v })} display={fmt(d.homeValue || 0)} color={C.amber} />
      </WCard>

      <WCard>
        <WTitle color={C.amber}>Mortgage balance</WTitle>
        <WSlider label="Remaining balance" min={0} max={2000000} step={5000} value={d.mortgageBalance || 0} onChange={v => setData({ ...d, mortgageBalance: v })} display={fmt(d.mortgageBalance || 0)} color={C.amber} />
        <div style={{ background: C.amberLight, borderRadius: 10, padding: 12, textAlign: "center", marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, textTransform: "uppercase" }}>Your equity</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: C.amber }}>{fmt(equity)}</div>
          <div style={{ fontSize: 11, color: C.gray500 }}>{fmt(d.homeValue)} – {fmt(d.mortgageBalance)} owed</div>
        </div>
      </WCard>

      <WCard>
        <WTitle color={C.amber}>Household income</WTitle>
        <WSlider label="Gross annual income" min={0} max={500000} step={1000} value={d.income || 0} onChange={v => setData({ ...d, income: v })} display={fmtK(d.income || 0) + "/yr"} color={C.amber} />
        <div style={{ fontSize: 11, color: C.gray500, marginTop: 4 }}>Used to calculate your capital gains tax rate.</div>
      </WCard>

      <WCard>
        <WTitle color={C.amber}>Filing status</WTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {["single", "mfj", "mfs", "hoh"].map(s => (
            <button key={s} onClick={() => setData({ ...d, filingStatus: s })}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: `2px solid ${d.filingStatus === s ? C.amber : C.gray300}`, borderRadius: 10, padding: "10px 14px", background: d.filingStatus === s ? C.amberLight : C.white, cursor: "pointer" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: d.filingStatus === s ? C.amber : C.charcoal }}>{FILING_LABELS[s]}</span>
              <span style={{ fontSize: 11, color: C.gray500 }}>Exclusion: {fmt({ single: 250000, mfj: 500000, mfs: 250000, hoh: 250000 }[s])}</span>
            </button>
          ))}
        </div>
      </WCard>

      <WCard>
        <WTitle color={C.amber}>Years owned</WTitle>
        <WSlider label="Years in this home" min={0} max={30} step={1} value={d.yearsOwned || 0} onChange={v => setData({ ...d, yearsOwned: v })} display={(d.yearsOwned || 0) + " yr"} color={C.amber} />
        {(d.yearsOwned || 0) >= 2
          ? <WAlert type="success">Qualifies for capital gains exclusion — owned 2+ years.</WAlert>
          : <WAlert type="warning">Must own 2+ years for the §121 capital gains exclusion.</WAlert>}
      </WCard>

      <WCard>
        <WTitle color={C.amber}>Property type</WTitle>
        <ChoiceGrid color={C.amber} value={d.propertyType || "primary"} onChange={v => setData({ ...d, propertyType: v })}
          options={[{ v: "primary", icon: "🏠", label: "Primary residence" }, { v: "investment", icon: "🏢", label: "Investment property", note: "1031 exchange may apply" }]} />
        {d.propertyType === "investment" && (
          <WAlert type="info">A §1031 Exchange lets you defer capital gains by reinvesting into a like-kind property within 45/180 days. Requires a qualified intermediary.</WAlert>
        )}
      </WCard>

      <NavRow onNext={onNext} color={C.amber} nextLabel="Selling costs →" />
    </div>
  );
}

function SellerCosts({ data, setData, onNext, onBack }) {
  const d = data;
  const st = d.locationInfo?.state || d.state || "TX";
  const hv = d.homeValue || 0;
  const comm = Math.round(hv * (d.commissionPct || 5.5) / 100);
  const propTax = Math.round(hv * (PROP_TAX[st] || 1) / 100 / 2);
  const title = Math.round(hv * 0.005);
  const escrow = Math.round(hv * 0.01);
  const recording = 250;
  const transfer = Math.round(hv / 1000 * (TRANSFER_TAX[st] || 0));
  const closingTotal = title + escrow + propTax + recording + transfer;
  const prep = (d.repairs || 0) + (d.staging || 0) + (d.photography || 0);
  const totalCosts = comm + closingTotal + prep;

  return (
    <div>
      <WCard>
        <WTitle color={C.amber}>Commission</WTitle>
        <WSlider label="Total commission %" min={0} max={10} step={0.25} value={d.commissionPct || 5.5} onChange={v => setData({ ...d, commissionPct: v })} display={(d.commissionPct || 5.5).toFixed(2) + "%"} color={C.amber} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
          {[{ label: "Traditional", range: "5–6%", note: "Full service" }, { label: "Flat-fee", range: "3–4%", note: "Limited service" }, { label: "FSBO", range: "0–3%", note: "No agent" }].map((m, i) => (
            <div key={i} style={{ background: C.amberLight, borderRadius: 10, padding: 10, textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.amber }}>{m.label}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.charcoal }}>{m.range}</div>
              <div style={{ fontSize: 10, color: C.gray500 }}>{m.note}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 12 }}><WInfoRow label="Commission" value={fmt(comm)} bold /></div>
      </WCard>

      <WCard>
        <WTitle color={C.amber}>Closing costs</WTitle>
        <WInfoRow label="Title insurance" value={fmt(title)} />
        <WInfoRow label="Escrow / settlement" value={fmt(escrow)} />
        <WInfoRow label="Prorated property tax (~6 mo)" value={fmt(propTax)} />
        <WInfoRow label="Recording fees" value={fmt(recording)} />
        <WInfoRow label={`Transfer tax (${st}: ${(TRANSFER_TAX[st] || 0).toFixed(2)}‰)`} value={fmt(transfer)} />
        <WInfoRow label="Total closing costs" value={fmt(closingTotal)} bold topBorder />
      </WCard>

      <WCard>
        <WTitle color={C.amber}>Pre-sale prep</WTitle>
        <WSlider label="Repairs / improvements" min={0} max={50000} step={500} value={d.repairs || 0} onChange={v => setData({ ...d, repairs: v })} display={fmt(d.repairs || 0)} color={C.amber} />
        <WSlider label="Staging" min={0} max={15000} step={250} value={d.staging || 0} onChange={v => setData({ ...d, staging: v })} display={fmt(d.staging || 0)} color={C.amber} />
        <WSlider label="Photography / video" min={0} max={3000} step={100} value={d.photography || 0} onChange={v => setData({ ...d, photography: v })} display={fmt(d.photography || 0)} color={C.amber} />
        <WInfoRow label="Total prep" value={fmt(prep)} bold topBorder />
      </WCard>

      <WCard style={{ background: C.amberLight }}>
        <WInfoRow label="Commission" value={fmt(comm)} />
        <WInfoRow label="Closing costs" value={fmt(closingTotal)} />
        <WInfoRow label="Pre-sale prep" value={fmt(prep)} />
        <WInfoRow label="Total selling costs" value={fmt(totalCosts)} bold topBorder />
      </WCard>

      <NavRow onBack={onBack} onNext={onNext} color={C.amber} nextLabel="Net proceeds →" />
    </div>
  );
}

function SellerProceeds({ data, setData, onNext, onBack }) {
  const d = data;
  const st = d.locationInfo?.state || d.state || "TX";
  const hv = d.homeValue || 0;
  const comm = Math.round(hv * (d.commissionPct || 5.5) / 100);
  const propTax = Math.round(hv * (PROP_TAX[st] || 1) / 100 / 2);
  const closingTotal = Math.round(hv * 0.005) + Math.round(hv * 0.01) + propTax + 250 + Math.round(hv / 1000 * (TRANSFER_TAX[st] || 0));
  const prep = (d.repairs || 0) + (d.staging || 0) + (d.photography || 0);
  const netBeforeTax = Math.max(0, hv - comm - closingTotal - prep - (d.mortgageBalance || 0));

  const costBasis = (d.originalPrice || 0) + (d.improvements || 0);
  const rawGain = Math.max(0, hv - costBasis);
  const status = d.filingStatus || "single";
  const exclusion = (d.yearsOwned || 0) >= 2 && d.propertyType !== "investment"
    ? ({ single: 250000, mfj: 500000, mfs: 250000, hoh: 250000 }[status] || 250000)
    : 0;
  const taxableGain = Math.max(0, rawGain - exclusion);
  const cgRate = calcCapGainsRate((d.income || 0) + taxableGain, status);
  const cgTax = Math.round(taxableGain * cgRate);
  const netAfterTax = Math.max(0, netBeforeTax - cgTax);

  return (
    <div>
      {/* Waterfall */}
      <WCard>
        <WTitle color={C.amber}>Sale proceeds waterfall</WTitle>
        <WInfoRow label="Sale price" value={fmt(hv)} bold />
        <WInfoRow label="− Commission" value={`(${fmt(comm)})`} valueColor={C.red} />
        <WInfoRow label="− Closing costs" value={`(${fmt(closingTotal)})`} valueColor={C.red} />
        <WInfoRow label="− Pre-sale prep" value={`(${fmt(prep)})`} valueColor={C.red} />
        <WInfoRow label="− Mortgage payoff" value={`(${fmt(d.mortgageBalance || 0)})`} valueColor={C.red} />
        <WInfoRow label="= Net before tax" value={fmt(netBeforeTax)} bold valueColor={C.amber} topBorder />
      </WCard>

      {/* Capital gains */}
      <WCard>
        <WTitle color={C.amber}>Capital gains</WTitle>
        <WSlider label="Original purchase price" min={0} max={2000000} step={5000} value={d.originalPrice || 0} onChange={v => setData({ ...d, originalPrice: v })} display={fmt(d.originalPrice || 0)} color={C.amber} />
        <WSlider label="Improvements / upgrades" min={0} max={200000} step={1000} value={d.improvements || 0} onChange={v => setData({ ...d, improvements: v })} display={fmt(d.improvements || 0)} color={C.amber} />
        <WInfoRow label="Cost basis" value={fmt(costBasis)} />
        <WInfoRow label="Total gain" value={fmt(rawGain)} />
        <WInfoRow label={`§121 exclusion (${(d.yearsOwned || 0) >= 2 && d.propertyType !== "investment" ? "qualifies" : "does not qualify"})`} value={exclusion > 0 ? `−${fmt(exclusion)}` : "—"} valueColor={exclusion > 0 ? C.green : C.gray500} />
        <WInfoRow label="Taxable gain" value={fmt(taxableGain)} bold />
        <WInfoRow label={`Cap gains rate (${Math.round(cgRate * 100)}%)`} value={`−${fmt(cgTax)}`} valueColor={C.red} />
        {exclusion === 0 && d.propertyType !== "investment" && (d.yearsOwned || 0) < 2 && (
          <WAlert type="warning">You need to own and live in the home 2+ years to qualify for the capital gains exclusion.</WAlert>
        )}
      </WCard>

      {/* Net */}
      <div style={{ background: C.amberLight, border: `1.5px solid ${C.amber}`, borderRadius: 16, padding: 18, marginBottom: 12, textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Estimated net proceeds (after tax)</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: C.amber }}>{fmt(netAfterTax)}</div>
        {cgTax > 0 && <div style={{ fontSize: 12, color: C.gray500, marginTop: 4 }}>After {fmt(cgTax)} capital gains tax</div>}
        {cgTax === 0 && <div style={{ fontSize: 12, color: C.green, marginTop: 4 }}>No capital gains tax — exclusion covers your gain.</div>}
      </div>

      {cgRate > 0 && (
        <WAlert type="info">
          Your taxable gain of {fmt(taxableGain)} is taxed at {Math.round(cgRate * 100)}% because your total income ({fmtK(d.income || 0)} + {fmt(taxableGain)} gain) puts you in the {Math.round(cgRate * 100)}% long-term capital gains bracket.
          {exclusion > 0 && ` The §121 exclusion already sheltered ${fmt(exclusion)} of your gain.`}
        </WAlert>
      )}

      <NavRow onBack={onBack} onNext={onNext} color={C.amber} nextLabel="Action plan →" />
    </div>
  );
}

function SellerAction({ data, onBack, onDone }) {
  const d = data;
  const [tab, setTab] = useState("now");
  const [done, setDone] = useState(d.checkDone || {});
  const toggle = (t, i) => setDone(p => ({ ...p, [`${t}_${i}`]: !p[`${t}_${i}`] }));

  const hv = d.homeValue || 0;
  const st = d.locationInfo?.state || d.state || "TX";
  const comm = Math.round(hv * (d.commissionPct || 5.5) / 100);
  const propTax = Math.round(hv * (PROP_TAX[st] || 1) / 100 / 2);
  const closingTotal = Math.round(hv * 0.005) + Math.round(hv * 0.01) + propTax + 250 + Math.round(hv / 1000 * (TRANSFER_TAX[st] || 0));
  const prep = (d.repairs || 0) + (d.staging || 0) + (d.photography || 0);
  const netProceeds = Math.max(0, hv - comm - closingTotal - prep - (d.mortgageBalance || 0));

  const phases = {
    now: { label: "Now", items: ["Interview 2–3 listing agents", "Schedule a pre-listing home inspection", "Get a mortgage payoff statement", "Gather records of improvements and upgrades", "Check homestead exemption status", "Decide: sell first or buy first?"] },
    prep: { label: "1–2 months", items: ["Declutter and depersonalize each room", "Make priority repairs from inspection", "Schedule professional staging", "Get professional photos and video tour", "Set listing price with your agent"] },
    listing: { label: "Listing", items: ["List on MLS and syndicated sites", "Schedule open houses and showings", "Review incoming offers", "Negotiate price, contingencies, and timeline", "Accept the best offer"] },
    closing: { label: "Closing", items: ["Buyer inspection period — address requests", "Appraisal ordered by buyer's lender", "Title search and title insurance", "Review closing disclosure (3 days before)", "Final walkthrough with buyer", "Sign closing documents at title company", "Hand over keys — congratulations!"] },
  };

  const allItems = Object.entries(phases).flatMap(([k, p]) => p.items.map((_, i) => `${k}_${i}`));
  const doneCount = allItems.filter(k => done[k]).length;
  const pct = Math.round(doneCount / allItems.length * 100);

  return (
    <div>
      <WCard style={{ background: C.amberLight, border: `1px solid ${C.amber}` }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, textTransform: "uppercase", marginBottom: 4 }}>Estimated net proceeds</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.amber }}>{fmt(netProceeds)}</div>
        </div>
      </WCard>

      <WCard>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.charcoal }}>Overall progress</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: C.amber }}>{pct}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: C.gray200, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: C.amber, borderRadius: 4, transition: "width 0.3s" }} />
        </div>
        <div style={{ fontSize: 10, color: C.gray500, marginTop: 4 }}>{doneCount} of {allItems.length} tasks done</div>
      </WCard>

      <WCard>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {Object.entries(phases).map(([k, p]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ flex: 1, border: "none", borderRadius: 8, padding: "8px 4px", fontSize: 11, fontWeight: 700, cursor: "pointer", background: tab === k ? C.amber : C.gray100, color: tab === k ? C.white : C.charcoal }}>
              {p.label}
            </button>
          ))}
        </div>
        {phases[tab].items.map((item, i) => {
          const key = `${tab}_${i}`;
          const isDone = !!done[key];
          return (
            <button key={i} onClick={() => toggle(tab, i)}
              style={{ display: "flex", alignItems: "flex-start", gap: 10, width: "100%", background: "none", border: "none", borderBottom: `0.5px solid ${C.gray100}`, padding: "8px 0", cursor: "pointer", textAlign: "left" }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${isDone ? C.amber : C.gray300}`, background: isDone ? C.amber : C.white, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                {isDone && <span style={{ color: C.white, fontSize: 11, fontWeight: 800 }}>✓</span>}
              </div>
              <span style={{ fontSize: 13, color: isDone ? C.gray400 : C.charcoal, textDecoration: isDone ? "line-through" : "none", lineHeight: 1.5 }}>{item}</span>
            </button>
          );
        })}
      </WCard>

      <NavRow onBack={onBack} onNext={onDone} color={C.amber} nextLabel="Done ✓" />
    </div>
  );
}

function SellerApp({ onHome }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState(SELLER_DEFAULT);
  const go = s => { setStep(s); window.scrollTo(0, 0); };
  return (
    <div style={{ background: C.cream, minHeight: "100vh", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: C.charcoal }}>
      <SellerHeader step={step} onHome={onHome} />
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px 14px 40px" }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.charcoal, letterSpacing: "-0.02em" }}>
            {["📋 Seller profile", "💸 Selling costs", "💰 Net proceeds", "✅ Action plan"][step - 1]}
          </div>
        </div>
        {step === 1 && <SellerProfile data={data} setData={setData} onNext={() => go(2)} />}
        {step === 2 && <SellerCosts data={data} setData={setData} onNext={() => go(3)} onBack={() => go(1)} />}
        {step === 3 && <SellerProceeds data={data} setData={setData} onNext={() => go(4)} onBack={() => go(2)} />}
        {step === 4 && <SellerAction data={data} onBack={() => go(3)} onDone={onHome} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [mode, setMode] = useState("landing");
  if (mode === "buying") return <BuyingApp onHome={() => setMode("landing")} />;
  if (mode === "renting") return <RenterApp onHome={() => setMode("landing")} />;
  if (mode === "selling") return <SellerApp onHome={() => setMode("landing")} />;
  return <LandingScreen onSelect={setMode} />;
}
