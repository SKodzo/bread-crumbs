// HUD API proxy — returns county FHA loan limit + area median income
// Requires HUD_API_TOKEN env var (free at https://www.huduser.gov/portal/dataset/fmr-api.html)

const STATE_FIPS = {
  AL:"01",AK:"02",AZ:"04",AR:"05",CA:"06",CO:"08",CT:"09",DE:"10",DC:"11",
  FL:"12",GA:"13",HI:"15",ID:"16",IL:"17",IN:"18",IA:"19",KS:"20",KY:"21",
  LA:"22",ME:"23",MD:"24",MA:"25",MI:"26",MN:"27",MS:"28",MO:"29",MT:"30",
  NE:"31",NV:"32",NH:"33",NJ:"34",NM:"35",NY:"36",NC:"37",ND:"38",OH:"39",
  OK:"40",OR:"41",PA:"42",RI:"44",SC:"45",SD:"46",TN:"47",TX:"48",UT:"49",
  VT:"50",VA:"51",WA:"53",WV:"54",WI:"55",WY:"56",
};

// 2024 FHA single-family loan limits — national floor/ceiling and state-level
// Used as fallback when HUD API is unavailable
const FALLBACK_LIMITS = {
  DEFAULT: 498257,
  CA: 1149825, NY: 1149825, NJ: 1089300, HI: 1149825, AK: 1149825,
  MA: 862500,  CO: 787750,  WA: 862500,  OR: 724500,  MD: 862500,
  DC: 1149825, VA: 862500,  TX: 498257,  FL: 498257,  GA: 498257,
  IL: 498257,  OH: 498257,  NC: 498257,  TN: 498257,
};

// National AMI approximations by state (HUD 4-person median, 2024)
// Used as fallback — real values differ by county
const FALLBACK_AMI = {
  DEFAULT: 80000,
  CA:120000, NY:110000, NJ:110000, MA:115000, WA:110000, CO:105000,
  MD:110000, DC:130000, VA:105000, AK:100000, HI:115000,
  TX:85000,  FL:80000,  GA:80000,  IL:90000,  OH:80000,
  NC:75000,  TN:75000,  AZ:85000,  NV:85000,  OR:95000,
};

function normalize(name) {
  return (name || "").toLowerCase().replace(/\s+county$/,"").replace(/[^a-z]/g,"");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");

  const { state, county } = req.query;
  const fips = STATE_FIPS[state];

  const fallback = {
    fhaLimit: FALLBACK_LIMITS[state] || FALLBACK_LIMITS.DEFAULT,
    ami:      FALLBACK_AMI[state]    || FALLBACK_AMI.DEFAULT,
    ami80:    Math.round((FALLBACK_AMI[state] || FALLBACK_AMI.DEFAULT) * 0.80),
    ami120:   Math.round((FALLBACK_AMI[state] || FALLBACK_AMI.DEFAULT) * 1.20),
    county:   county || "",
    state:    state  || "",
    source:   "fallback",
  };

  if (!fips) return res.json(fallback);

  const token = process.env.HUD_API_TOKEN;
  if (!token)  return res.json(fallback);

  try {
    // HUD FHA loan limits for all counties in this state
    const fhaRes = await fetch(
      `https://www.huduser.gov/hudapi/public/fha?type=1&stateId=${fips}&year=2024`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!fhaRes.ok) throw new Error("FHA API error");
    const fhaJson = await fhaRes.json();
    const limits  = fhaJson?.data?.fha_limits || [];

    // Find matching county by fuzzy name match
    const needle = normalize(county);
    let match = limits.find(l => normalize(l.countyName) === needle);
    if (!match && limits.length) {
      match = limits.find(l => normalize(l.countyName).includes(needle) || needle.includes(normalize(l.countyName)));
    }
    const fhaLimit = match ? (match.oneFamily || fallback.fhaLimit) : fallback.fhaLimit;
    const countyId = match?.countyId || null;

    // HUD Income Limits — need county FIPS to query
    let ami = fallback.ami;
    if (countyId) {
      try {
        const ilRes = await fetch(
          `https://www.huduser.gov/hudapi/public/il?type=county&stateId=${fips}&countyId=${countyId}&year=2024`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (ilRes.ok) {
          const ilJson = await ilRes.json();
          const il = ilJson?.data?.[0];
          if (il?.median_income) ami = il.median_income;
        }
      } catch (_) { /* use fallback ami */ }
    }

    res.json({
      fhaLimit,
      ami,
      ami80:  Math.round(ami * 0.80),
      ami120: Math.round(ami * 1.20),
      county: match?.countyName || county || "",
      state,
      source: "hud",
    });
  } catch (_) {
    res.json(fallback);
  }
}
