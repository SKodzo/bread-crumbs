// Vercel serverless function — /api/programs
// Returns DPA program list for a given location + buyer profile.
// calc functions are serialized as calcSpec objects so they can cross the wire.

function getProgramsData(state, city, county, profession, isVet, income, householdSize) {
  const st = (state || "").toUpperCase();
  const ci = (city || "").toLowerCase();
  const co = (county || "").toLowerCase();
  const hs = Math.min(Math.max(Number(householdSize) || 1, 1), 8);

  const HOUSTON_AMI = { 1: 63050, 2: 72050, 3: 81050, 4: 90000, 5: 97200, 6: 104400, 7: 111600, 8: 118800 };
  const houstonAMI = HOUSTON_AMI[hs];

  // Serialize calc as calcSpec — client reconstructs the function
  const pct = (r) => ({ t: "pct", r });
  const fixed = (v) => ({ t: "fixed", v });
  const zero = () => ({ t: "zero" });

  const p = (obj) => ({ calcSpec: zero(), incompat: [], ...obj });
  const progs = [];

  progs.push(p({ id: "fha_prog", name: "FHA Loan", short: "3.5% min down, 580+ credit", amount: "3.5% down", badge: "Federal", layer: "federal", note: "HUD-insured. Available in all 50 states.", url: "https://www.hud.gov/buying/loans" }));
  progs.push(p({ id: "va_prog", name: "VA Home Loan", short: "$0 down for eligible veterans", amount: "$0 down", badge: "Heroes", layer: "heroes", note: "No down payment, no PMI. Veterans, active duty, surviving spouses.", url: "https://www.va.gov/housing-assistance/home-loans/" }));
  progs.push(p({ id: "usda", name: "USDA Rural Development Loan", short: "$0 down for eligible rural/suburban areas", amount: "$0 down", badge: "Federal", layer: "federal", note: "Income limit ~115% AMI. Property must be in USDA-eligible area. Check eligibility at eligibility.sc.egov.usda.gov. Min 640 credit.", url: "https://www.rd.usda.gov/programs-services/single-family-housing-programs" }));
  progs.push(p({ id: "hud_203k", name: "FHA 203(k) Rehab Loan", short: "Buy + renovate in one FHA loan", amount: "Rehab funds", badge: "Federal", layer: "federal", note: "580+ credit, 3.5% down. Rolls renovation costs into your mortgage. Good for fixer-uppers. HUD-approved 203(k) consultant required.", url: "https://www.hud.gov/program_offices/housing/sfh/203k" }));
  progs.push(p({ id: "nfmc", name: "NeighborWorks / NHS DPA", short: "Up to $15K DPA, flexible income limits", amount: "Up to $15K", badge: "Nonprofit", layer: "heroes", calcSpec: fixed(15000), note: "National nonprofit network. No strict AMI cap in many markets. Credit as low as 580. Search nw.org for local affiliate.", url: "https://www.nw.org" }));

  if (st === "TX") {
    progs.push(p({ id: "tsahc", name: "TSAHC Home Sweet Texas", short: "Up to 5% DPA grant, no repayment", amount: "Up to 5%", badge: "State", layer: "state", calcSpec: pct(0.05), incompat: ["tdhca","tsahc_heroes"], amiPct: 1.15, note: "Income limit ~115% AMI (varies by county). tsahc.org", url: "https://www.tsahc.org" }));
    progs.push(p({ id: "tdhca", name: "TDHCA Home Loan Programs", short: "5% DPA + below-market rate · first-time & repeat buyers", amount: "5% of loan", badge: "State", layer: "state", calcSpec: pct(0.05), incompat: ["tsahc","tsahc_heroes"], amiPct: 1.15, note: "My First Texas Home (first-time buyers) & My Choice Texas Home (repeat buyers OK). 30-yr fixed below-market rate. 115% AMI income limit. 620+ FICO. tdhca.state.tx.us", url: "https://www.tdhca.texas.gov" }));
    progs.push(p({ id: "mcc_tx", name: "Texas MCC", short: "15% of interest back as tax credit/yr", amount: "~$1,400+/yr", badge: "Federal", layer: "federal", note: "Reinstated March 2026. First-time buyers only.", url: "https://www.tsahc.org", expires: "Reinstated Mar 2026 — verify active" }));
    progs.push(p({ id: "chenoa", name: "Chenoa Fund", short: "3.5–5% DPA nationally, no AMI cap", amount: "3.5–5%", badge: "National", layer: "federal", calcSpec: pct(0.035), note: "National program via CBC Mortgage Agency. No income limit. 600+ FICO (620+ for best terms). Repeat buyers OK. FHA-backed DPA — forgivable or repayable options. chenoafund.org", url: "https://chenoafund.org" }));

    if (co.includes("harris") || co.includes("fort bend") || co.includes("montgomery") || co.includes("brazoria") || co.includes("galveston") || co.includes("liberty") || co.includes("chambers") || co.includes("waller")) {
      progs.push(p({ id: "seth5star", name: "SETH 5 Star Program", short: "Up to 5% DPA, repeat buyers OK, 620+ FICO", amount: "Up to 5%", badge: "Regional", layer: "city", calcSpec: pct(0.05), note: "Southeast Texas Housing Finance Corp. 8-county Houston metro. $122,100 income limit. 620+ FICO. Repeat buyers allowed. seth.org", url: "https://www.seth.org/homebuyers/5-star-texas-advantage-program" }));
    }

    if (ci.includes("houston") || co.includes("harris")) {
      progs.push(p({ id: "hap", name: "City of Houston HAP", short: "Up to $30K forgivable, city limits", amount: "Up to $30K", badge: "City", layer: "city", calcSpec: fixed(30000), incompat: ["harvey", "hap2"], amiLimit: houstonAMI * 0.80, expires: "Annual cycle — verify availability", note: "Inside Houston city limits. 80% AMI limit. Forgiven after 5 years.", url: "https://houstontx.gov/housing/hap.html" }));
      progs.push(p({ id: "harvey", name: "Harvey HbAP 2.0", short: "Up to $125K if Houston resident 8/25/17", amount: "Up to $125K", badge: "City", layer: "city", calcSpec: fixed(125000), incompat: ["hap", "hap2"], amiLimit: houstonAMI * 1.20, expires: "Rolling — call to confirm funds", note: "Call 832-393-0550 first. 120% AMI limit. Avoid June 18–July 11.", url: "https://houstontx.gov/housing/" }));
      progs.push(p({ id: "hap2", name: "City of Houston HAP 2.0 Expanded", short: "Up to $30K, 120% AMI, Houston taxpayers", amount: "Up to $30K", badge: "City", layer: "city", calcSpec: fixed(30000), incompat: ["hap", "harvey"], amiLimit: houstonAMI * 1.20, expires: "Annual cycle — verify availability", note: "Houston property taxpayers. First-time buyers only. 120% AMI limit. Front-end DTI max 33%, back-end DTI max 45%.", url: "https://houstontx.gov/housing/hap.html" }));
      progs.push(p({ id: "harris_cdbg", name: "Harris County CDBG DPA", short: "Up to $23,800, unincorporated Harris only", amount: "Up to $23,800", badge: "County", layer: "city", calcSpec: fixed(23800), amiLimit: houstonAMI * 0.80, assetCap: 30000, note: "Unincorporated Harris County ONLY (not inside Houston city limits). First-time buyers. 80% AMI income limit ($" + Math.round(houstonAMI * 0.80).toLocaleString() + " for " + hs + "-person household). $30,000 asset cap. 580+ FICO. hcdd.hctx.net", url: "https://www.hcdd.hctx.net/homeownership" }));
      progs.push(p({ id: "harris_sfarfi", name: "Harris County SFARFI", short: "Down payment + closing cost help, 620+ FICO", amount: "Varies", badge: "County", layer: "city", calcSpec: fixed(10000), amiLimit: houstonAMI * 0.80, note: "Harris County Single Family Affordable Rehab Finance Initiative. First-time buyers. 80% AMI limit. 620+ FICO. Front-end DTI max 39%, back-end DTI max 42%.", url: "https://www.hcdd.hctx.net/homeownership" }));
    }

    if (ci.includes("dallas") || co.includes("dallas")) {
      progs.push(p({ id: "dhap", name: "Dallas Homebuyer Assistance", short: "Up to $60K forgivable", amount: "Up to $60K", badge: "City", layer: "city", calcSpec: fixed(60000), note: "Dallas city limits. 80% AMI limit.", url: "https://dallascityhall.com/departments/housing" }));
    }
    if (ci.includes("fort worth") || co.includes("tarrant")) {
      progs.push(p({ id: "fwhap", name: "Fort Worth DPA", short: "Up to $14,999 forgivable", amount: "Up to $14,999", badge: "City", layer: "city", calcSpec: fixed(14999), note: "Fort Worth city limits. 80% AMI limit.", url: "https://www.fortworthtexas.gov/departments/neighborhood-services/homebuyer-assistance" }));
    }
    if (ci.includes("san antonio") || co.includes("bexar")) {
      progs.push(p({ id: "sa_nhsd", name: "SA NHSD Homeownership", short: "Up to $30K forgivable", amount: "Up to $30K", badge: "City", layer: "city", calcSpec: fixed(30000), note: "San Antonio residents. 80% AMI limit.", url: "https://www.sanantonio.gov/nhsd" }));
    }
    if (ci.includes("austin") || co.includes("travis")) {
      progs.push(p({ id: "ahfc", name: "Austin HFC DPA", short: "Up to $40K forgivable", amount: "Up to $40K", badge: "City", layer: "city", calcSpec: fixed(40000), note: "Austin city limits. 80% MFI limit.", url: "https://www.austintexas.gov/department/housing" }));
    }
  }

  if (st === "GA") {
    progs.push(p({ id: "georgia_dream", name: "Georgia Dream", short: "Up to $10K DPA at 0% interest", amount: "Up to $10K", badge: "State", layer: "state", calcSpec: fixed(10000), note: "First-time buyers. Income ~$82K limit.", url: "https://dca.georgia.gov" }));
    progs.push(p({ id: "mcc_ga", name: "Georgia MCC", short: "20% of interest as tax credit/yr", amount: "~$1,500+/yr", badge: "Federal", layer: "federal", note: "Georgia MCC = 20% (higher than TX). First-time buyers.", url: "https://dca.georgia.gov" }));
    if (ci.includes("atlanta") || co.includes("fulton") || co.includes("dekalb")) {
      progs.push(p({ id: "invest_atl", name: "Invest Atlanta", short: "Up to $20K forgivable, Atlanta residents", amount: "Up to $20K", badge: "City", layer: "city", calcSpec: fixed(20000), note: "Atlanta city limits. investatlanta.com", url: "https://www.investatlanta.com/homebuyers/homebuyer-programs-downpayment-assistance" }));
    }
  }

  if (st === "IL") {
    progs.push(p({ id: "ihda_access", name: "IHDA Access Forgivable", short: "$6,000 forgivable DPA", amount: "$6,000", badge: "State", layer: "state", calcSpec: fixed(6000), incompat: ["ihda_def"], note: "Income limit varies by county. ihda.org", url: "https://www.ihda.org" }));
    progs.push(p({ id: "ihda_def", name: "IHDA Access Deferred", short: "$7,500 deferred DPA, 0% interest", amount: "$7,500", badge: "State", layer: "state", calcSpec: fixed(7500), incompat: ["ihda_access"], note: "Repaid when you sell/refinance. ihda.org", url: "https://www.ihda.org" }));
    if (ci.includes("chicago") || co.includes("cook")) {
      progs.push(p({ id: "chicago_dpa", name: "City of Chicago DPA", short: "Up to $14,999 + closing cost help", amount: "Up to $14,999", badge: "City", layer: "city", calcSpec: fixed(14999), note: "Chicago residents. 100% AMI limit.", url: "https://www.chicago.gov/city/en/depts/doh/provdrs/homeownership.html" }));
    }
  }

  if (st === "AZ") {
    progs.push(p({ id: "home_plus", name: "Home Plus AZ", short: "Up to 5% DPA, statewide", amount: "Up to 5%", badge: "State", layer: "state", calcSpec: pct(0.05), note: "No repayment. $122K income limit. homeplus.az.gov", url: "https://homeplus.az.gov" }));
    if (co.includes("maricopa")) {
      progs.push(p({ id: "maricopa_dpa", name: "Maricopa County DPA", short: "Up to $10K for county residents", amount: "Up to $10K", badge: "County", layer: "city", calcSpec: fixed(10000), note: "Outside Phoenix city limits. maricopacounty.gov", url: "https://www.maricopa.gov/5769/Down-Payment-Assistance" }));
    }
    if (ci.includes("phoenix")) {
      progs.push(p({ id: "phoenix_dpa", name: "City of Phoenix DPA", short: "Up to $15K forgivable", amount: "Up to $15K", badge: "City", layer: "city", calcSpec: fixed(15000), note: "Phoenix city limits. 80% AMI limit.", url: "https://www.phoenix.gov/housing/hsg-home-buyer" }));
    }
  }

  if (st === "CA") {
    progs.push(p({ id: "calhfa_myh", name: "CalHFA MyHome Assistance", short: "Up to 3.5% deferred DPA", amount: "Up to 3.5%", badge: "State", layer: "state", calcSpec: pct(0.035), incompat: ["calhfa_dfa"], note: "Deferred payment. Income varies by county. calhfa.ca.gov", url: "https://www.calhfa.ca.gov/homebuyer/programs/myhome.htm" }));
    progs.push(p({ id: "calhfa_dfa", name: "CalHFA Dream For All", short: "Shared appreciation up to 20%", amount: "Up to 20%", badge: "State", layer: "state", calcSpec: pct(0.20), incompat: ["calhfa_myh"], note: "Share appreciation when you sell. calhfa.ca.gov", url: "https://www.calhfa.ca.gov/dreamforall/" }));
    if (co.includes("los angeles") || ci.includes("los angeles")) {
      progs.push(p({ id: "lahd_dpa", name: "LAHD Down Payment Assistance", short: "Up to $140K for LA residents", amount: "Up to $140K", badge: "City", layer: "city", calcSpec: fixed(140000), note: "LA city residents. 80% AMI. lahd.lacity.gov", url: "https://housing.lacity.gov" }));
    }
  }

  if (st === "FL") {
    progs.push(p({ id: "fl_assist", name: "Florida Assist 2nd Mortgage", short: "Up to $10K deferred, 0% interest", amount: "Up to $10K", badge: "State", layer: "state", calcSpec: fixed(10000), note: "Deferred payment. floridahousing.org", url: "https://www.floridahousing.org" }));
    progs.push(p({ id: "fl_mcc", name: "Florida MCC", short: "50% of interest as tax credit (up to $2K/yr)", amount: "Up to $2,000/yr", badge: "Federal", layer: "federal", note: "Florida MCC is very generous — 50% credit. First-time buyers.", url: "https://www.floridahousing.org" }));
    if (co.includes("miami-dade") || ci.includes("miami")) {
      progs.push(p({ id: "miami_ship", name: "Miami-Dade SHIP", short: "Up to $7,500 for county residents", amount: "Up to $7,500", badge: "County", layer: "city", calcSpec: fixed(7500), note: "Miami-Dade County SHIP program. miamidade.gov/housing", url: "https://www.miamidade.gov/housing/hcd-home-ownership.asp" }));
    }
  }

  if (st === "NY") {
    progs.push(p({ id: "sonyma", name: "SONYMA Low Interest Rate", short: "Below-market rate + up to $15K DPA", amount: "Up to $15K", badge: "State", layer: "state", calcSpec: fixed(15000), note: "NY state residents. hcr.ny.gov/sonyma", url: "https://hcr.ny.gov/nyhomes/sonyma" }));
    if (ci.includes("new york") || co.includes("new york")) {
      progs.push(p({ id: "nyc_homefirst", name: "NYC HomeFirst DPA", short: "Up to $100K for NYC residents", amount: "Up to $100K", badge: "City", layer: "city", calcSpec: fixed(100000), note: "NYC 5 boroughs. Requires 8-hr HUD education. nyc.gov/hpd", url: "https://www.nyc.gov/site/hpd/services-and-information/homeownership-assistance.page" }));
    }
  }

  if (!progs.find(p2 => p2.layer === "state")) {
    progs.push(p({ id: "generic_state", name: `${st || "State"} Housing Finance Agency`, short: "Contact your state HFA for DPA programs", amount: "Varies", badge: "State", layer: "state", note: `Search for "${st || state} housing finance agency" or visit HUD.gov for your state's programs.`, url: "https://www.hud.gov/states" }));
  }

  progs.push(p({ id: "naca", name: "NACA Program", short: "Below-market rate, no down payment", amount: "0% down", badge: "Nonprofit", layer: "heroes", note: "Nationwide. No income limit. Intensive process. naca.com", url: "https://www.naca.com" }));

  // Profession programs
  const isTeacher = profession === "teacher";
  const isFirstResp = profession === "first_responder";
  const isLawEnf = profession === "law_enforcement";
  const isHealth = profession === "healthcare";
  const isGovt = profession === "government";
  const isHero = isTeacher || isFirstResp || isLawEnf || isHealth || isGovt;

  if (isTeacher || isFirstResp || isLawEnf) {
    const role = isTeacher ? "K-12 teachers" : isLawEnf ? "law enforcement officers" : "firefighters & EMTs";
    progs.push(p({ id: "gnnd", name: "Good Neighbor Next Door (HUD)", short: "50% off list price on HUD homes in revitalization areas", amount: "50% off price", badge: "Federal", layer: "heroes", calcSpec: pct(0.50), note: `Open to ${role} buying a HUD-listed home in a designated revitalization area. Must live there 3 years. Search HUDHomeStore.com.`, url: "https://www.hud.gov/program_offices/housing/sfh/reo/goodn/gnndabot" }));
  }

  if (isHero) {
    const label = isTeacher ? "teachers" : isFirstResp ? "first responders" : isLawEnf ? "law enforcement" : isHealth ? "healthcare workers" : "government employees";
    progs.push(p({ id: "tnd", name: "Teacher Next Door Program", short: `Grants up to $8,000 + DPA for ${label}`, amount: "Up to $8,000", badge: "Nonprofit", layer: "heroes", calcSpec: fixed(8000), note: `National program open to ${label}. Up to $8,000 grant + down payment assistance. Works with FHA, VA, USDA, and conventional loans. No income limit on grant. teachernextdoor.us`, url: "https://teachernextdoor.us" }));
  }

  if (isHero || isVet) {
    progs.push(p({ id: "hfh_rebate", name: "Homes for Heroes", short: "Avg $1,500 in agent & lender fee rebates at closing", amount: "~$1,500", badge: "Nonprofit", layer: "heroes", calcSpec: fixed(1500), note: "Free program — affiliated agents and lenders give back a portion of fees at closing. Average savings $1,500. homesforheroes.com", url: "https://www.homesforheroes.com" }));
  }

  if (isTeacher) {
    progs.push(p({ id: "edu_mtg", name: "Educator Mortgage Program", short: "0.125–0.25% rate discount + $800 closing credit", amount: "$800 + rate cut", badge: "Nonprofit", layer: "heroes", calcSpec: fixed(800), note: "Available through participating lenders nationwide. Rate reduction + $800 closing cost credit for educators. educatormortgage.com", url: "https://www.educatormortgage.com" }));
  }

  if (st === "TX" && isHero) {
    const heroLabel = isTeacher ? "teachers" : isFirstResp ? "firefighters/EMS" : isLawEnf ? "law enforcement" : isHealth ? "nurses/allied health" : "public service employees";
    progs.push(p({ id: "tsahc_heroes", name: "TSAHC Homes for Texas Heroes", short: `5% DPA grant for ${heroLabel}`, amount: "5% grant", badge: "State", layer: "heroes", calcSpec: pct(0.05), incompat: ["tsahc","tdhca"], note: `TSAHC Heroes program for ${heroLabel}. Stackable with Texas MCC. Income limits vary by county. tsahc.org`, url: "https://www.tsahc.org/homebuyers/" }));
  }

  if (st === "GA" && (isTeacher || isFirstResp || isLawEnf || isHealth)) {
    progs.push(p({ id: "ga_dream_pen", name: "Georgia Dream PEN", short: "Extra $2,500 DPA on top of Georgia Dream", amount: "+$2,500", badge: "State", layer: "heroes", calcSpec: fixed(2500), note: "PEN = Protectors + Educators + Nurses. Stack on top of base Georgia Dream DPA. First-time buyers.", url: "https://dca.georgia.gov" }));
  }

  if (st === "CA" && isTeacher) {
    progs.push(p({ id: "ca_ectp", name: "Extra Credit Teacher Home Purchase (CalHFA)", short: "Below-market rate mortgage for school employees", amount: "Rate discount", badge: "State", layer: "heroes", note: "CalHFA program for K-12 teachers, administrators, and classified staff. Below-market rate stacks with CalHFA MyHome DPA.", url: "https://www.calhfa.ca.gov/homebuyer/programs/school.htm" }));
  }

  if (st === "FL" && (isFirstResp || isLawEnf || isTeacher || isHealth || isGovt)) {
    progs.push(p({ id: "fl_hometown", name: "FL Hometown Heroes Housing Program", short: "5% DPA up to $35,000 for community workers", amount: "Up to $35,000", badge: "State", layer: "heroes", calcSpec: fixed(35000), note: "Open to teachers, firefighters, law enforcement, EMS, nurses, and other community workforce employees. Must be full-time FL employee.", url: "https://www.floridahousing.org/" }));
  }

  if (st === "IL" && isTeacher) {
    progs.push(p({ id: "il_teacher", name: "IHDA — Educator Assistance", short: "$7,500 DPA + ask about profession overlays", amount: "$7,500+", badge: "State", layer: "heroes", calcSpec: fixed(7500), note: "Illinois educators can stack IHDA DPA with profession-specific overlays. Ask your lender explicitly about teacher benefits.", url: "https://www.ihda.org" }));
  }

  if (st === "NY" && isHero) {
    progs.push(p({ id: "ny_hero_prog", name: "SONYMA Achieving the Dream — Professions", short: "Lowest SONYMA rate + stackable DPA for qualifying workers", amount: "Rate + DPA", badge: "State", layer: "heroes", note: "SONYMA's Achieving the Dream program. First responders, educators, healthcare workers, and public employees. Stack with NYC HomeFirst.", url: "https://hcr.ny.gov/nyhomes/sonyma" }));
  }

  return progs;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

  const {
    state = "",
    city = "",
    county = "",
    profession = "none",
    isVet = "false",
    income = "0",
    householdSize = "1",
  } = req.query;

  try {
    const programs = getProgramsData(
      state, city, county,
      profession,
      isVet === "true",
      Number(income),
      Number(householdSize)
    );
    res.status(200).json({ programs, source: "serverless", ts: Date.now() });
  } catch (err) {
    res.status(500).json({ error: "Failed to load programs" });
  }
};
