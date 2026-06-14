import { useState, useEffect } from "react";
import jsPDF from "jspdf";

const C = {
  green:"#1B6B44",greenMid:"#4A9B6F",greenLight:"#E8F5EE",greenPale:"#F2FAF6",
  amber:"#E8A020",amberLight:"#FEF3DC",
  cream:"#FBF8F3",white:"#FFFFFF",charcoal:"#2C2C2C",
  gray700:"#4B5563",gray500:"#6B7280",gray300:"#D1D5DB",gray100:"#F3F4F6",
  red:"#DC2626",redLight:"#FEE2E2",blue:"#1D4ED8",blueLight:"#DBEAFE",
};

const mpi=(loan,ar,mo)=>{if(loan<=0||ar<=0)return 0;const r=ar/100/12;return loan*(r*Math.pow(1+r,mo))/(Math.pow(1+r,mo)-1);};
const calcTax=(gross,pretax)=>{const t=Math.max(0,gross-pretax-14600);let f=0;if(t>609350)f=184956+(t-609350)*.37;else if(t>243725)f=53579+(t-243725)*.35;else if(t>100525)f=17168+(t-100525)*.24;else if(t>47150)f=5426+(t-47150)*.22;else if(t>11600)f=1160+(t-11600)*.12;else f=t*.10;return Math.round((f+Math.min(gross,168600)*.062+gross*.0145)/12);};
const convRate=(sc,dp)=>{let b=6.51;if(sc>=780)b-=.20;else if(sc>=760)b-=.12;else if(sc>=740)b-=.05;else if(sc>=720)b+=.10;else if(sc>=700)b+=.20;else if(sc>=680)b+=.35;else b+=.55;if(dp<5)b+=.15;else if(dp<10)b+=.05;else if(dp>=20)b-=.10;return Math.round(b*100)/100;};
const fmt=n=>"$"+Math.round(Math.max(0,n)).toLocaleString();
const fmtK=n=>"$"+Math.round(Math.abs(n)/1000)+"K";

function getLoanRec(score,dpPct,isVet){
  if(isVet)return{type:"va",reason:"VA gives you $0 down and the lowest available rate — the strongest loan if you've served."};
  if(score>=720&&dpPct>=5)return{type:"conv",reason:`At ${score}+ your PMI rate is low and cancels at 20% equity — cheaper long-term than FHA's lifetime MIP.`};
  if(score>=620&&dpPct>=20)return{type:"conv",reason:"With 20% down you have no PMI on either loan — conventional wins with its lower base rate."};
  if(score<620)return{type:"fha",reason:`Below 620, conventional lenders add heavy surcharges. FHA's flat MIP is more predictable at your score.`};
  return{type:"fha",reason:`With ${dpPct}% down and a ${score} score, FHA's minimum requirements and flexible guidelines are your best entry point.`};
}

const ZIP_DB={
  "77001":["TX","Houston","Harris"],"77002":["TX","Houston","Harris"],"77003":["TX","Houston","Harris"],
  "77004":["TX","Houston","Harris"],"77005":["TX","Houston","Harris"],"77006":["TX","Houston","Harris"],
  "77007":["TX","Houston","Harris"],"77008":["TX","Houston","Harris"],"77009":["TX","Houston","Harris"],
  "77025":["TX","Houston","Harris"],"77030":["TX","Houston","Harris"],"77056":["TX","Houston","Harris"],
  "77079":["TX","Houston","Harris"],"77080":["TX","Houston","Harris"],"77081":["TX","Houston","Harris"],
  "77082":["TX","Houston","Harris"],"77084":["TX","Houston","Harris"],"77096":["TX","Houston","Harris"],
  "77098":["TX","Houston","Harris"],"77099":["TX","Houston","Harris"],
  "77338":["TX","Humble","Harris"],"77346":["TX","Humble","Harris"],
  "77373":["TX","Spring","Harris"],"77379":["TX","Spring","Harris"],"77388":["TX","Spring","Harris"],
  "77429":["TX","Cypress","Harris"],"77433":["TX","Cypress","Harris"],
  "77449":["TX","Katy","Harris"],"77450":["TX","Katy","Harris"],"77493":["TX","Katy","Harris"],
  "77494":["TX","Katy","Fort Bend"],
  "77469":["TX","Richmond","Fort Bend"],"77478":["TX","Sugar Land","Fort Bend"],
  "77479":["TX","Sugar Land","Fort Bend"],"77489":["TX","Missouri City","Fort Bend"],
  "77545":["TX","Missouri City","Fort Bend"],
  "77546":["TX","Friendswood","Galveston"],"77573":["TX","League City","Galveston"],
  "77581":["TX","Pearland","Brazoria"],"77584":["TX","Pearland","Brazoria"],
  "75034":["TX","Frisco","Collin"],"75035":["TX","Frisco","Collin"],
  "75040":["TX","Garland","Dallas"],"75041":["TX","Garland","Dallas"],
  "75070":["TX","McKinney","Collin"],"75071":["TX","McKinney","Collin"],
  "75074":["TX","Plano","Collin"],"75075":["TX","Plano","Collin"],
  "75201":["TX","Dallas","Dallas"],"75202":["TX","Dallas","Dallas"],"75203":["TX","Dallas","Dallas"],
  "75204":["TX","Dallas","Dallas"],"75205":["TX","Dallas","Dallas"],"75206":["TX","Dallas","Dallas"],
  "75207":["TX","Dallas","Dallas"],"75208":["TX","Dallas","Dallas"],"75209":["TX","Dallas","Dallas"],
  "75210":["TX","Dallas","Dallas"],"75211":["TX","Dallas","Dallas"],"75212":["TX","Dallas","Dallas"],
  "75214":["TX","Dallas","Dallas"],"75215":["TX","Dallas","Dallas"],"75216":["TX","Dallas","Dallas"],
  "75217":["TX","Dallas","Dallas"],"75218":["TX","Dallas","Dallas"],"75219":["TX","Dallas","Dallas"],
  "75220":["TX","Dallas","Dallas"],"75224":["TX","Dallas","Dallas"],"75228":["TX","Dallas","Dallas"],
  "75229":["TX","Dallas","Dallas"],"75230":["TX","Dallas","Dallas"],"75231":["TX","Dallas","Dallas"],
  "75232":["TX","Dallas","Dallas"],"75240":["TX","Dallas","Dallas"],"75243":["TX","Dallas","Dallas"],
  "75248":["TX","Dallas","Dallas"],"75251":["TX","Dallas","Dallas"],"75252":["TX","Dallas","Dallas"],
  "76101":["TX","Fort Worth","Tarrant"],"76102":["TX","Fort Worth","Tarrant"],"76103":["TX","Fort Worth","Tarrant"],
  "76104":["TX","Fort Worth","Tarrant"],"76105":["TX","Fort Worth","Tarrant"],"76106":["TX","Fort Worth","Tarrant"],
  "76107":["TX","Fort Worth","Tarrant"],"76109":["TX","Fort Worth","Tarrant"],"76110":["TX","Fort Worth","Tarrant"],
  "76111":["TX","Fort Worth","Tarrant"],"76112":["TX","Fort Worth","Tarrant"],"76114":["TX","Fort Worth","Tarrant"],
  "76115":["TX","Fort Worth","Tarrant"],"76116":["TX","Fort Worth","Tarrant"],"76118":["TX","Fort Worth","Tarrant"],
  "76119":["TX","Fort Worth","Tarrant"],"76120":["TX","Fort Worth","Tarrant"],"76123":["TX","Fort Worth","Tarrant"],
  "76132":["TX","Fort Worth","Tarrant"],"76133":["TX","Fort Worth","Tarrant"],"76137":["TX","Fort Worth","Tarrant"],
  "76140":["TX","Fort Worth","Tarrant"],
  "78201":["TX","San Antonio","Bexar"],"78202":["TX","San Antonio","Bexar"],"78203":["TX","San Antonio","Bexar"],
  "78204":["TX","San Antonio","Bexar"],"78205":["TX","San Antonio","Bexar"],"78207":["TX","San Antonio","Bexar"],
  "78208":["TX","San Antonio","Bexar"],"78209":["TX","San Antonio","Bexar"],"78210":["TX","San Antonio","Bexar"],
  "78212":["TX","San Antonio","Bexar"],"78213":["TX","San Antonio","Bexar"],"78216":["TX","San Antonio","Bexar"],
  "78217":["TX","San Antonio","Bexar"],"78218":["TX","San Antonio","Bexar"],"78220":["TX","San Antonio","Bexar"],
  "78224":["TX","San Antonio","Bexar"],"78228":["TX","San Antonio","Bexar"],"78229":["TX","San Antonio","Bexar"],
  "78230":["TX","San Antonio","Bexar"],"78232":["TX","San Antonio","Bexar"],"78240":["TX","San Antonio","Bexar"],
  "78245":["TX","San Antonio","Bexar"],"78248":["TX","San Antonio","Bexar"],"78249":["TX","San Antonio","Bexar"],
  "78250":["TX","San Antonio","Bexar"],"78251":["TX","San Antonio","Bexar"],"78258":["TX","San Antonio","Bexar"],
  "78260":["TX","San Antonio","Bexar"],"78261":["TX","San Antonio","Bexar"],
  "78701":["TX","Austin","Travis"],"78702":["TX","Austin","Travis"],"78703":["TX","Austin","Travis"],
  "78704":["TX","Austin","Travis"],"78705":["TX","Austin","Travis"],"78721":["TX","Austin","Travis"],
  "78723":["TX","Austin","Travis"],"78724":["TX","Austin","Travis"],"78727":["TX","Austin","Travis"],
  "78728":["TX","Austin","Travis"],"78729":["TX","Austin","Travis"],"78731":["TX","Austin","Travis"],
  "78735":["TX","Austin","Travis"],"78741":["TX","Austin","Travis"],"78744":["TX","Austin","Travis"],
  "78745":["TX","Austin","Travis"],"78748":["TX","Austin","Travis"],"78749":["TX","Austin","Travis"],
  "78750":["TX","Austin","Travis"],"78751":["TX","Austin","Travis"],"78752":["TX","Austin","Travis"],
  "78753":["TX","Austin","Travis"],"78757":["TX","Austin","Travis"],"78758":["TX","Austin","Travis"],
  "78759":["TX","Austin","Travis"],
  "78613":["TX","Cedar Park","Williamson"],"78660":["TX","Pflugerville","Travis"],
  "78664":["TX","Round Rock","Williamson"],"78640":["TX","Kyle","Hays"],"78610":["TX","Buda","Hays"],
  "30301":["GA","Atlanta","Fulton"],"30302":["GA","Atlanta","Fulton"],"30303":["GA","Atlanta","Fulton"],
  "30305":["GA","Atlanta","Fulton"],"30306":["GA","Atlanta","Fulton"],"30307":["GA","Atlanta","Fulton"],
  "30308":["GA","Atlanta","Fulton"],"30309":["GA","Atlanta","Fulton"],"30310":["GA","Atlanta","Fulton"],
  "30311":["GA","Atlanta","Fulton"],"30312":["GA","Atlanta","Fulton"],"30314":["GA","Atlanta","Fulton"],
  "30315":["GA","Atlanta","Fulton"],"30316":["GA","Atlanta","Fulton"],"30318":["GA","Atlanta","Fulton"],
  "30319":["GA","Atlanta","DeKalb"],"30324":["GA","Atlanta","Fulton"],"30327":["GA","Atlanta","Fulton"],
  "30328":["GA","Sandy Springs","Fulton"],"30329":["GA","Atlanta","DeKalb"],
  "30337":["GA","East Point","Fulton"],"30349":["GA","College Park","Fulton"],
  "30030":["GA","Decatur","DeKalb"],"30032":["GA","Decatur","DeKalb"],"30033":["GA","Decatur","DeKalb"],
  "30060":["GA","Marietta","Cobb"],"30062":["GA","Marietta","Cobb"],"30080":["GA","Smyrna","Cobb"],
  "30005":["GA","Alpharetta","Fulton"],"30022":["GA","Alpharetta","Fulton"],
  "60601":["IL","Chicago","Cook"],"60602":["IL","Chicago","Cook"],"60603":["IL","Chicago","Cook"],
  "60604":["IL","Chicago","Cook"],"60605":["IL","Chicago","Cook"],"60607":["IL","Chicago","Cook"],
  "60608":["IL","Chicago","Cook"],"60609":["IL","Chicago","Cook"],"60610":["IL","Chicago","Cook"],
  "60611":["IL","Chicago","Cook"],"60612":["IL","Chicago","Cook"],"60613":["IL","Chicago","Cook"],
  "60614":["IL","Chicago","Cook"],"60615":["IL","Chicago","Cook"],"60616":["IL","Chicago","Cook"],
  "60617":["IL","Chicago","Cook"],"60618":["IL","Chicago","Cook"],"60619":["IL","Chicago","Cook"],
  "60620":["IL","Chicago","Cook"],"60621":["IL","Chicago","Cook"],"60622":["IL","Chicago","Cook"],
  "60623":["IL","Chicago","Cook"],"60624":["IL","Chicago","Cook"],"60625":["IL","Chicago","Cook"],
  "60626":["IL","Chicago","Cook"],"60628":["IL","Chicago","Cook"],"60629":["IL","Chicago","Cook"],
  "60630":["IL","Chicago","Cook"],"60634":["IL","Chicago","Cook"],"60636":["IL","Chicago","Cook"],
  "60637":["IL","Chicago","Cook"],"60638":["IL","Chicago","Cook"],"60639":["IL","Chicago","Cook"],
  "60640":["IL","Chicago","Cook"],"60641":["IL","Chicago","Cook"],"60642":["IL","Chicago","Cook"],
  "60643":["IL","Chicago","Cook"],"60645":["IL","Chicago","Cook"],"60647":["IL","Chicago","Cook"],
  "60651":["IL","Chicago","Cook"],"60654":["IL","Chicago","Cook"],"60657":["IL","Chicago","Cook"],
  "85001":["AZ","Phoenix","Maricopa"],"85003":["AZ","Phoenix","Maricopa"],"85004":["AZ","Phoenix","Maricopa"],
  "85006":["AZ","Phoenix","Maricopa"],"85007":["AZ","Phoenix","Maricopa"],"85008":["AZ","Phoenix","Maricopa"],
  "85009":["AZ","Phoenix","Maricopa"],"85012":["AZ","Phoenix","Maricopa"],"85013":["AZ","Phoenix","Maricopa"],
  "85014":["AZ","Phoenix","Maricopa"],"85015":["AZ","Phoenix","Maricopa"],"85016":["AZ","Phoenix","Maricopa"],
  "85017":["AZ","Phoenix","Maricopa"],"85018":["AZ","Phoenix","Maricopa"],"85019":["AZ","Phoenix","Maricopa"],
  "85020":["AZ","Phoenix","Maricopa"],"85021":["AZ","Phoenix","Maricopa"],"85022":["AZ","Phoenix","Maricopa"],
  "85023":["AZ","Phoenix","Maricopa"],"85024":["AZ","Phoenix","Maricopa"],"85027":["AZ","Phoenix","Maricopa"],
  "85028":["AZ","Phoenix","Maricopa"],"85029":["AZ","Phoenix","Maricopa"],"85031":["AZ","Phoenix","Maricopa"],
  "85032":["AZ","Phoenix","Maricopa"],"85033":["AZ","Phoenix","Maricopa"],"85034":["AZ","Phoenix","Maricopa"],
  "85040":["AZ","Phoenix","Maricopa"],"85041":["AZ","Phoenix","Maricopa"],"85042":["AZ","Phoenix","Maricopa"],
  "85044":["AZ","Phoenix","Maricopa"],"85048":["AZ","Phoenix","Maricopa"],"85050":["AZ","Phoenix","Maricopa"],
  "85051":["AZ","Phoenix","Maricopa"],"85053":["AZ","Phoenix","Maricopa"],"85054":["AZ","Phoenix","Maricopa"],
  "85201":["AZ","Mesa","Maricopa"],"85202":["AZ","Mesa","Maricopa"],"85203":["AZ","Mesa","Maricopa"],
  "85204":["AZ","Mesa","Maricopa"],"85205":["AZ","Mesa","Maricopa"],"85206":["AZ","Mesa","Maricopa"],
  "85251":["AZ","Scottsdale","Maricopa"],"85254":["AZ","Scottsdale","Maricopa"],
  "85255":["AZ","Scottsdale","Maricopa"],"85258":["AZ","Scottsdale","Maricopa"],
  "85301":["AZ","Glendale","Maricopa"],"85302":["AZ","Glendale","Maricopa"],"85303":["AZ","Glendale","Maricopa"],
  "85304":["AZ","Glendale","Maricopa"],"85308":["AZ","Glendale","Maricopa"],
  "90001":["CA","Los Angeles","Los Angeles"],"90002":["CA","Los Angeles","Los Angeles"],
  "90003":["CA","Los Angeles","Los Angeles"],"90004":["CA","Los Angeles","Los Angeles"],
  "90005":["CA","Los Angeles","Los Angeles"],"90006":["CA","Los Angeles","Los Angeles"],
  "90007":["CA","Los Angeles","Los Angeles"],"90008":["CA","Los Angeles","Los Angeles"],
  "90011":["CA","Los Angeles","Los Angeles"],"90012":["CA","Los Angeles","Los Angeles"],
  "90013":["CA","Los Angeles","Los Angeles"],"90014":["CA","Los Angeles","Los Angeles"],
  "90015":["CA","Los Angeles","Los Angeles"],"90016":["CA","Los Angeles","Los Angeles"],
  "90017":["CA","Los Angeles","Los Angeles"],"90018":["CA","Los Angeles","Los Angeles"],
  "90019":["CA","Los Angeles","Los Angeles"],"90020":["CA","Los Angeles","Los Angeles"],
  "90021":["CA","Los Angeles","Los Angeles"],"90022":["CA","Los Angeles","Los Angeles"],
  "90023":["CA","Los Angeles","Los Angeles"],"90024":["CA","Los Angeles","Los Angeles"],
  "90025":["CA","Los Angeles","Los Angeles"],"90026":["CA","Los Angeles","Los Angeles"],
  "90027":["CA","Los Angeles","Los Angeles"],"90028":["CA","Los Angeles","Los Angeles"],
  "90029":["CA","Los Angeles","Los Angeles"],"90031":["CA","Los Angeles","Los Angeles"],
  "90032":["CA","Los Angeles","Los Angeles"],"90033":["CA","Los Angeles","Los Angeles"],
  "90034":["CA","Los Angeles","Los Angeles"],"90035":["CA","Los Angeles","Los Angeles"],
  "90036":["CA","Los Angeles","Los Angeles"],"90037":["CA","Los Angeles","Los Angeles"],
  "90038":["CA","Los Angeles","Los Angeles"],"90041":["CA","Los Angeles","Los Angeles"],
  "90042":["CA","Los Angeles","Los Angeles"],"90043":["CA","Los Angeles","Los Angeles"],
  "90044":["CA","Los Angeles","Los Angeles"],"90045":["CA","Los Angeles","Los Angeles"],
  "90046":["CA","Los Angeles","Los Angeles"],"90047":["CA","Los Angeles","Los Angeles"],
  "90048":["CA","Los Angeles","Los Angeles"],"90049":["CA","Los Angeles","Los Angeles"],
  "10001":["NY","New York","New York"],"10002":["NY","New York","New York"],"10003":["NY","New York","New York"],
  "10004":["NY","New York","New York"],"10005":["NY","New York","New York"],"10006":["NY","New York","New York"],
  "10007":["NY","New York","New York"],"10009":["NY","New York","New York"],"10010":["NY","New York","New York"],
  "10011":["NY","New York","New York"],"10012":["NY","New York","New York"],"10013":["NY","New York","New York"],
  "10014":["NY","New York","New York"],"10016":["NY","New York","New York"],"10017":["NY","New York","New York"],
  "10018":["NY","New York","New York"],"10019":["NY","New York","New York"],"10021":["NY","New York","New York"],
  "10022":["NY","New York","New York"],"10023":["NY","New York","New York"],"10024":["NY","New York","New York"],
  "10025":["NY","New York","New York"],"10026":["NY","New York","New York"],"10027":["NY","New York","New York"],
  "10028":["NY","New York","New York"],"10029":["NY","New York","New York"],"10030":["NY","New York","New York"],
  "10031":["NY","New York","New York"],"10032":["NY","New York","New York"],"10033":["NY","New York","New York"],
  "10034":["NY","New York","New York"],"10035":["NY","New York","New York"],"10036":["NY","New York","New York"],
  "10037":["NY","New York","New York"],"10038":["NY","New York","New York"],"10039":["NY","New York","New York"],
  "10040":["NY","New York","New York"],
  "33101":["FL","Miami","Miami-Dade"],"33125":["FL","Miami","Miami-Dade"],"33126":["FL","Miami","Miami-Dade"],
  "33127":["FL","Miami","Miami-Dade"],"33128":["FL","Miami","Miami-Dade"],"33129":["FL","Miami","Miami-Dade"],
  "33130":["FL","Miami","Miami-Dade"],"33131":["FL","Miami","Miami-Dade"],"33132":["FL","Miami","Miami-Dade"],
  "33133":["FL","Miami","Miami-Dade"],"33135":["FL","Miami","Miami-Dade"],"33136":["FL","Miami","Miami-Dade"],
  "33137":["FL","Miami","Miami-Dade"],"33138":["FL","Miami","Miami-Dade"],"33139":["FL","Miami Beach","Miami-Dade"],
  "33140":["FL","Miami Beach","Miami-Dade"],"33141":["FL","Miami Beach","Miami-Dade"],
  "33142":["FL","Miami","Miami-Dade"],"33143":["FL","Miami","Miami-Dade"],"33145":["FL","Miami","Miami-Dade"],
  "33147":["FL","Miami","Miami-Dade"],"33150":["FL","Miami","Miami-Dade"],"33155":["FL","Miami","Miami-Dade"],
  "33157":["FL","Miami","Miami-Dade"],"33160":["FL","North Miami Beach","Miami-Dade"],
  "33161":["FL","Miami","Miami-Dade"],"33165":["FL","Miami","Miami-Dade"],"33166":["FL","Miami","Miami-Dade"],
  "33168":["FL","Miami","Miami-Dade"],"33172":["FL","Miami","Miami-Dade"],"33175":["FL","Miami","Miami-Dade"],
  "33176":["FL","Miami","Miami-Dade"],"33178":["FL","Miami","Miami-Dade"],"33180":["FL","Aventura","Miami-Dade"],
  "33183":["FL","Miami","Miami-Dade"],"33186":["FL","Miami","Miami-Dade"],"33193":["FL","Miami","Miami-Dade"],
};

const CRIME_DB={
  "Houston":{safety:3,label:"High crime",detail:"Houston\'s crime rates are above the national average, concentrated in specific corridors. Crime varies significantly block by block — your specific zip code and street matter more than the city average.",color:"#DC2626",bg:"#FEE2E2",stats:[{type:"Violent crime rate",value:"11.2 per 1,000 residents",national:"4.0 national avg"},{type:"Property crime rate",value:"38.6 per 1,000 residents",national:"21.0 national avg"},{type:"Most common",value:"Theft/larceny & burglary",national:""},{type:"Trend",value:"Overall crime declining since 2020",national:""}],source:{name:"Houston Police Department Annual Report & FBI UCR",url:"https://www.houstontx.gov/police/"}},
  "Dallas":{safety:4,label:"Above-avg crime",detail:"Dallas has above-average crime rates, but they vary widely across neighborhoods. Many areas within city limits are safe and family-friendly. Review the crime map for your specific target streets.",color:"#E8A020",bg:"#FEF3DC",stats:[{type:"Violent crime rate",value:"8.5 per 1,000 residents",national:"4.0 national avg"},{type:"Property crime rate",value:"35.9 per 1,000 residents",national:"21.0 national avg"},{type:"Most common",value:"Motor vehicle theft & theft",national:""},{type:"Trend",value:"Property crime declining; violent crime stable",national:""}],source:{name:"Dallas Police Department Crime Statistics & FBI UCR",url:"https://www.dallaspolice.net/"}},
  "Fort Worth":{safety:5,label:"Moderate crime",detail:"Fort Worth is mid-range for a Texas metro. Crime is unevenly distributed — western and northern areas trend notably safer than eastern and southern corridors.",color:"#E8A020",bg:"#FEF3DC"},
  "Austin":{safety:6,label:"Moderate crime",detail:"Austin is safer than most Texas metros. Property crime has risen with rapid growth; violent crime remains relatively low compared to similarly sized cities.",color:"#4A9B6F",bg:"#E8F5EE"},
  "San Antonio":{safety:4,label:"Above-avg crime",detail:"San Antonio\'s crime rates are above national averages, though they vary significantly by area. The data below reflects the city as a whole — your specific zip code may be considerably safer.",color:"#E8A020",bg:"#FEF3DC",stats:[{type:"Violent crime rate",value:"6.8 per 1,000 residents",national:"4.0 national avg"},{type:"Property crime rate",value:"34.7 per 1,000 residents",national:"21.0 national avg"},{type:"Most common",value:"Theft/larceny & auto theft",national:""},{type:"Trend",value:"Gradual improvement over 5 years",national:""}],source:{name:"San Antonio Police Department & FBI UCR",url:"https://www.sa.gov/Directory/Departments/SAPD"}},
  "Frisco":{safety:9,label:"Very safe",detail:"Frisco consistently ranks among the safest cities in Texas and nationally.",color:"#1B6B44",bg:"#E8F5EE"},
  "Plano":{safety:9,label:"Very safe",detail:"Plano is one of the safest large cities in America.",color:"#1B6B44",bg:"#E8F5EE"},
  "McKinney":{safety:8,label:"Safe",detail:"McKinney has below-average crime and is one of the safer DFW suburbs.",color:"#1B6B44",bg:"#E8F5EE"},
  "Katy":{safety:8,label:"Safe",detail:"Katy has low crime relative to the Houston metro and is considered very family-friendly.",color:"#1B6B44",bg:"#E8F5EE"},
  "Sugar Land":{safety:9,label:"Very safe",detail:"Sugar Land is one of the safest cities in Texas.",color:"#1B6B44",bg:"#E8F5EE"},
  "Pearland":{safety:8,label:"Safe",detail:"Pearland has below-average crime and ranks well among Houston suburbs.",color:"#1B6B44",bg:"#E8F5EE"},
  "Humble":{safety:5,label:"Moderate crime",detail:"Humble is near average for the Houston metro. Crime varies noticeably by street — check the specific block you\' re considering.",color:"#E8A020",bg:"#FEF3DC"},
  "Spring":{safety:5,label:"Moderate crime",detail:"Spring varies significantly by area. Western zip codes near The Woodlands are notably safer than eastern areas.",color:"#E8A020",bg:"#FEF3DC"},
  "Cypress":{safety:7,label:"Relatively safe",detail:"Cypress has below-average crime for the Houston metro.",color:"#4A9B6F",bg:"#E8F5EE"},
  "Richmond":{safety:7,label:"Relatively safe",detail:"Richmond/Fort Bend area has below-average crime.",color:"#4A9B6F",bg:"#E8F5EE"},
  "Missouri City":{safety:6,label:"Moderate crime",detail:"Missouri City is near average; newer western sections are safer.",color:"#4A9B6F",bg:"#E8F5EE"},
  "League City":{safety:8,label:"Safe",detail:"League City has consistently low crime rates for the Houston area.",color:"#1B6B44",bg:"#E8F5EE"},
  "Friendswood":{safety:9,label:"Very safe",detail:"Friendswood is one of the safest suburbs in the Houston-Galveston area.",color:"#1B6B44",bg:"#E8F5EE"},
  "Garland":{safety:5,label:"Moderate crime",detail:"Garland is near the Dallas metro average. An affordable entry point into DFW — crime is unevenly distributed across zip codes.",color:"#E8A020",bg:"#FEF3DC"},
  "Atlanta":{safety:2,label:"Very high crime",detail:"Atlanta has some of the highest crime rates among major US cities, concentrated in specific corridors. The statistics below reflect the city as a whole — crime varies drastically by neighborhood, and many Atlanta zip codes are well within safe ranges.",color:"#DC2626",bg:"#FEE2E2",stats:[{type:"Violent crime rate",value:"21.4 per 1,000 residents",national:"4.0 national avg"},{type:"Property crime rate",value:"58.3 per 1,000 residents",national:"21.0 national avg"},{type:"Most common",value:"Aggravated assault & auto theft",national:""},{type:"Trend",value:"Auto theft surged post-2020; other crimes mixed",national:""}],source:{name:"Atlanta Police Department CompStat & FBI UCR",url:"https://www.atlantapd.org/"}},
  "Decatur":{safety:6,label:"Moderate crime",detail:"Decatur is safer than Atlanta proper but still above the national average. A stable, walkable community with active neighborhood watch programs.",color:"#4A9B6F",bg:"#E8F5EE"},
  "Marietta":{safety:7,label:"Relatively safe",detail:"Marietta has below-average crime for the metro area.",color:"#4A9B6F",bg:"#E8F5EE"},
  "Smyrna":{safety:6,label:"Moderate crime",detail:"Smyrna is near average and has been improving steadily over recent years.",color:"#4A9B6F",bg:"#E8F5EE"},
  "Alpharetta":{safety:9,label:"Very safe",detail:"Alpharetta consistently ranks as one of Georgia\'s safest cities.",color:"#1B6B44",bg:"#E8F5EE"},
  "Sandy Springs":{safety:7,label:"Relatively safe",detail:"Sandy Springs is safer than Atlanta city proper.",color:"#4A9B6F",bg:"#E8F5EE"},
  "College Park":{safety:3,label:"High crime",detail:"College Park has above-average crime rates. The statistics below are city-wide — crime is not uniform, and your specific target street matters. Use the source link to check your exact block.",color:"#DC2626",bg:"#FEE2E2",stats:[{type:"Violent crime rate",value:"17.8 per 1,000 residents",national:"4.0 national avg"},{type:"Property crime rate",value:"49.2 per 1,000 residents",national:"21.0 national avg"},{type:"Most common",value:"Theft, burglary & auto theft",national:""},{type:"Trend",value:"Slowly declining from 2019 peak",national:""}],source:{name:"Georgia Bureau of Investigation Crime Statistics",url:"https://gbi.georgia.gov/services/crime-statistics"}},
  "East Point":{safety:3,label:"High crime",detail:"East Point has above-average crime rates. The statistics below are city-wide — use the CrimeMapping link to look up your specific target address before making decisions.",color:"#DC2626",bg:"#FEE2E2",stats:[{type:"Violent crime rate",value:"15.6 per 1,000 residents",national:"4.0 national avg"},{type:"Property crime rate",value:"44.8 per 1,000 residents",national:"21.0 national avg"},{type:"Most common",value:"Theft & motor vehicle theft",national:""},{type:"Trend",value:"Slight improvement over 3 years",national:""}],source:{name:"Georgia Bureau of Investigation Crime Statistics",url:"https://gbi.georgia.gov/services/crime-statistics"}},
  "Chicago":{safety:3,label:"High crime",detail:"Chicago\'s crime statistics are elevated, but they are heavily concentrated in specific neighborhoods — the city\' s north, northwest, and lakefront areas have crime rates comparable to the national average. The numbers below are city-wide and do not reflect any one neighborhood.",color:"#DC2626",bg:"#FEE2E2",stats:[{type:"Violent crime rate",value:"9.4 per 1,000 residents",national:"4.0 national avg"},{type:"Property crime rate",value:"26.1 per 1,000 residents",national:"21.0 national avg"},{type:"Most common",value:"Theft, motor vehicle theft & assault",national:""},{type:"Trend",value:"Significant decline from 2021 peak",national:""}],source:{name:"Chicago Police Department CLEAR Crime Data",url:"https://data.cityofchicago.org/Public-Safety/Crimes-2001-to-Present/ijzp-q8t2"}},
  "Phoenix":{safety:4,label:"Above-avg crime",detail:"Phoenix has above-average crime, driven largely by property crime and auto theft. These are city-wide numbers — individual zip codes and neighborhoods vary considerably.",color:"#E8A020",bg:"#FEF3DC",stats:[{type:"Violent crime rate",value:"7.1 per 1,000 residents",national:"4.0 national avg"},{type:"Property crime rate",value:"37.4 per 1,000 residents",national:"21.0 national avg"},{type:"Most common",value:"Motor vehicle theft & theft from vehicle",national:""},{type:"Trend",value:"Auto theft is a growing concern statewide",national:""}],source:{name:"Phoenix Police Department Stats & Reports",url:"https://www.phoenix.gov/police/"}},
  "Mesa":{safety:5,label:"Moderate crime",detail:"Mesa is near the Phoenix metro average. Eastern Mesa zip codes trend notably safer than western areas.",color:"#E8A020",bg:"#FEF3DC"},
  "Scottsdale":{safety:8,label:"Safe",detail:"Scottsdale has well below-average crime for the Phoenix metro.",color:"#1B6B44",bg:"#E8F5EE"},
  "Glendale":{safety:5,label:"Moderate crime",detail:"Glendale is near average for the Phoenix metro — better than Phoenix proper.",color:"#E8A020",bg:"#FEF3DC"},
  "Los Angeles":{safety:4,label:"Above-avg crime",detail:"LA\'s crime rates are above national averages and vary enormously by neighborhood and zip code. The numbers below are city-wide — your specific area may look very different. Use the LAPD CrimeMapping tool to check your exact street.",color:"#E8A020",bg:"#FEF3DC",stats:[{type:"Violent crime rate",value:"7.3 per 1,000 residents",national:"4.0 national avg"},{type:"Property crime rate",value:"24.2 per 1,000 residents",national:"21.0 national avg"},{type:"Most common",value:"Theft, vehicle break-ins & assault",national:""},{type:"Trend",value:"Theft rising; violent crime relatively stable",national:""}],source:{name:"Los Angeles Police Department Crime Stats",url:"https://www.lapdonline.org/"}},
  "Miami":{safety:4,label:"Above-avg crime",detail:"Miami\'s city-wide crime rates are above national averages, particularly for property crime. These numbers represent the full city — specific neighborhoods and zip codes range widely from the average.",color:"#E8A020",bg:"#FEF3DC",stats:[{type:"Violent crime rate",value:"8.1 per 1,000 residents",national:"4.0 national avg"},{type:"Property crime rate",value:"32.4 per 1,000 residents",national:"21.0 national avg"},{type:"Most common",value:"Theft, burglary & motor vehicle theft",national:""},{type:"Trend",value:"Gradual decline over past 5 years",national:""}],source:{name:"Miami Police Department Crime Statistics",url:"https://www.miami.gov/Government/Departments-Agencies/Police-Department"}},
  "Miami Beach":{safety:5,label:"Moderate crime",detail:"Miami Beach has moderate crime rates. Tourist corridors see elevated petty theft; residential areas are generally safer.",color:"#E8A020",bg:"#FEF3DC"},
  "North Miami Beach":{safety:4,label:"Above-avg crime",detail:"North Miami Beach has above-average crime. The statistics below are city-wide — use the source link to check your target street specifically.",color:"#E8A020",bg:"#FEF3DC",stats:[{type:"Violent crime rate",value:"7.0 per 1,000 residents",national:"4.0 national avg"},{type:"Property crime rate",value:"28.5 per 1,000 residents",national:"21.0 national avg"},{type:"Most common",value:"Theft & burglary",national:""},{type:"Trend",value:"Stable over recent years",national:""}],source:{name:"Florida Department of Law Enforcement Crime Stats",url:"https://www.fdle.state.fl.us/CJAB/UCR/Annual-Reports/UCR-Offense-Data"}},
  "Aventura":{safety:7,label:"Relatively safe",detail:"Aventura is one of the safer areas in Miami-Dade.",color:"#4A9B6F",bg:"#E8F5EE"},
  "New York":{safety:6,label:"Moderate crime",detail:"NYC crime has declined significantly since the 1990s and varies considerably by borough and neighborhood. Many areas are quite safe by any measure.",color:"#4A9B6F",bg:"#E8F5EE"},
  "Cedar Park":{safety:8,label:"Safe",detail:"Cedar Park has low crime rates and is considered very family-friendly.",color:"#1B6B44",bg:"#E8F5EE"},
  "Pflugerville":{safety:7,label:"Relatively safe",detail:"Pflugerville has below-average crime for the Austin metro.",color:"#4A9B6F",bg:"#E8F5EE"},
  "Round Rock":{safety:8,label:"Safe",detail:"Round Rock consistently has low crime rates.",color:"#1B6B44",bg:"#E8F5EE"},
  "Kyle":{safety:7,label:"Relatively safe",detail:"Kyle is a fast-growing suburb with below-average crime.",color:"#4A9B6F",bg:"#E8F5EE"},
  "Buda":{safety:8,label:"Safe",detail:"Buda is a small, safe suburb south of Austin.",color:"#1B6B44",bg:"#E8F5EE"},
};
const getCrime=city=>CRIME_DB[city]||{safety:5,label:"Data unavailable",detail:"Detailed crime data for this city isn\'t in our database yet. You can look up local statistics at the FBI Crime Data Explorer (crime-data-explorer.app.cloud.gov) or your local police department\'s website.",color:"#6B7280",bg:"#F3F4F6"};

const CLIMATE_DB={
  "TX":{
    flood:{risk:"High",icon:"🌊",detail:"Texas has extensive FEMA flood zones. Harris County (Houston) is especially prone. Always check FEMA's flood map (msc.fema.gov) for your specific address before buying."},
    heat:{risk:"Very High",icon:"🌡️",detail:"Texas summers regularly reach 100°F+. Budget $200–400/mo extra for summer A/C. Heat also degrades roofing and HVAC systems faster — factor in maintenance."},
    hurricane:{risk:"Moderate",icon:"🌀",detail:"Gulf Coast areas face hurricane risk. If buying within 100 miles of the coast, windstorm coverage is mandatory and can add $1,500–5,000/yr."},
    tornado:{risk:"High",icon:"🌪️",detail:"North Texas (DFW) is in Tornado Alley. Central Texas also sees activity. A home with a safe room or storm shelter adds real value."},
    wildfire:{risk:"Low-Moderate",icon:"🔥",detail:"West Texas and Hill Country face wildfire risk. Houston/Dallas urban areas are lower risk."},
  },
  "GA":{
    flood:{risk:"Moderate",icon:"🌊",detail:"Georgia has moderate flood risk, especially near rivers. Check FEMA flood map for your specific address."},
    heat:{risk:"High",icon:"🌡️",detail:"Atlanta summers are hot and humid (avg 89°F in July). Budget extra for A/C and expect higher utility bills."},
    hurricane:{risk:"Low-Moderate",icon:"🌀",detail:"Georgia coast faces hurricane risk, but Atlanta is well inland. Tropical storms can still bring heavy rain."},
    tornado:{risk:"Moderate",icon:"🌪️",detail:"Georgia sees tornadoes, especially in spring. Less frequent than the Midwest but real."},
    wildfire:{risk:"Low",icon:"🔥",detail:"Wildfire risk is low for metro Atlanta and most of Georgia."},
  },
  "IL":{
    flood:{risk:"Moderate",icon:"🌊",detail:"Illinois has moderate flood risk near rivers. Chicago has experienced basement flooding from heavy rains — ask about sump pumps."},
    heat:{risk:"Moderate",icon:"🌡️",detail:"Chicago summers are warm and humid. Severe heat waves occur occasionally."},
    hurricane:{risk:"None",icon:"🌀",detail:"Illinois has no hurricane risk."},
    tornado:{risk:"High",icon:"🌪️",detail:"Illinois is in Tornado Alley. Tornadoes occur regularly in spring/summer — a basement is valuable."},
    wildfire:{risk:"Low",icon:"🔥",detail:"Wildfire risk is very low in Illinois."},
  },
  "AZ":{
    flood:{risk:"Moderate",icon:"🌊",detail:"Arizona has flash flood risk during monsoon season (July–Sept). Desert soil doesn't absorb water — arroyos flood extremely fast."},
    heat:{risk:"Extreme",icon:"🌡️",detail:"Phoenix regularly hits 115°F+. A/C bills can reach $400–600/mo in summer. Heat degrades roofing, paint, and HVAC systems faster — budget for it."},
    hurricane:{risk:"None",icon:"🌀",detail:"Arizona has no hurricane risk."},
    tornado:{risk:"Low",icon:"🌪️",detail:"Tornadoes are rare in Arizona, though dust storms (haboobs) occur and can damage exteriors."},
    wildfire:{risk:"High",icon:"🔥",detail:"Arizona has significant wildfire risk, especially north of Phoenix and in mountainous areas. Verify home insurability before making an offer."},
  },
  "CA":{
    flood:{risk:"Moderate",icon:"🌊",detail:"California flood risk varies widely. Check FEMA maps carefully — many areas near rivers and coast are high-risk."},
    heat:{risk:"High",icon:"🌡️",detail:"Southern California summers are hot and dry. Coastal areas stay cooler; inland valleys regularly hit 100°F+."},
    hurricane:{risk:"None",icon:"🌀",detail:"California has no hurricane risk."},
    tornado:{risk:"Low",icon:"🌪️",detail:"Tornadoes are rare in California."},
    wildfire:{risk:"Very High",icon:"🔥",detail:"California has extreme wildfire risk. Home insurance has become difficult and expensive in many areas — VERIFY INSURABILITY before making any offer. Some zip codes are uninsurable privately."},
  },
  "FL":{
    flood:{risk:"Very High",icon:"🌊",detail:"Florida has the highest flood risk of any state. Most properties are in or near FEMA flood zones. Flood insurance (separate from homeowners) often costs $1,000–4,000+/yr — get a quote before making an offer."},
    heat:{risk:"Very High",icon:"🌡️",detail:"Florida has intense heat and humidity year-round. Budget $250–450/mo for A/C. Heat also accelerates mold growth — inspect carefully."},
    hurricane:{risk:"Very High",icon:"🌀",detail:"Florida faces the highest hurricane risk in the nation. Windstorm insurance in most coastal counties costs $3,000–10,000+/yr. Factor this into your true monthly cost."},
    tornado:{risk:"Moderate",icon:"🌪️",detail:"Florida has frequent (often weaker) tornadoes, sometimes spawned by hurricanes."},
    wildfire:{risk:"Moderate",icon:"🔥",detail:"Florida has wildfire risk, especially in central and northern areas with pine forests."},
  },
  "NY":{
    flood:{risk:"Moderate",icon:"🌊",detail:"NYC and Long Island face storm surge and flooding risk. Many areas were affected by Hurricane Sandy in 2012 — check flood zone maps carefully."},
    heat:{risk:"Moderate",icon:"🌡️",detail:"NYC summers are hot and humid but manageable. A/C is standard."},
    hurricane:{risk:"Low-Moderate",icon:"🌀",detail:"NYC is occasionally affected by nor'easters and weakened hurricanes. Storm surge is the primary risk in coastal areas."},
    tornado:{risk:"Low",icon:"🌪️",detail:"Tornadoes are uncommon in New York."},
    wildfire:{risk:"Low",icon:"🔥",detail:"Wildfire risk is low for NYC and most of New York."},
  },
};
const getClimate=state=>CLIMATE_DB[state]||null;

const NEIGHBORHOODS_DB={
  "Houston":[
    {name:"The Woodlands",schools:9,medianPrice:"$450K",commute:"35 min to downtown",notes:"Master-planned, top-rated schools, beautiful parks system"},
    {name:"Sugar Land",schools:9,medianPrice:"$420K",commute:"30 min to Medical Center",notes:"Fort Bend County, diverse, excellent schools, very safe"},
    {name:"Pearland",schools:8,medianPrice:"$340K",commute:"25 min to Medical Center",notes:"Fast-growing suburb, newer construction, best value near Houston"},
    {name:"Katy",schools:8,medianPrice:"$360K",commute:"40 min to downtown",notes:"Katy ISD is highly rated, family-oriented, lots of new builds"},
    {name:"Friendswood",schools:9,medianPrice:"$370K",commute:"30 min to downtown",notes:"Very safe, quiet, strong community — a hidden gem"},
    {name:"Heights / Garden Oaks",schools:7,medianPrice:"$520K",commute:"15 min to downtown",notes:"Trendy, historic homes, walkable restaurants — strong appreciation"},
  ],
  "Dallas":[
    {name:"Frisco",schools:10,medianPrice:"$550K",commute:"35 min to downtown",notes:"Ranked one of the best US cities — incredible schools, amenities, safety"},
    {name:"Plano",schools:9,medianPrice:"$480K",commute:"25 min to downtown",notes:"Top schools, tech corridor, safe and established"},
    {name:"McKinney",schools:9,medianPrice:"$450K",commute:"40 min to downtown",notes:"Historic downtown, fast-growing, strong school ratings"},
    {name:"Garland",schools:6,medianPrice:"$290K",commute:"20 min to downtown",notes:"Most affordable DFW entry point — moderate crime, improving"},
    {name:"Lake Highlands",schools:7,medianPrice:"$400K",commute:"15 min to downtown",notes:"Established neighborhood, RISD schools, good community feel"},
    {name:"Bishop Arts / Oak Cliff",schools:5,medianPrice:"$320K",commute:"10 min to downtown",notes:"Arts district, gentrifying, best value for intown living"},
  ],
  "Austin":[
    {name:"Cedar Park",schools:9,medianPrice:"$430K",commute:"30 min to downtown",notes:"Leander ISD, tech suburb, family-friendly, strong growth"},
    {name:"Round Rock",schools:8,medianPrice:"$390K",commute:"30 min to downtown",notes:"Round Rock ISD, Dell campus nearby, excellent value"},
    {name:"Pflugerville",schools:7,medianPrice:"$340K",commute:"25 min to downtown",notes:"Best affordability near Austin, growing rapidly"},
    {name:"Kyle / Buda",schools:7,medianPrice:"$320K",commute:"30 min to downtown",notes:"Hays CISD, fastest growing area, most affordable near Austin"},
    {name:"Mueller",schools:8,medianPrice:"$580K",commute:"5 min to downtown",notes:"Planned community, walkable, near airport, great parks"},
    {name:"South Congress",schools:7,medianPrice:"$650K",commute:"10 min to downtown",notes:"Trendy, walkable, great for young professionals"},
  ],
  "San Antonio":[
    {name:"Stone Oak",schools:9,medianPrice:"$420K",commute:"25 min to downtown",notes:"Top North SA suburb, excellent schools, very safe"},
    {name:"Alamo Heights",schools:9,medianPrice:"$590K",commute:"10 min to downtown",notes:"Prestigious, top-rated AHISD schools, walkable — premium price"},
    {name:"Boerne",schools:8,medianPrice:"$390K",commute:"35 min to downtown",notes:"Hill Country charm, growing fast, great schools"},
    {name:"Helotes",schools:8,medianPrice:"$360K",commute:"25 min to downtown",notes:"Northwest SA suburb, safe, good schools, Hill Country feel"},
    {name:"Converse / Universal City",schools:6,medianPrice:"$230K",commute:"20 min to downtown",notes:"Most affordable option near San Antonio — near JBSA"},
    {name:"New Braunfels",schools:7,medianPrice:"$340K",commute:"35 min to downtown",notes:"Growing fast, Comal ISD is highly regarded, river lifestyle"},
  ],
  "Fort Worth":[
    {name:"Southlake",schools:10,medianPrice:"$820K",commute:"30 min to downtown",notes:"One of the best school districts in Texas — premium price tag"},
    {name:"Keller",schools:9,medianPrice:"$490K",commute:"25 min to downtown",notes:"Keller ISD is excellent, safe, family-oriented"},
    {name:"Colleyville",schools:9,medianPrice:"$620K",commute:"25 min to downtown",notes:"Upscale, quiet, top schools — lower crime than most DFW"},
    {name:"North Fort Worth / Haslet",schools:7,medianPrice:"$340K",commute:"20 min to downtown",notes:"Fastest-growing part of FW, newer builds, affordable"},
    {name:"Benbrook",schools:7,medianPrice:"$310K",commute:"15 min to downtown",notes:"Southwest FW, lake access, affordable, quiet suburb"},
    {name:"TCU / Westover Hills",schools:7,medianPrice:"$380K",commute:"10 min to downtown",notes:"Near TCU campus, walkable, charming older homes"},
  ],
  "Atlanta":[
    {name:"Alpharetta",schools:10,medianPrice:"$560K",commute:"35 min to downtown",notes:"Top schools in Georgia, tech hub, safest large city in GA"},
    {name:"Sandy Springs",schools:8,medianPrice:"$490K",commute:"20 min to downtown",notes:"Business hub, good schools, more urban feel"},
    {name:"Decatur",schools:8,medianPrice:"$480K",commute:"15 min to downtown",notes:"Walkable, great restaurants, excellent city schools"},
    {name:"Smyrna / Vinings",schools:7,medianPrice:"$380K",commute:"20 min to downtown",notes:"Good value, improving, access to The Battery (Braves stadium)"},
    {name:"Marietta",schools:7,medianPrice:"$360K",commute:"25 min to downtown",notes:"Historic square, Cobb County schools, more affordable"},
    {name:"Buckhead",schools:8,medianPrice:"$650K",commute:"15 min to downtown",notes:"Upscale, shopping district, top private schools nearby"},
  ],
  "Chicago":[
    {name:"Naperville",schools:10,medianPrice:"$430K",commute:"35 min by Metra",notes:"One of the best suburbs in America, perennially top-ranked schools"},
    {name:"Lincoln Park",schools:8,medianPrice:"$580K",commute:"5 min to Loop",notes:"Upscale, lakefront, great restaurants and parks"},
    {name:"Wicker Park / Bucktown",schools:7,medianPrice:"$520K",commute:"15 min to Loop",notes:"Trendy, young professionals, great nightlife and restaurants"},
    {name:"Oak Park",schools:8,medianPrice:"$370K",commute:"25 min by CTA/Metra",notes:"Historic Frank Lloyd Wright homes, excellent public schools"},
    {name:"Andersonville / Edgewater",schools:7,medianPrice:"$380K",commute:"25 min to Loop",notes:"Diverse, walkable, neighborhood feel within the city"},
    {name:"Logan Square",schools:6,medianPrice:"$420K",commute:"20 min to Loop",notes:"Up-and-coming, diverse, best affordability near downtown"},
  ],
  "Phoenix":[
    {name:"Gilbert",schools:9,medianPrice:"$490K",commute:"30 min to downtown",notes:"One of the fastest-growing and safest cities in AZ — excellent schools"},
    {name:"Chandler",schools:9,medianPrice:"$480K",commute:"25 min to downtown",notes:"Intel/tech campus, great schools, family-friendly, strong growth"},
    {name:"North Scottsdale",schools:9,medianPrice:"$700K",commute:"30 min to downtown",notes:"Luxury market, top amenities, very safe — premium price"},
    {name:"Peoria",schools:7,medianPrice:"$380K",commute:"20 min to downtown",notes:"Affordable west valley, improving, good for families"},
    {name:"Tempe",schools:7,medianPrice:"$390K",commute:"15 min to downtown",notes:"ASU adjacent, young demographic, walkable Mill Ave area"},
    {name:"Ahwatukee",schools:8,medianPrice:"$440K",commute:"20 min to downtown",notes:"Mountain views, quiet suburban feel, separate from Phoenix bustle"},
  ],
  "New York":[
    {name:"Astoria, Queens",schools:7,medianPrice:"$620K",commute:"20 min to Midtown",notes:"Diverse, great food scene, best value close to Manhattan"},
    {name:"Park Slope, Brooklyn",schools:8,medianPrice:"$1.1M",commute:"30 min to Midtown",notes:"Top Brooklyn neighborhood, Prospect Park, great public schools"},
    {name:"Forest Hills, Queens",schools:8,medianPrice:"$580K",commute:"25 min to Midtown",notes:"Quiet, leafy, excellent schools — great community feel"},
    {name:"Riverdale, Bronx",schools:7,medianPrice:"$480K",commute:"30 min to Midtown",notes:"Most affordable safe area near Manhattan, leafy and quiet"},
    {name:"Bay Ridge, Brooklyn",schools:7,medianPrice:"$560K",commute:"40 min to Midtown",notes:"Family neighborhood, diverse, safe, waterfront views"},
    {name:"Hoboken, NJ",schools:7,medianPrice:"$680K",commute:"15 min to Manhattan",notes:"Walkable, young professionals, waterfront — note flood risk"},
  ],
  "Miami":[
    {name:"Coral Gables",schools:9,medianPrice:"$890K",commute:"20 min to downtown",notes:"Beautiful architecture, top schools, very safe — premium market"},
    {name:"Kendall",schools:7,medianPrice:"$480K",commute:"30 min to downtown",notes:"Suburban, diverse, good value — verify flood insurance costs"},
    {name:"Doral",schools:8,medianPrice:"$560K",commute:"20 min to downtown",notes:"Growing business hub, international community, newer builds"},
    {name:"Aventura",schools:7,medianPrice:"$490K",commute:"30 min to downtown",notes:"Upscale, safe, great amenities — note coastal flood risk"},
    {name:"Pinecrest",schools:10,medianPrice:"$1.1M",commute:"25 min to downtown",notes:"Best schools in Miami-Dade, quiet suburban feel — premium"},
    {name:"Hialeah",schools:5,medianPrice:"$380K",commute:"25 min to downtown",notes:"Most affordable Miami option, primarily Spanish-speaking community"},
  ],
  "Los Angeles":[
    {name:"Pasadena",schools:8,medianPrice:"$890K",commute:"30 min to downtown",notes:"CalTech, Rose Bowl, great schools and culture — strong appreciation"},
    {name:"Torrance",schools:8,medianPrice:"$820K",commute:"40 min to downtown",notes:"Very safe, great schools, beach access — South Bay gem"},
    {name:"Burbank",schools:8,medianPrice:"$780K",commute:"20 min to downtown",notes:"Media industry hub, very safe, walkable downtown"},
    {name:"Glendale",schools:7,medianPrice:"$820K",commute:"15 min to downtown",notes:"Safe, good schools, close to studios, strong Armenian community"},
    {name:"Culver City",schools:7,medianPrice:"$1.0M",commute:"20 min to downtown",notes:"Tech and media hub, walkable, strong appreciation history"},
    {name:"Long Beach (Signal Hill)",schools:7,medianPrice:"$680K",commute:"30 min to downtown",notes:"Best value in LA County with beach access"},
  ],
};
const getNeighborhoods=city=>NEIGHBORHOODS_DB[city]||null;

// Reconstruct calc function from the serialized calcSpec returned by /api/programs
function calcFromSpec(spec,price){
  if(!spec)return 0;
  if(spec.t==="pct")return Math.round(price*spec.r);
  if(spec.t==="fixed")return spec.v;
  return 0;
}

// Async hook: fetch programs from serverless API, fall back to local on error
function usePrograms(loc,data){
  const[programs,setPrograms]=useState(null);
  const[loading,setLoading]=useState(false);
  useEffect(()=>{
    if(!loc?.state){setPrograms([]);return;}
    setLoading(true);
    const params=new URLSearchParams({
      state:loc.state||"",city:loc.city||"",county:loc.county||"",
      profession:data.profession||"none",isVet:String(!!data.isVet),
      income:String(data.income||0),householdSize:String(data.householdSize||1),
    });
    fetch(`/api/programs?${params}`)
      .then(r=>{if(!r.ok)throw new Error();return r.json();})
      .then(json=>{
        const rebuilt=json.programs.map(p=>({
          ...p,calc:price=>calcFromSpec(p.calcSpec,price),
        }));
        setPrograms(rebuilt);
      })
      .catch(()=>{
        setPrograms(getProgramsForLocation(
          loc.state,loc.city,loc.county,
          data.profession,data.isVet,data.income,data.householdSize||1
        ));
      })
      .finally(()=>setLoading(false));
  },[loc?.state,loc?.city,loc?.county,data.profession,data.isVet,data.income,data.householdSize]);
  return{programs:programs||[],loading};
}

// Loading skeleton for programs list
function ProgramsSkeleton(){
  return(
    <div>
      {[...Array(5)].map((_,i)=>(
        <div key={i} style={{borderRadius:12,padding:"14px 12px",marginBottom:10,background:"#F3F4F6",animation:"pulse 1.5s ease-in-out infinite"}}>
          <div style={{height:10,width:"60%",borderRadius:6,background:"#E5E7EB",marginBottom:8}}/>
          <div style={{height:8,width:"80%",borderRadius:6,background:"#E5E7EB",marginBottom:6}}/>
          <div style={{height:8,width:"40%",borderRadius:6,background:"#E5E7EB"}}/>
        </div>
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}

function getProgramsForLocation(state,city,county,profession="none",isVet=false,income=0,householdSize=1){
  const st=(state||"").toUpperCase();
  const ci=(city||"").toLowerCase();
  const co=(county||"").toLowerCase();
  const progs=[];
  // Houston/Harris 2024 AMI by household size (approx)
  const HOUSTON_AMI={1:63050,2:72050,3:81050,4:90000,5:97200,6:104400,7:111600,8:118800};
  const TX_STATE_AMI={1:58000,2:66300,3:74550,4:82800,5:89450,6:96100,7:102700,8:109350};
  const hs=Math.min(Math.max(householdSize||1,1),8);
  const houstonAMI=HOUSTON_AMI[hs];
  const txAMI=TX_STATE_AMI[hs];
  progs.push({id:"fha_prog",name:"FHA Loan",short:"3.5% min down, 580+ credit",amount:"3.5% down",badge:"Federal",layer:"federal",calc:()=>0,incompat:[],note:"HUD-insured. Available in all 50 states.",url:"https://www.hud.gov/buying/loans"});
  progs.push({id:"va_prog",name:"VA Home Loan",short:"$0 down for eligible veterans",amount:"$0 down",badge:"Heroes",layer:"heroes",calc:()=>0,incompat:[],note:"No down payment, no PMI. Veterans, active duty, surviving spouses.",url:"https://www.va.gov/housing-assistance/home-loans/"});
  progs.push({id:"usda",name:"USDA Rural Development Loan",short:"$0 down for eligible rural/suburban areas",amount:"$0 down",badge:"Federal",layer:"federal",calc:()=>0,incompat:[],note:"Income limit ~115% AMI. Property must be in USDA-eligible area. Check eligibility at eligibility.sc.egov.usda.gov. Min 640 credit.",url:"https://www.rd.usda.gov/programs-services/single-family-housing-programs"});
  progs.push({id:"hud_203k",name:"FHA 203(k) Rehab Loan",short:"Buy + renovate in one FHA loan",amount:"Rehab funds",badge:"Federal",layer:"federal",calc:()=>0,incompat:[],note:"580+ credit, 3.5% down. Rolls renovation costs into your mortgage. Good for fixer-uppers. HUD-approved 203(k) consultant required.",url:"https://www.hud.gov/program_offices/housing/sfh/203k"});
  progs.push({id:"nfmc",name:"NeighborWorks / NHS DPA",short:"Up to $15K DPA, flexible income limits",amount:"Up to $15K",badge:"Nonprofit",layer:"heroes",calc:()=>15000,incompat:[],note:"National nonprofit network. No strict AMI cap in many markets. Credit as low as 580. Search nw.org for local affiliate.",url:"https://www.nw.org"});
  if(st==="TX"){
    progs.push({id:"tsahc",name:"TSAHC Home Sweet Texas",short:"Up to 5% DPA grant, no repayment",amount:"Up to 5%",badge:"State",layer:"state",calc:p=>Math.round(p*.05),incompat:["tdhca"],note:"Income limit varies by county. tsahc.org",url:"https://www.tsahc.org"});
    progs.push({id:"tdhca",name:"My First Texas Home (TDHCA)",short:"5% DPA + below-market rate",amount:"5% of loan",badge:"State",layer:"state",calc:p=>Math.round(p*.05),incompat:["tsahc"],note:"30-yr fixed below-market rate. tdhca.state.tx.us",url:"https://www.tdhca.texas.gov"});
    progs.push({id:"mcc_tx",name:"Texas MCC",short:"15% of interest back as tax credit/yr",amount:"~$1,400+/yr",badge:"Federal",layer:"federal",calc:()=>0,incompat:[],note:"Reinstated March 2026. First-time buyers only.",url:"https://www.tsahc.org",expires:"Reinstated Mar 2026 — verify active"});
    // SETH 5 Star — Harris + surrounding 8-county area, repeat buyers OK
    if(co.includes("harris")||co.includes("fort bend")||co.includes("montgomery")||co.includes("brazoria")||co.includes("galveston")||co.includes("liberty")||co.includes("chambers")||co.includes("waller")){
      progs.push({id:"seth5star",name:"SETH 5 Star Program",short:"Up to 5% DPA, repeat buyers OK, 620+ FICO",amount:"Up to 5%",badge:"Regional",layer:"city",calc:p=>Math.round(p*.05),incompat:[],note:"Southeast Texas Housing Finance Corp. 8-county Houston metro. $122,100 income limit (all household earners). 620+ FICO. Repeat buyers allowed. seth.org",url:"https://www.seth.org/homebuyers/5-star-texas-advantage-program"});
    }
    // TDHCA My Choice Texas Home — statewide, repeat buyers OK
    progs.push({id:"mychoicetx",name:"TDHCA My Choice Texas Home",short:"5% DPA, statewide, repeat buyers OK",amount:"5% of loan",badge:"State",layer:"state",calc:p=>Math.round(p*.05),incompat:[],note:"Statewide TDHCA program. Unlike My First Texas Home, repeat buyers are eligible. $122,100 income limit. 620+ FICO. 30-yr fixed below-market rate. tdhca.texas.gov",url:"https://www.tdhca.texas.gov/homeownership/mychoice/"});
    // Chenoa Fund — national, no AMI cap, repeat buyers OK
    progs.push({id:"chenoa",name:"Chenoa Fund",short:"3.5–5% DPA nationally, no AMI cap",amount:"3.5–5%",badge:"National",layer:"federal",calc:p=>Math.round(p*.035),incompat:[],note:"National program via CBC Mortgage Agency. No income limit. 600+ FICO (620+ for best terms). Repeat buyers OK. FHA-backed DPA — forgivable or repayable options. chenoafund.org",url:"https://chenoafund.org"});
    if(ci.includes("houston")||co.includes("harris")){
      progs.push({id:"hap",name:"City of Houston HAP",short:"Up to $30K forgivable, city limits",amount:"Up to $30K",badge:"City",layer:"city",calc:()=>30000,incompat:["harvey","hap2"],note:"Inside Houston city limits. 80% AMI limit. Forgiven after 5 years.",url:"https://houstontx.gov/housing/hap.html",amiLimit:houstonAMI*0.80,expires:"Annual cycle — verify availability"});
      progs.push({id:"harvey",name:"Harvey HbAP 2.0",short:"Up to $125K if Houston resident 8/25/17",amount:"Up to $125K",badge:"City",layer:"city",calc:()=>125000,incompat:["hap","hap2"],note:"Call 832-393-0550 first. 120% AMI limit. Avoid June 18–July 11.",url:"https://houstontx.gov/housing/",amiLimit:houstonAMI*1.20,expires:"Rolling — call to confirm funds"});
      // City of Houston HAP 2.0 Expanded — Houston taxpayers, 120% AMI, first-time only
      progs.push({id:"hap2",name:"City of Houston HAP 2.0 Expanded",short:"Up to $30K, 120% AMI, Houston taxpayers",amount:"Up to $30K",badge:"City",layer:"city",calc:()=>30000,incompat:["hap","harvey"],note:"Houston property taxpayers. First-time buyers only. 120% AMI limit (higher than original HAP). Front-end DTI max 33%, back-end DTI max 45%. houstontx.gov/housing",url:"https://houstontx.gov/housing/hap.html",amiLimit:houstonAMI*1.20,expires:"Annual cycle — verify availability"});
      // Harris County CDBG DPA — unincorporated Harris only, first-time, 80% AMI, $30K asset cap
      const harrisCDBGLimit=income>0&&income<=houstonAMI*0.80;
      progs.push({id:"harris_cdbg",name:"Harris County CDBG DPA",short:"Up to $23,800, unincorporated Harris only",amount:"Up to $23,800",badge:"County",layer:"city",calc:()=>23800,incompat:[],note:"Unincorporated Harris County ONLY (not inside Houston city limits). First-time buyers. 80% AMI income limit ($"+Math.round(houstonAMI*0.80).toLocaleString()+" for "+hs+"-person household). $30,000 asset cap — if assets exceed $30K you may be disqualified. 580+ FICO. hcdd.hctx.net",url:"https://www.hcdd.hctx.net/homeownership",amiLimit:houstonAMI*0.80,assetCap:30000});
      // Harris County SFARFI — first-time, 80% AMI, FE 39%, DTI 42%
      progs.push({id:"harris_sfarfi",name:"Harris County SFARFI",short:"Down payment + closing cost help, 620+ FICO",amount:"Varies",badge:"County",layer:"city",calc:()=>10000,incompat:[],note:"Harris County Single Family Affordable Rehab Finance Initiative. First-time buyers. 80% AMI limit. 620+ FICO. Front-end DTI max 39%, back-end DTI max 42%. hcdd.hctx.net",url:"https://www.hcdd.hctx.net/homeownership",amiLimit:houstonAMI*0.80});
    }
    if(ci.includes("dallas")||co.includes("dallas")){
      progs.push({id:"dhap",name:"Dallas Homebuyer Assistance",short:"Up to $60K forgivable",amount:"Up to $60K",badge:"City",layer:"city",calc:()=>60000,incompat:[],note:"Dallas city limits. 80% AMI limit.",url:"https://dallascityhall.com/departments/housing"});
    }
    if(ci.includes("fort worth")||co.includes("tarrant")){
      progs.push({id:"fwhap",name:"Fort Worth DPA",short:"Up to $14,999 forgivable",amount:"Up to $14,999",badge:"City",layer:"city",calc:()=>14999,incompat:[],note:"Fort Worth city limits. 80% AMI limit.",url:"https://www.fortworthtexas.gov/departments/neighborhood-services/homebuyer-assistance"});
    }
    if(ci.includes("san antonio")||co.includes("bexar")){
      progs.push({id:"sa_nhsd",name:"SA NHSD Homeownership",short:"Up to $30K forgivable",amount:"Up to $30K",badge:"City",layer:"city",calc:()=>30000,incompat:[],note:"San Antonio residents. 80% AMI limit.",url:"https://www.sanantonio.gov/nhsd"});
    }
    if(ci.includes("austin")||co.includes("travis")){
      progs.push({id:"ahfc",name:"Austin HFC DPA",short:"Up to $40K forgivable",amount:"Up to $40K",badge:"City",layer:"city",calc:()=>40000,incompat:[],note:"Austin city limits. 80% MFI limit.",url:"https://www.austintexas.gov/department/housing"});
    }
  }
  if(st==="GA"){
    progs.push({id:"georgia_dream",name:"Georgia Dream",short:"Up to $10K DPA at 0% interest",amount:"Up to $10K",badge:"State",layer:"state",calc:()=>10000,incompat:[],note:"First-time buyers. Income ~$82K limit.",url:"https://dca.georgia.gov"});
    progs.push({id:"mcc_ga",name:"Georgia MCC",short:"20% of interest as tax credit/yr",amount:"~$1,500+/yr",badge:"Federal",layer:"federal",calc:()=>0,incompat:[],note:"Georgia MCC = 20% (higher than TX). First-time buyers.",url:"https://dca.georgia.gov"});
    if(ci.includes("atlanta")||co.includes("fulton")||co.includes("dekalb")){
      progs.push({id:"invest_atl",name:"Invest Atlanta",short:"Up to $20K forgivable, Atlanta residents",amount:"Up to $20K",badge:"City",layer:"city",calc:()=>20000,incompat:[],note:"Atlanta city limits. investatlanta.com",url:"https://www.investatlanta.com/homebuyers/homebuyer-programs-downpayment-assistance"});
    }
  }
  if(st==="IL"){
    progs.push({id:"ihda_access",name:"IHDA Access Forgivable",short:"$6,000 forgivable DPA",amount:"$6,000",badge:"State",layer:"state",calc:()=>6000,incompat:["ihda_def"],note:"Income limit varies by county. ihda.org",url:"https://www.ihda.org"});
    progs.push({id:"ihda_def",name:"IHDA Access Deferred",short:"$7,500 deferred DPA, 0% interest",amount:"$7,500",badge:"State",layer:"state",calc:()=>7500,incompat:["ihda_access"],note:"Repaid when you sell/refinance. ihda.org",url:"https://www.ihda.org"});
    if(ci.includes("chicago")||co.includes("cook")){
      progs.push({id:"chicago_dpa",name:"City of Chicago DPA",short:"Up to $14,999 + closing cost help",amount:"Up to $14,999",badge:"City",layer:"city",calc:()=>14999,incompat:[],note:"Chicago residents. 100% AMI limit.",url:"https://www.chicago.gov/city/en/depts/doh/provdrs/homeownership.html"});
    }
  }
  if(st==="AZ"){
    progs.push({id:"home_plus",name:"Home Plus AZ",short:"Up to 5% DPA, statewide",amount:"Up to 5%",badge:"State",layer:"state",calc:p=>Math.round(p*.05),incompat:[],note:"No repayment. $122K income limit. homeplus.az.gov",url:"https://homeplus.az.gov"});
    if(co.includes("maricopa")){
      progs.push({id:"maricopa_dpa",name:"Maricopa County DPA",short:"Up to $10K for county residents",amount:"Up to $10K",badge:"County",layer:"city",calc:()=>10000,incompat:[],note:"Outside Phoenix city limits. maricopacounty.gov",url:"https://www.maricopa.gov/5769/Down-Payment-Assistance"});
    }
    if(ci.includes("phoenix")){
      progs.push({id:"phoenix_dpa",name:"City of Phoenix DPA",short:"Up to $15K forgivable",amount:"Up to $15K",badge:"City",layer:"city",calc:()=>15000,incompat:[],note:"Phoenix city limits. 80% AMI limit.",url:"https://www.phoenix.gov/housing/hsg-home-buyer"});
    }
  }
  if(st==="CA"){
    progs.push({id:"calhfa_myh",name:"CalHFA MyHome Assistance",short:"Up to 3.5% deferred DPA",amount:"Up to 3.5%",badge:"State",layer:"state",calc:p=>Math.round(p*.035),incompat:["calhfa_dfa"],note:"Deferred payment. Income varies by county. calhfa.ca.gov",url:"https://www.calhfa.ca.gov/homebuyer/programs/myhome.htm"});
    progs.push({id:"calhfa_dfa",name:"CalHFA Dream For All",short:"Shared appreciation up to 20%",amount:"Up to 20%",badge:"State",layer:"state",calc:p=>Math.round(p*.20),incompat:["calhfa_myh"],note:"Share appreciation when you sell. calhfa.ca.gov",url:"https://www.calhfa.ca.gov/dreamforall/"});
    if(co.includes("los angeles")||ci.includes("los angeles")){
      progs.push({id:"lahd_dpa",name:"LAHD Down Payment Assistance",short:"Up to $140K for LA residents",amount:"Up to $140K",badge:"City",layer:"city",calc:()=>140000,incompat:[],note:"LA city residents. 80% AMI. lahd.lacity.gov",url:"https://housing.lacity.gov"});
    }
  }
  if(st==="FL"){
    progs.push({id:"fl_assist",name:"Florida Assist 2nd Mortgage",short:"Up to $10K deferred, 0% interest",amount:"Up to $10K",badge:"State",layer:"state",calc:()=>10000,incompat:[],note:"Deferred payment. floridahousing.org",url:"https://www.floridahousing.org"});
    progs.push({id:"fl_mcc",name:"Florida MCC",short:"50% of interest as tax credit (up to $2K/yr)",amount:"Up to $2,000/yr",badge:"Federal",layer:"federal",calc:()=>0,incompat:[],note:"Florida MCC is very generous — 50% credit. First-time buyers.",url:"https://www.floridahousing.org"});
    if(co.includes("miami-dade")||ci.includes("miami")){
      progs.push({id:"miami_ship",name:"Miami-Dade SHIP",short:"Up to $7,500 for county residents",amount:"Up to $7,500",badge:"County",layer:"city",calc:()=>7500,incompat:[],note:"Miami-Dade County SHIP program. miamidade.gov/housing",url:"https://www.miamidade.gov/housing/hcd-home-ownership.asp"});
    }
  }
  if(st==="NY"){
    progs.push({id:"sonyma",name:"SONYMA Low Interest Rate",short:"Below-market rate + up to $15K DPA",amount:"Up to $15K",badge:"State",layer:"state",calc:()=>15000,incompat:[],note:"NY state residents. hcr.ny.gov/sonyma",url:"https://hcr.ny.gov/nyhomes/sonyma"});
    if(ci.includes("new york")||co.includes("new york")){
      progs.push({id:"nyc_homefirst",name:"NYC HomeFirst DPA",short:"Up to $100K for NYC residents",amount:"Up to $100K",badge:"City",layer:"city",calc:()=>100000,incompat:[],note:"NYC 5 boroughs. Requires 8-hr HUD education. nyc.gov/hpd",url:"https://www.nyc.gov/site/hpd/services-and-information/homeownership-assistance.page"});
    }
  }
  if(!progs.find(p=>p.layer==="state")){
    progs.push({id:"generic_state",name:`${st||"State"} Housing Finance Agency`,short:"Contact your state HFA for DPA programs",amount:"Varies",badge:"State",layer:"state",calc:()=>0,incompat:[],note:`Search for "${st||state} housing finance agency" or visit HUD.gov for your state's programs.`,url:"https://www.hud.gov/states"});
  }
  progs.push({id:"naca",name:"NACA Program",short:"Below-market rate, no down payment",amount:"0% down",badge:"Nonprofit",layer:"heroes",calc:()=>0,incompat:[],note:"Nationwide. No income limit. Intensive process. naca.com",url:"https://www.naca.com"});

  // ── National profession-based programs ────────────────────────────────────
  const isTeacher=profession==="teacher";
  const isFirstResp=profession==="first_responder";
  const isLawEnf=profession==="law_enforcement";
  const isHealth=profession==="healthcare";
  const isGovt=profession==="government";
  const isHeroProfession=isTeacher||isFirstResp||isLawEnf||isHealth||isGovt;

  if(isTeacher||isFirstResp||isLawEnf){
    progs.push({id:"gnnd",name:"Good Neighbor Next Door (HUD)",short:"50% off list price on HUD homes in revitalization areas",amount:"50% off price",badge:"Federal",layer:"heroes",calc:p=>Math.round(p*.50),incompat:[],note:`Open to ${isTeacher?"K-12 teachers":isLawEnf?"law enforcement officers":"firefighters & EMTs"} buying a HUD-listed home in a designated revitalization area. Must live there 3 years. Inventory is limited — search HUDHomeStore.com for listings near you.`,url:"https://www.hud.gov/program_offices/housing/sfh/reo/goodn/gnndabot"});
  }

  if(isHeroProfession){
    const profLabel=isTeacher?"teachers":isFirstResp?"first responders":isLawEnf?"law enforcement":isHealth?"healthcare workers":"government employees";
    progs.push({id:"tnd",name:"Teacher Next Door Program",short:`Grants up to $8,000 + DPA for ${profLabel}`,amount:"Up to $8,000",badge:"Nonprofit",layer:"heroes",calc:()=>8000,incompat:[],note:`National program open to ${profLabel}. Up to $8,000 grant + down payment assistance. Works with FHA, VA, USDA, and conventional loans. No income limit on grant. teachernextdoor.us`,url:"https://teachernextdoor.us"});
  }

  if(isHeroProfession||isVet){
    progs.push({id:"hfh_rebate",name:"Homes for Heroes",short:"Avg $1,500 in agent & lender fee rebates at closing",amount:"~$1,500",badge:"Nonprofit",layer:"heroes",calc:()=>1500,incompat:[],note:"Free program — affiliated agents and lenders give back a portion of their fees at closing. Average savings $1,500. Teachers, military, first responders, healthcare, and law enforcement. homesforheroes.com",url:"https://www.homesforheroes.com"});
  }

  if(isTeacher){
    progs.push({id:"edu_mtg",name:"Educator Mortgage Program",short:"0.125–0.25% rate discount + $800 closing credit",amount:"$800 + rate cut",badge:"Nonprofit",layer:"heroes",calc:()=>800,incompat:[],note:"Available through participating lenders nationwide. Rate reduction of 0.125–0.25% + $800 closing cost credit for K-12 teachers, administrators, and college educators. educatormortgage.com",url:"https://www.educatormortgage.com"});
  }

  // ── State-specific profession programs ────────────────────────────────────
  if(st==="TX"&&isHeroProfession){
    const heroLabel=isTeacher?"teachers":isFirstResp?"firefighters/EMS":isLawEnf?"law enforcement/corrections officers":isHealth?"nurses/allied health":"public service employees";
    progs.push({id:"tsahc_heroes",name:"TSAHC Homes for Texas Heroes",short:`5% DPA grant for ${heroLabel} — no repayment ever`,amount:"5% grant",badge:"State",layer:"heroes",calc:p=>Math.round(p*.05),incompat:[],note:`TSAHC's dedicated Heroes program. Same 5% grant structure as Home Sweet Texas but exclusively for ${heroLabel}. Stackable with Texas MCC. Income limits vary by county. tsahc.org`,url:"https://www.tsahc.org/homebuyers/"});
  }

  if(st==="GA"&&(isTeacher||isFirstResp||isLawEnf||isHealth)){
    progs.push({id:"ga_dream_pen",name:"Georgia Dream PEN",short:"Extra $2,500 DPA on top of Georgia Dream",amount:"+$2,500",badge:"State",layer:"heroes",calc:()=>2500,incompat:[],note:"PEN = Protectors (law enforcement, firefighters, corrections, military) + Educators + Nurses. Stack this $2,500 on top of your base Georgia Dream DPA. First-time buyers. Income limits apply. dca.ga.gov",url:"https://dca.georgia.gov"});
  }

  if(st==="CA"&&isTeacher){
    progs.push({id:"ca_ectp",name:"Extra Credit Teacher Home Purchase (CalHFA)",short:"Below-market rate mortgage for school employees",amount:"Rate discount",badge:"State",layer:"heroes",calc:()=>0,incompat:[],note:"CalHFA program for K-12 teachers, administrators, and classified staff at schools in low-income areas. Below-market rate stacks with CalHFA MyHome DPA. calhfa.ca.gov",url:"https://www.calhfa.ca.gov/homebuyer/programs/school.htm"});
  }

  if(st==="FL"&&(isFirstResp||isLawEnf||isTeacher||isHealth||isGovt)){
    progs.push({id:"fl_hometown",name:"FL Hometown Heroes Housing Program",short:"5% DPA up to $35,000 for community workers",amount:"Up to $35,000",badge:"State",layer:"heroes",calc:()=>35000,incompat:[],note:"Florida's flagship profession program. Open to teachers, firefighters, law enforcement, EMS, nurses, and other community workforce employees. Below-market rate + up to $35K DPA. Must be full-time FL employee. floridahousing.org",url:"https://www.floridahousing.org/"});
  }

  if(st==="IL"&&isTeacher){
    progs.push({id:"il_teacher",name:"IHDA — Educator Assistance",short:"$7,500 DPA + ask about profession overlays",amount:"$7,500+",badge:"State",layer:"heroes",calc:()=>7500,incompat:[],note:"Illinois educators can stack IHDA DPA with profession-specific overlays from IHDA-approved lenders. Ask your lender explicitly about teacher benefits when applying. ihda.org",url:"https://www.ihda.org"});
  }

  if(st==="NY"&&isHeroProfession){
    progs.push({id:"ny_hero_prog",name:"SONYMA Achieving the Dream — Professions",short:"Lowest SONYMA rate + stackable DPA for qualifying workers",amount:"Rate + DPA",badge:"State",layer:"heroes",calc:()=>0,incompat:[],note:"SONYMA's Achieving the Dream program offers the lowest available state rates. First responders, educators, healthcare workers, and public employees may qualify for additional rate reductions. Stack with NYC HomeFirst. hcr.ny.gov",url:"https://hcr.ny.gov/nyhomes/sonyma"});
  }

  return progs;
}

function generateChecklist(data,loc){
  const{income,score,dpPct,price,loanType,k401,debts,programs:selP}=data;
  const{state="",city=""}=loc||{};
  const hasHarvey=selP.includes("harvey");
  const hasTSAHC=selP.includes("tsahc")||selP.includes("tdhca");
  const hasCityProg=selP.some(p=>["hap","dhap","sa_nhsd","ahfc","invest_atl","chicago_dpa","phoenix_dpa","nyc_homefirst","lahd_dpa"].includes(p));
  const hasMCC=selP.some(p=>p.includes("mcc"));
  const dp=price*dpPct/100;
  const needsScore=score<680;
  const needsDebt=debts>500;
  const grossMo=Math.round(income/12);
  const cityLabel=city||(state?state+" area":"your area");
  return{
    "3mo":{label:"3 months out",color:C.red,bg:C.redLight,icon:"\uD83D\uDE80",desc:"Final sprint — every week counts.",tasks:[
      {id:"3_1",cat:"\uD83C\uDFE6 Loan",text:`Get pre-approved with a ${hasTSAHC?"TSAHC-approved":"HUD-approved"} lender and lock your rate`,urgent:true},
      {id:"3_2",cat:"\uD83D\uDCCB Education",text:"Complete your 8-hour HUD-approved homebuyer education course",urgent:true},
      {id:"3_3",cat:"\uD83D\uDCCB Education",text:"Schedule your one-on-one HUD counseling session immediately after the course",urgent:true},
      ...(hasHarvey?[{id:"3_h1",cat:"\uD83D\uDCB0 Harvey HbAP 2.0",text:"Call 832-393-0550 NOW to get your Harvey HbAP 2.0 Applicant ID — do not wait",urgent:true}]:[]),
      ...(hasCityProg?[{id:"3_c1",cat:"\uD83D\uDCB0 City Program",text:"Submit your complete city/county assistance application with all documents",urgent:true}]:[]),
      {id:"3_4",cat:"\uD83D\uDDC2\uFE0F Documents",text:"Gather: 2 years W-2s and tax returns, 30 days pay stubs, 3 months bank statements",urgent:true},
      {id:"3_5",cat:"\uD83D\uDDC2\uFE0F Documents",text:"Pull all debt statements (car, student loans, credit cards) for DTI review",urgent:false},
      {id:"3_6",cat:"\uD83D\uDD0D Search",text:`Begin active home search in ${cityLabel} — schedule tours weekly`,urgent:false},
      {id:"3_7",cat:"\uD83D\uDD0D Search",text:"Attend at least 5 open houses to calibrate expectations against your budget",urgent:false},
      {id:"3_8",cat:"\uD83D\uDCB5 Finances",text:`Confirm ${fmt(dp+price*.03)} in liquid savings is accessible and untouched`,urgent:true},
      ...(hasHarvey?[{id:"3_h2",cat:"\uD83D\uDCB0 Harvey",text:"Avoid scheduling closing June 18–July 11 (Houston fiscal year — no funds wired)",urgent:true}]:[]),
      ...(hasMCC?[{id:"3_m1",cat:"\uD83D\uDCB0 MCC",text:"Ask your lender to stack the Mortgage Credit Certificate with your DPA programs",urgent:false}]:[]),
      {id:"3_9",cat:"\uD83C\uDFE0 Buying",text:"Hire a buyer's real estate agent — they cost you nothing, seller pays their commission",urgent:false},
      {id:"3_pest",cat:"\uD83C\uDFE0 Inspection",text:"Schedule a separate termite/pest inspection — lenders require it for FHA/VA loans and it protects against hidden structural damage",urgent:true},
      {id:"3_survey",cat:"\uD83D\uDCCF Survey",text:"Order a property survey to confirm exact lot lines and boundaries before closing — title disputes are expensive after the fact",urgent:false},
      {id:"3_title",cat:"\uD83D\uDCDC Title",text:"Work with your title company to resolve any outstanding liens or title defects before the closing date",urgent:true},
      {id:"3_warranty",cat:"\uD83D\uDEE1\uFE0F Warranty",text:"Compare 1-year home warranty providers (American Home Shield, Choice Home Warranty) — ask the seller to cover it in negotiations",urgent:false},
      {id:"3_dpa_lender",cat:"\uD83D\uDCB0 DPA",text:"Explicitly confirm your chosen lender participates in your selected DPA programs — not all lenders underwrite all assistance programs",urgent:true},
      {id:"3_agent_check",cat:"\uD83E\uDD1D Agent",text:"Ask your agent: 'When was the last time you successfully closed a transaction using a down payment assistance program?' — experience matters",urgent:false},
      {id:"3_buydown",cat:"\uD83D\uDCC9 Rate",text:"Ask your loan officer how low you can buy down your rate using points, and whether your lender allows stacking multiple assistance programs",urgent:false},
    ]},
    "6mo":{label:"6 months out",color:C.amber,bg:C.amberLight,icon:"\uD83C\uDFD7\uFE0F",desc:"Building your foundation.",tasks:[
      {id:"6_1",cat:"\uD83D\uDCB3 Credit",text:needsScore?`Your ${score} score needs work — pay credit cards below 30% utilization now`:`Maintain your ${score} score — set up autopay on all accounts`,urgent:needsScore},
      {id:"6_2",cat:"\uD83D\uDCB3 Credit",text:"Dispute any errors on all three credit bureaus (Experian, Equifax, TransUnion)",urgent:false},
      {id:"6_3",cat:"\uD83D\uDCB3 Credit",text:"Do NOT open new credit, finance a car, or co-sign anything for 6 months",urgent:true},
      {id:"6_4",cat:"\uD83D\uDCB5 Savings",text:`Set up auto-save to reach ${fmt(dp+price*.03)} — your down payment + closing target`,urgent:true},
      {id:"6_5",cat:"\uD83D\uDCB5 Savings",text:`Build a 3-month emergency reserve (${fmt(grossMo*.4*3)}) separate from down payment funds`,urgent:false},
      ...(needsDebt?[{id:"6_d1",cat:"\uD83D\uDCB3 Debts",text:`Pay down ${fmt(debts-300)} of your current ${fmt(debts)}/mo in debts to improve your DTI ratio`,urgent:true}]:[]),
      ...(hasHarvey?[{id:"6_h1",cat:"\uD83D\uDCB0 Harvey",text:"Verify your 2017 Houston address at houstontx.gov mapping tool — do this early",urgent:true}]:[]),
      ...(hasTSAHC?[{id:"6_s1",cat:"\uD83D\uDCB0 State",text:"Confirm TSAHC/TDHCA income limits for your county and that you qualify",urgent:false}]:[]),
      {id:"6_6",cat:"\uD83D\uDCCB Education",text:"Register for your HUD-approved homebuyer course (Avenue CDC in Houston is free)",urgent:false},
      {id:"6_7",cat:"\uD83C\uDFE0 Research",text:`Research your target neighborhoods in ${cityLabel} — narrow to 2–3 areas`,urgent:false},
      {id:"6_8",cat:"\uD83C\uDFE6 Loan",text:"Get a soft-pull pre-qualification (no hard credit inquiry) to confirm borrowing power",urgent:false},
      {id:"6_9",cat:"\uD83D\uDDC2\uFE0F Documents",text:"Start organizing: tax returns, pay stubs, bank statements, and ID in one folder",urgent:false},
    ]},
    "12mo":{label:"12 months out",color:C.green,bg:C.greenLight,icon:"\uD83C\uDF31",desc:"Planting the seeds — big moves take time.",tasks:[
      {id:"12_1",cat:"\uD83D\uDCB3 Credit",text:needsScore?`Start credit repair now — target ${score+60}+ score by month 9. Call a free HUD counselor: 1-800-569-4287`:`Maintain ${score} score — autopay all accounts, keep utilization under 30%`,urgent:needsScore},
      {id:"12_2",cat:"\uD83D\uDCB3 Credit",text:"Pay all credit cards below 30% utilization (ideally under 10%)",urgent:false},
      ...(needsScore?[
        {id:"12_cr1",cat:"\uD83D\uDCB3 Credit Repair",text:"Step 1: Pull free reports at AnnualCreditReport.com — dispute every error on all 3 bureaus (Experian, Equifax, TransUnion)",urgent:true},
        {id:"12_cr2",cat:"\uD83D\uDCB3 Credit Repair",text:"Step 2: Pay down credit cards to under 30% of their limit — this alone can raise your score 20–50 pts",urgent:true},
        {id:"12_cr3",cat:"\uD83D\uDCB3 Credit Repair",text:"Step 3: Do NOT close old accounts — length of credit history counts. Keep them open with a small balance",urgent:false},
        {id:"12_cr4",cat:"\uD83D\uDCB3 Credit Repair",text:"Step 4: Become an authorized user on a family member's old, well-managed card — can add 20–40 pts quickly",urgent:false},
        {id:"12_cr5",cat:"\uD83D\uDCB3 Credit Repair",text:"Step 5: Set up autopay for every account — one 30-day late payment can drop your score 60–110 pts",urgent:true},
        {id:"12_cr6",cat:"\uD83D\uDCB3 Credit Repair",text:"Step 6: If you have collections, try 'pay for delete' — negotiate in writing before paying",urgent:false},
        {id:"12_cr7",cat:"\uD83D\uDCB3 Credit Repair",text:`Target: reach ${score<580?620:score<620?640:680}+ by month 6 to qualify for ${score<580?"FHA":"conventional"} loans. Track monthly at Credit Karma (free)`,urgent:true},
      ]:[]),
      {id:"12_3",cat:"\uD83D\uDCB5 Savings",text:`Map a 12-month plan: save ${fmt(Math.round((dp+price*.03)/12))}/mo to reach ${fmt(dp+price*.03)}`,urgent:false},
      {id:"12_4",cat:"\uD83D\uDCB5 Savings",text:"Open a dedicated high-yield savings account (HYSA) for your down payment",urgent:false},
      {id:"12_5",cat:"\uD83D\uDCB3 Debts",text:needsDebt?`Create a debt payoff plan — ${fmt(debts)}/mo in debts is hurting your DTI`:"Review all subscriptions and memberships — cut anything non-essential",urgent:needsDebt},
      {id:"12_6",cat:"\uD83D\uDCCA Budget",text:"Track every dollar for 3 months to find where your money really goes",urgent:false},
      ...(hasHarvey?[{id:"12_h1",cat:"\uD83D\uDCB0 Harvey",text:"Confirm HbAP 2.0 is still funded — call 832-393-0550 to check availability",urgent:false}]:[]),
      ...(hasTSAHC?[{id:"12_s1",cat:"\uD83D\uDCB0 State",text:"Attend a free TSAHC homebuyer seminar — listed at tsahc.org",urgent:false}]:[]),
      {id:"12_7",cat:"\uD83C\uDFE0 Research",text:`Drive through target areas in ${cityLabel} at different times of day and week`,urgent:false},
      {id:"12_8",cat:"\uD83C\uDFE0 Research",text:"Research school districts, walkability, and FEMA flood zone maps for target areas",urgent:false},
      {id:"12_9",cat:"\uD83C\uDFE0 Research",text:"Study 12 months of comparable sales on Zillow/Redfin in your target neighborhoods",urgent:false},
      {id:"12_10",cat:"\uD83D\uDCCB Education",text:"Find your local HUD-approved housing counseling agency — first visit is free",urgent:false},
      {id:"12_11",cat:"\uD83D\uDCB5 Savings",text:"Build a 6-month emergency fund before you close — homeownership has surprise costs",urgent:false},
      {id:"12_12",cat:"\uD83D\uDCB0 Retirement",text:"Keep saving for retirement — buying a home matters, but not at the cost of your future",urgent:false},
    ]},
  };
}

const Slider=({label,min,max,step,value,onChange,display,note,color=C.green})=>(
  <div style={{marginBottom:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
      <label style={{fontSize:13,fontWeight:600,color:C.charcoal}}>{label}</label>
      <span style={{fontSize:15,fontWeight:800,color}}>{display!==undefined?display:fmt(value)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e=>onChange(Number(e.target.value))}
      style={{width:"100%",accentColor:color,cursor:"pointer"}}/>
    {note&&<div style={{fontSize:11,color:C.gray500,marginTop:3}}>{note}</div>}
  </div>
);
const Card=({children,style={}})=>(
  <div style={{background:C.white,borderRadius:16,padding:"18px 16px",marginBottom:12,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",...style}}>{children}</div>
);
const SecTitle=({children})=>(
  <div style={{fontSize:11,fontWeight:700,color:C.green,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>{children}</div>
);
const InfoRow=({label,value,valueColor,bold,topBorder})=>(
  <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`0.5px solid ${C.gray100}`,borderTop:topBorder?`1.5px solid ${C.gray300}`:"none",marginTop:topBorder?6:0}}>
    <span style={{fontSize:12,color:bold?C.charcoal:C.gray700,fontWeight:bold?700:400,flex:1}}>{label}</span>
    <span style={{fontSize:12,fontWeight:bold?800:600,color:valueColor||C.charcoal,whiteSpace:"nowrap"}}>{value}</span>
  </div>
);
const Alert=({type="info",children})=>{
  const s={info:{bg:C.blueLight,color:C.blue},success:{bg:C.greenLight,color:C.green},warning:{bg:C.amberLight,color:"#92400E"},danger:{bg:C.redLight,color:C.red}}[type];
  return<div style={{background:s.bg,color:s.color,borderRadius:10,padding:"10px 14px",fontSize:12,lineHeight:1.6,marginTop:8}}>{children}</div>;
};
const BigNum=({label,value,sub,color,bg})=>(
  <div style={{background:bg||C.greenPale,borderRadius:12,padding:"12px 10px",textAlign:"center"}}>
    <div style={{fontSize:10,color:C.gray500,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:3}}>{label}</div>
    <div style={{fontSize:19,fontWeight:900,color:color||C.green,lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontSize:10,color:C.gray500,marginTop:3,lineHeight:1.3}}>{sub}</div>}
  </div>
);
const PBar=({value,max,color=C.green})=>(
  <div style={{height:6,borderRadius:99,background:C.gray100,overflow:"hidden"}}>
    <div style={{height:"100%",width:`${Math.min(100,Math.max(0,Math.round(value/max*100)))}%`,background:color,borderRadius:99,transition:"width 0.3s"}}/>
  </div>
);
const BtnPri=({onClick,children,disabled})=>(
  <button onClick={onClick} disabled={disabled}
    style={{background:disabled?C.gray300:C.green,color:C.white,border:"none",borderRadius:12,padding:"14px 20px",fontSize:15,fontWeight:700,cursor:disabled?"not-allowed":"pointer",width:"100%"}}>
    {children}
  </button>
);
const BtnSec=({onClick,children})=>(
  <button onClick={onClick}
    style={{background:C.white,color:C.green,border:`2px solid ${C.green}`,borderRadius:12,padding:"12px 20px",fontSize:14,fontWeight:700,cursor:"pointer",width:"100%"}}>
    {children}
  </button>
);

// ── Acronym glossary ────────────────────────────────────────────────────────
const ACRONYMS={
  "DTI":"Debt-to-Income Ratio — your total monthly debt payments divided by your gross monthly income. Lenders max out at 43% back-end DTI.",
  "PMI":"Private Mortgage Insurance — required on conventional loans with less than 20% down. Cancels automatically when you reach 20% equity.",
  "MIP":"Mortgage Insurance Premium — FHA\'s version of PMI. Includes a 1.75% upfront fee plus 0.55% annual premium. Does not cancel if you put less than 10% down.",
  "PITI":"Principal, Interest, Taxes & Insurance — the four components of a full monthly housing payment.",
  "P&I":"Principal & Interest — the part of your payment that pays down your loan balance and covers interest.",
  "MCC":"Mortgage Credit Certificate — a federal tax credit (issued by state/local agencies) that converts a percentage of your annual mortgage interest into a dollar-for-dollar reduction in your federal tax bill.",
  "DPA":"Down Payment Assistance — grants or low/no-interest loans that help cover your down payment and/or closing costs.",
  "FHA":"Federal Housing Administration — a government agency that insures mortgages with lower credit and down payment requirements (3.5% min, 580+ score).",
  "VA":"VA Home Loan — a mortgage benefit for veterans, active duty service members, and surviving spouses. $0 down payment, no PMI.",
  "AMI":"Area Median Income — the midpoint income for a geographic area, used by housing programs to determine eligibility thresholds.",
  "MFI":"Median Family Income — similar to AMI; the benchmark used by many state and local housing programs.",
  "HOA":"Homeowners Association — a body that manages common areas in a community and collects monthly or annual fees from homeowners.",
  "HUD":"U.S. Department of Housing and Urban Development — the federal agency overseeing FHA loans, the Good Neighbor Next Door program, and fair housing laws.",
  "TSAHC":"Texas State Affordable Housing Corporation — a Texas nonprofit that administers down payment assistance and mortgage programs.",
  "TDHCA":"Texas Department of Housing and Community Affairs — the Texas state agency for homebuyer assistance programs.",
  "IHDA":"Illinois Housing Development Authority — the Illinois state agency for homebuyer assistance programs.",
  "SONYMA":"State of New York Mortgage Agency — New York\'s state housing finance agency.",
  "NACA":"Neighborhood Assistance Corporation of America — a national nonprofit offering below-market mortgages with no down payment and no closing costs.",
  "CalHFA":"California Housing Finance Agency — California\'s state agency for homebuyer mortgage and down payment programs.",
  "FEMA":"Federal Emergency Management Agency — manages the National Flood Insurance Program (NFIP) and publishes official flood zone maps.",
  "HYSA":"High-Yield Savings Account — a savings account (typically at an online bank) offering significantly above-average interest rates.",
  "GNND":"Good Neighbor Next Door — a HUD program offering eligible buyers 50% off HUD-listed homes in designated revitalization areas.",
  "UCR":"Uniform Crime Reports — the FBI\'s standardized annual crime data collection program used by most local police departments.",
  "NIBRS":"National Incident-Based Reporting System — the FBI\'s newer, more detailed crime reporting standard replacing UCR.",
  "WUI":"Wildland-Urban Interface — the zone where developed land meets undeveloped wildland, where wildfire risk is highest.",
  "USDA":"U.S. Department of Agriculture — offers the USDA Rural Development loan: $0 down, low rates for buyers in eligible rural/suburban areas.",
  "FICO":"Fair Isaac Corporation — the company that created the standard credit scoring model used by most mortgage lenders.",
  "NRI":"National Risk Index — FEMA\'s composite risk score for natural hazards by county and census tract.",
};

const AcronymBar=({keys})=>{
  const relevant=keys.filter(k=>ACRONYMS[k]);
  if(!relevant.length)return null;
  return(
    <div style={{borderTop:`1px dashed ${C.gray300}`,marginTop:16,paddingTop:10}}>
      <div style={{fontSize:9,fontWeight:800,color:C.gray500,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6}}>📖 Glossary — terms used on this page</div>
      <div style={{display:"flex",flexDirection:"column",gap:3}}>
        {relevant.map(k=>(
          <div key={k} style={{fontSize:10,color:C.gray500,lineHeight:1.45}}>
            <strong style={{color:C.charcoal,fontWeight:700}}>{k}</strong> — {ACRONYMS[k]}
          </div>
        ))}
      </div>
    </div>
  );
};

// Reusable climate card — shows zip-specific tool links first, state-level context below
const ClimateCard=({climate,state,zip,compact=false})=>{
  const riskColor=r=>r==="Extreme"||r==="Very High"?C.red:r==="High"?C.amber:r==="Moderate"||r==="Low-Moderate"?C.greenMid:C.green;
  const riskBg=r=>r==="Extreme"||r==="Very High"?C.redLight:r==="High"?C.amberLight:r==="Moderate"||r==="Low-Moderate"?"#FFF7ED":C.greenLight;
  // .gov primary sources listed first, trusted secondary below
  const zipTools=[
    {name:"FEMA Flood Map Service Center (.gov)",url:`https://msc.fema.gov/portal/search?AddressQuery=${zip}`,desc:"Enter ZIP "+zip+" for the official FEMA flood zone designation for every parcel",icon:"🌊",gov:true},
    {name:"FEMA National Risk Index (.gov)",url:"https://hazards.fema.gov/nri/",desc:"Multi-hazard risk scores — flood, hurricane, tornado, wildfire, heat wave & more by census tract",icon:"🗺️",gov:true},
    {name:"Wildfire Risk to Communities (.gov / USDA)",url:"https://wildfirerisk.org/",desc:"USDA Forest Service wildfire likelihood & exposure — search by ZIP "+zip,icon:"🔥",gov:true},
    {name:"First Street Foundation",url:"https://firststreet.org/",desc:"Flood, fire, wind & heat risk scores for specific properties — search ZIP "+zip,icon:"🌡️",gov:false},
    {name:"ClimateCheck",url:"https://climatecheck.com/",desc:"30-year climate risk projections (heat, drought, storm, fire, flood) — search ZIP "+zip,icon:"📊",gov:false},
  ];
  // Only show risk types that aren't "None"
  const activeRisks=climate?Object.entries(climate).filter(([,v])=>v.risk!=="None"):[];
  return(
    <div style={{marginBottom:compact?10:0}}>
      {/* ZIP-specific tools — always at top */}
      <div style={{background:C.blueLight,borderRadius:compact?10:12,padding:compact?"10px 12px":"12px 14px",marginBottom:compact?8:10}}>
        <div style={{fontSize:compact?11:13,fontWeight:800,color:C.blue,marginBottom:4}}>
          🌍 Get climate risk scores for ZIP <strong>{zip}</strong> specifically
        </div>
        <div style={{fontSize:compact?10:11,color:C.gray700,lineHeight:1.5,marginBottom:8}}>
          Climate risk varies block by block — flood zones, wildfire buffers, and heat islands don't follow city or state lines. Use these tools to look up <strong>your exact ZIP or address</strong>:
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:compact?4:6}}>
          {zipTools.map(t=>(
            <a key={t.name} href={t.url} target="_blank" rel="noreferrer"
              style={{display:"flex",alignItems:"flex-start",gap:8,background:t.gov?"rgba(219,234,254,0.7)":"rgba(255,255,255,0.75)",borderRadius:8,padding:"7px 10px",textDecoration:"none",border:t.gov?"1px solid #93C5FD":"1px solid transparent"}}>
              <span style={{fontSize:16,flexShrink:0,marginTop:1}}>{t.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:1}}>
                  {t.gov&&<span style={{fontSize:8,fontWeight:900,background:C.blue,color:C.white,padding:"1px 5px",borderRadius:3,letterSpacing:"0.04em",flexShrink:0}}>.GOV</span>}
                  <span style={{fontSize:compact?10:11,fontWeight:800,color:C.blue}}>{t.name} →</span>
                </div>
                <div style={{fontSize:9,color:C.gray500,lineHeight:1.4}}>{t.desc}</div>
              </div>
            </a>
          ))}
        </div>
        <div style={{fontSize:9,color:C.gray500,marginTop:6}}>
          ⚠️ Always check flood zone & get insurance quotes <em>before</em> making an offer — not after.
        </div>
      </div>

      {/* State-level regional context */}
      {activeRisks.length>0&&(
        <div>
          <div style={{fontSize:10,fontWeight:800,color:C.gray500,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:compact?6:8}}>
            Regional context — {state} (state-level overview, your ZIP may differ):
          </div>
          {activeRisks.map(([key,val])=>(
            <div key={key} style={{background:riskBg(val.risk),borderRadius:compact?8:10,padding:compact?"8px 10px":"10px 12px",marginBottom:compact?5:6}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:compact?2:4}}>
                <span style={{fontSize:compact?11:13,fontWeight:800,color:riskColor(val.risk)}}>{val.icon} {key.charAt(0).toUpperCase()+key.slice(1)} Risk</span>
                <span style={{fontSize:compact?10:11,fontWeight:900,color:riskColor(val.risk),padding:"2px 8px",borderRadius:99,background:"rgba(255,255,255,0.5)"}}>{val.risk}</span>
              </div>
              {!compact&&<div style={{fontSize:11,color:C.charcoal,lineHeight:1.55}}>{val.detail}</div>}
            </div>
          ))}
        </div>
      )}
      {!climate&&(
        <div style={{background:C.gray100,borderRadius:10,padding:"10px 12px",fontSize:11,color:C.gray700,lineHeight:1.5}}>
          State-level climate context isn't available for this state yet — use the ZIP tools above for accurate local data.
        </div>
      )}
    </div>
  );
};

// Reusable crime card — color derived from score (0-4 red, 5-7 yellow, 8-10 green), no numeric display
const CrimeCard=({crime,city,zip,compact=false})=>{
  if(!crime)return null;
  const sc=crime.safety;
  const safeColor=sc>=8?C.green:sc>=5?C.amber:C.red;
  const safeBg=sc>=8?C.greenLight:sc>=5?C.amberLight:C.redLight;
  const primaryUrl=crime.source?crime.source.url:"https://www.fbi.gov/services/cjis/ucr";
  const primaryLabel=crime.source?crime.source.name:"FBI Uniform Crime Reports";
  const incidentUrl="https://www.crimemapping.com/";
  return(
    <div style={{background:safeBg,borderRadius:compact?10:12,padding:compact?"10px 12px":"14px 16px",marginBottom:compact?10:12}}>
      <div style={{fontSize:compact?12:14,fontWeight:800,color:safeColor,marginBottom:6}}>🚨 {city} Safety</div>
      <div style={{height:5,borderRadius:99,background:"rgba(0,0,0,0.1)",overflow:"hidden",marginBottom:10}}>
        <div style={{height:"100%",width:`${sc*10}%`,background:safeColor,borderRadius:99,transition:"width 0.4s"}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
        <a href={primaryUrl} target="_blank" rel="noreferrer"
          style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"rgba(255,255,255,0.75)",border:`1.5px solid ${safeColor}`,borderRadius:8,padding:"8px 6px",textDecoration:"none",textAlign:"center"}}>
          <span style={{fontSize:8,fontWeight:900,background:C.blue,color:C.white,padding:"1px 6px",borderRadius:3,letterSpacing:"0.04em"}}>.GOV</span>
          <span style={{fontSize:10,fontWeight:800,color:safeColor,lineHeight:1.3}}>Official {city} crime stats →</span>
          <span style={{fontSize:8,color:C.gray500,lineHeight:1.3}}>{primaryLabel}</span>
        </a>
        <a href={incidentUrl} target="_blank" rel="noreferrer"
          style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"rgba(255,255,255,0.75)",border:`1.5px solid ${C.gray300}`,borderRadius:8,padding:"8px 6px",textDecoration:"none",textAlign:"center"}}>
          <span style={{fontSize:10,fontWeight:800,color:C.charcoal,lineHeight:1.3}}>Search incidents near ZIP {zip} →</span>
          <span style={{fontSize:8,color:C.gray500,lineHeight:1.3}}>CrimeMapping.com · official PD feeds</span>
        </a>
      </div>
    </div>
  );
};

function StepLocation({data,setData,onNext}){
  const [zip,setZip]=useState(data.zip||"");
  const [status,setStatus]=useState(data.zip?"found":"idle");
  const [locInfo,setLocInfo]=useState(data.locationInfo||null);
  const [loading,setLoading]=useState(false);
  const lookup=async z=>{
    const c=z.trim();
    if(c.length!==5||!/^\d{5}$/.test(c)){setStatus("invalid");return;}
    setLoading(true);
    if(ZIP_DB[c]){
      const [st,ci,co]=ZIP_DB[c];
      const info={zip:c,state:st,city:ci,county:co};
      setLocInfo(info);setStatus("found");setLoading(false);return;
    }
    try{
      const res=await fetch(`https://api.zippopotam.us/us/${c}`);
      if(!res.ok)throw new Error();
      const j=await res.json();
      const pl=j.places[0];
      setLocInfo({zip:c,state:pl["state abbreviation"],city:pl["place name"],county:""});
      setStatus("found");
    }catch{setLocInfo({zip:c,state:"",city:"",county:""});setStatus("unknown");}
    setLoading(false);
  };
  const confirm=()=>{setData({...data,zip,locationInfo:locInfo});onNext();};
  const {programs:progs}=usePrograms(locInfo,data);
  const layers={federal:0,state:0,city:0,heroes:0};
  progs.forEach(p=>{if(layers[p.layer]!==undefined)layers[p.layer]++;});
  const crime=locInfo?getCrime(locInfo.city):null;
  const climate=locInfo?getClimate(locInfo.state):null;
  const riskColor=r=>r==="Extreme"||r==="Very High"?C.red:r==="High"?C.amber:r==="Moderate"||r==="Low-Moderate"?C.greenMid:C.green;
  const btnLabel=()=>{
    if(status==="found") return data.isFirstTime?"Let's find my first home →":"Let's find my next home →";
    if(status==="unknown") return "Continue anyway →";
    return "Enter your zip code above";
  };
  return(
    <div>
      <Card>
        <SecTitle>Are you buying your first home or moving again?</SecTitle>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[{v:true,emoji:"🏠",label:"First home",sub:"I haven't owned before"},{v:false,emoji:"🔑",label:"Buying again",sub:"I've owned before"}].map(opt=>(
            <div key={String(opt.v)} onClick={()=>setData({...data,isFirstTime:opt.v})}
              style={{border:`2px solid ${data.isFirstTime===opt.v?C.green:C.gray300}`,borderRadius:12,padding:"12px 10px",cursor:"pointer",background:data.isFirstTime===opt.v?C.greenLight:C.white,textAlign:"center"}}>
              <div style={{fontSize:22,marginBottom:4}}>{opt.emoji}</div>
              <div style={{fontSize:13,fontWeight:800,color:data.isFirstTime===opt.v?C.green:C.charcoal}}>{opt.label}</div>
              <div style={{fontSize:11,color:C.gray500,marginTop:2}}>{opt.sub}</div>
            </div>
          ))}
        </div>
        {!data.isFirstTime&&<Alert type="info" style={{marginTop:8}}>Some DPA programs are first-time buyer only. We'll still show you the programs you qualify for.</Alert>}
      </Card>
      <Card>
        <SecTitle>Household size</SecTitle>
        <p style={{fontSize:12,color:C.gray700,marginBottom:10,lineHeight:1.5}}>Number of people in your household, including yourself. Used to determine AMI eligibility for assistance programs.</p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {[1,2,3,4,5,6,7,8].map(n=>(
            <div key={n} onClick={()=>setData({...data,householdSize:n})}
              style={{width:40,height:40,borderRadius:10,border:`2px solid ${(data.householdSize||1)===n?C.green:C.gray300}`,background:(data.householdSize||1)===n?C.green:C.white,color:(data.householdSize||1)===n?C.white:C.charcoal,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,cursor:"pointer"}}>
              {n}
            </div>
          ))}
        </div>
        {(data.householdSize||1)>=4&&<Alert type="info" style={{marginTop:8}}>Larger households often qualify for higher AMI thresholds — you may be eligible for more programs.</Alert>}
      </Card>
      <Card>
        <SecTitle>Are you currently renting?</SecTitle>
        <p style={{fontSize:12,color:C.gray700,marginBottom:10,lineHeight:1.5}}>Your current rent is used in the Wait vs. Buy analysis to show the true cost of waiting.</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
          {[{v:true,emoji:"🏢",label:"Yes, I rent",sub:"Enter your monthly rent below"},{v:false,emoji:"🏠",label:"No / Other",sub:"Living with family, own property, etc."}].map(opt=>(
            <div key={String(opt.v)} onClick={()=>setData({...data,isRenting:opt.v})}
              style={{border:`2px solid ${data.isRenting===opt.v?C.green:C.gray300}`,borderRadius:10,padding:"10px 8px",cursor:"pointer",background:data.isRenting===opt.v?C.greenLight:C.white,textAlign:"center"}}>
              <div style={{fontSize:18,marginBottom:3}}>{opt.emoji}</div>
              <div style={{fontSize:12,fontWeight:800,color:data.isRenting===opt.v?C.green:C.charcoal}}>{opt.label}</div>
              <div style={{fontSize:10,color:C.gray500}}>{opt.sub}</div>
            </div>
          ))}
        </div>
        {data.isRenting&&(
          <Slider label="Current monthly rent" min={300} max={5000} step={50} value={data.monthlyRent||1500}
            onChange={v=>setData({...data,monthlyRent:v})}
            display={fmt(data.monthlyRent||1500)+"/mo"}
            note="Used in the Wait vs. Buy analysis on your results page"/>
        )}
      </Card>
      <Card>
        <SecTitle>Where are you buying?</SecTitle>
        <p style={{fontSize:13,color:C.gray700,marginBottom:12,lineHeight:1.6}}>Enter your target zip code to unlock every assistance program, crime rating, climate risk, and neighborhood guide for your area.</p>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
          <input value={zip} onChange={e=>{setZip(e.target.value);if(e.target.value.length===5)lookup(e.target.value);}}
            placeholder="e.g. 77004" maxLength={5}
            style={{width:"100%",boxSizing:"border-box",fontSize:20,fontWeight:700,padding:"12px 14px",border:`2px solid ${status==="found"?C.green:status==="invalid"?C.red:C.gray300}`,borderRadius:12,outline:"none",letterSpacing:"0.12em",textAlign:"center"}}/>
          <button onClick={()=>lookup(zip)}
            style={{width:"100%",padding:"13px",background:C.green,color:C.white,border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:"pointer"}}>
            {loading?"...":"Look up"}
          </button>
        </div>
        {status==="invalid"&&<Alert type="danger">Please enter a valid 5-digit US zip code.</Alert>}
        {status==="unknown"&&<Alert type="warning"><strong>ZIP {zip} not in our database.</strong> We connected to a backup service. Federal and state programs will still show. For city-specific programs, check your local housing authority.</Alert>}
        {status==="found"&&locInfo&&(
          <div>
            <div style={{background:C.greenLight,borderRadius:12,padding:"14px 16px",marginBottom:12}}>
              <div style={{fontSize:11,color:C.greenMid,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Location confirmed ✓</div>
              <div style={{fontSize:20,fontWeight:900,color:C.green}}>{locInfo.city}{locInfo.county?`, ${locInfo.county} County`:""}</div>
              <div style={{fontSize:14,color:C.greenMid,fontWeight:600}}>{locInfo.state} · ZIP {locInfo.zip}</div>
            </div>
            <div style={{fontSize:12,fontWeight:600,color:C.charcoal,marginBottom:8}}>🎯 <strong>{progs.length} programs found</strong> for your location:</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
              {Object.entries(layers).filter(([,v])=>v>0).map(([k,v])=>(
                <span key={k} style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99,background:C.greenLight,color:C.green}}>
                  {v} {k==="city"?"City/County":k.charAt(0).toUpperCase()+k.slice(1)}
                </span>
              ))}
            </div>
            <CrimeCard crime={crime} city={locInfo.city} zip={locInfo.zip} compact={true}/>
            <ClimateCard climate={climate} state={locInfo.state} zip={locInfo.zip} compact={true}/>
          </div>
        )}
      </Card>
      <BtnPri onClick={confirm} disabled={status!=="found"&&status!=="unknown"}>
        {btnLabel()}
      </BtnPri>
    </div>
  );
}

function StepIncome({data,setData,onNext,onBack}){
  const d=data;
  const grossMo=Math.round(d.income/12);
  const alimonyMo=Math.round((d.alimony||0)/12);
  const taxSav=calcTax(d.income,0)-calcTax(d.income,d.k401+d.hsa);
  return(
    <div>
      <Card>
        <SecTitle>Income</SecTitle>
        <Slider label="Annual gross income" min={0} max={700000} step={1000} value={d.income} onChange={v=>setData({...d,income:v})} display={fmtK(d.income)+"/yr"} note={fmt(grossMo)+"/mo gross"}/>
        <Slider label="Alimony received" min={0} max={700000} step={500} value={d.alimony||0} onChange={v=>setData({...d,alimony:v})} display={fmtK(d.alimony||0)+"/yr"} note={alimonyMo>0?fmt(alimonyMo)+"/mo · counts toward qualifying income":"Optional — add if you receive alimony"}/>
      </Card>
      <Card>
        <SecTitle>Retirement contributions</SecTitle>
        <Slider label="401(k) / 403(b) per year" min={0} max={23500} step={500} value={d.k401} onChange={v=>setData({...d,k401:v})} display={fmtK(d.k401)+"/yr"} note={`Pre-tax · ${Math.round(d.k401/23500*100)}% of $23,500 limit`} color={C.amber}/>
        <Slider label="Roth IRA per year" min={0} max={7000} step={250} value={d.roth} onChange={v=>setData({...d,roth:v})} display={fmtK(d.roth)+"/yr"} note={`Post-tax · ${Math.round(d.roth/7000*100)}% of $7,000 limit`} color={C.amber}/>
        <Slider label="HSA per year" min={0} max={4300} step={100} value={d.hsa} onChange={v=>setData({...d,hsa:v})} display={fmtK(d.hsa)+"/yr"} note={`Pre-tax · ${Math.round(d.hsa/4300*100)}% of $4,300 limit`} color={C.amber}/>
        {taxSav>0&&<Alert type="success">Pre-tax contributions save you <strong>{fmt(taxSav)}/mo</strong> in federal taxes.</Alert>}
      </Card>
      <Card>
        <SecTitle>Your profession</SecTitle>
        <p style={{fontSize:12,color:C.gray700,marginBottom:10,lineHeight:1.5}}>Many lenders and programs offer special benefits for certain professions. Select yours to unlock every program you qualify for.</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[
            {v:"teacher",emoji:"🍎",label:"Teacher / Educator",sub:"K-12, college, admin"},
            {v:"first_responder",emoji:"🚒",label:"Firefighter / EMT",sub:"Fire, EMS, paramedic"},
            {v:"law_enforcement",emoji:"🚔",label:"Law Enforcement",sub:"Police, sheriff, corrections"},
            {v:"healthcare",emoji:"🏥",label:"Healthcare Worker",sub:"Nurse, doctor, allied health"},
            {v:"government",emoji:"🏛️",label:"Government Employee",sub:"Federal, state, or local"},
            {v:"none",emoji:"💼",label:"Other / None",sub:"No profession preference"},
          ].map(opt=>(
            <div key={opt.v} onClick={()=>setData({...d,profession:opt.v})}
              style={{border:`2px solid ${d.profession===opt.v?C.green:C.gray300}`,borderRadius:10,padding:"10px 8px",cursor:"pointer",background:d.profession===opt.v?C.greenLight:C.white,display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18,flexShrink:0}}>{opt.emoji}</span>
              <div>
                <div style={{fontSize:12,fontWeight:800,color:d.profession===opt.v?C.green:C.charcoal,lineHeight:1.2}}>{opt.label}</div>
                <div style={{fontSize:10,color:C.gray500}}>{opt.sub}</div>
              </div>
            </div>
          ))}
        </div>
        {d.profession!=="none"&&<Alert type="success" style={{marginTop:8}}>Great — we will show profession-specific programs on the next steps.</Alert>}
      </Card>
      <Card>
        <SecTitle>Credit profile</SecTitle>
        <Slider label="Credit score" min={500} max={850} step={10} value={d.score} onChange={v=>setData({...d,score:v})} display={d.score}
          note={d.score>=740?"Excellent — best conventional rates":d.score>=700?"Good — conventional eligible":d.score>=640?"Fair — FHA recommended":"Below 640 — FHA or credit repair first"}
          color={d.score>=740?C.green:d.score>=700?C.greenMid:d.score>=640?C.amber:C.red}/>
        <div style={{fontSize:11,color:C.gray500,marginTop:-8,marginBottom:12,lineHeight:1.6}}>
          Lenders evaluate your application using the middle score from the 3 major credit bureaus.{" "}
          <a href="https://www.annualcreditreport.com" target="_blank" rel="noreferrer" style={{color:C.blue}}>Check your credit report for free once a year at annualcreditreport.com</a>.
        </div>

      </Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:8}}>
        <BtnSec onClick={onBack}>← Back</BtnSec>
        <BtnPri onClick={onNext}>Continue →</BtnPri>
      </div>
      <AcronymBar keys={["DTI","HYSA","FICO"]}/>
    </div>
  );
}

function StepHome({data,setData,onNext,onBack}){
  const d=data;
  const m=(d.price/d.income).toFixed(1);
  const mc=m<=3.5?C.green:m<=4.5?C.amber:C.red;
  return(
    <div>
      <Card>
        <SecTitle>Target price</SecTitle>
        <Slider label="Purchase price" min={100000} max={900000} step={5000} value={d.price} onChange={v=>setData({...d,price:v})} display={fmt(d.price)}
          note={`${m}× income — ${m<=3?"conservative":m<=4?"comfortable":m<=5?"stretch":"aggressive"}`} color={mc}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:8}}>
          <BigNum label="Down payment" value={fmt(d.price*d.dpPct/100)} color={C.green}/>
          <BigNum label="Income multiple" value={m+"×"} color={mc} sub={m<=3.5?"comfortable":m<=4.5?"manageable":"stretch"} bg={m<=3.5?C.greenPale:m<=4.5?C.amberLight:C.redLight}/>
          <BigNum label="Loan amount" value={fmtK(d.price*(1-d.dpPct/100))} color={C.charcoal}/>
        </div>
      </Card>
      <Card>
        <SecTitle>Affordability ranges</SecTitle>
        {[
          {l:"Conservative (2.5–3×)",max:d.income*3,col:C.green,desc:"A safe budget that leaves plenty of room for savings, travel, and unexpected expenses without stretching your monthly income."},
          {l:"Comfortable (3–4×)",max:d.income*4,col:C.greenMid,desc:"The standard benchmark for most buyers. Covers your housing costs reliably while maintaining a balanced lifestyle."},
          {l:"Stretch (4–5×)",max:d.income*5,col:C.amber,desc:"Aggressive territory. This requires a tighter budget elsewhere and leaves less breathing room for other financial goals."},
        ].map(t=>(
          <div key={t.l} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
              <span style={{color:C.gray700}}>{t.l}</span>
              <span style={{fontWeight:700}}>up to {fmt(t.max)}</span>
            </div>
            <PBar value={Math.min(d.price,t.max)} max={t.max} color={d.price<=t.max?t.col:C.red}/>
            <div style={{fontSize:10,color:C.gray500,marginTop:4,lineHeight:1.5}}>{t.desc}</div>
          </div>
        ))}
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:8}}>
        <BtnSec onClick={onBack}>← Back</BtnSec>
        <BtnPri onClick={onNext}>Continue →</BtnPri>
      </div>
      <AcronymBar keys={["DTI","AMI"]}/>
    </div>
  );
}

function StepLoan({data,setData,onNext,onBack}){
  const d=data;
  const rec=getLoanRec(d.score,d.dpPct,d.isVet);
  const fr=6.48,vr=6.17,cr=convRate(d.score,d.dpPct);
  const ar=d.loanType==="fha"?fr:d.loanType==="va"?vr:cr;
  const loan=d.price*(1-d.dpPct/100);
  const effMo=d.loanTerm==="5arm"||d.loanTerm==="7arm"?360:(d.loanTerm||360);
  const piti=Math.round(mpi(loan,ar,effMo)+d.price*0.022/12+d.price*0.012/12);
  const fe=Math.round(piti/(d.income/12)*100),be=Math.round((piti+d.debts+(d.student||0))/(d.income/12)*100);
  useEffect(()=>{if(d.loanType!==rec.type)setData({...d,loanType:rec.type});},[d.score,d.dpPct,d.isVet]);
  const loans=[
    {id:"fha",name:"FHA Loan",rate:fr,emoji:"🏛️",pros:["3.5% minimum down","Accessible 580+ credit","Flexible qualification"],cons:["Lifetime MIP < 10% down","1.75% upfront MIP","Stricter property rules"]},
    {id:"conv",name:"Conventional",rate:cr,emoji:"🏦",pros:["PMI cancels at 20%","Lower long-term cost","No upfront insurance"],cons:["620+ credit required","Higher score = better rate","Larger reserves needed"]},
    {id:"va",name:"VA Loan",rate:vr,emoji:"🎖️",pros:["$0 down payment","No PMI ever","Lowest available rate"],cons:["Veterans & active duty","VA funding fee","Need Certificate of Eligibility"]},
  ];
  const terms=[
    {id:360,label:"30-yr fixed",note:"Lowest monthly payment"},
    {id:180,label:"15-yr fixed",note:"Less interest, higher payment"},
    {id:"5arm",label:"5/1 ARM (Adjustable-Rate Mortgage)",note:"Fixed interest rate for the first 5 years, then adjusts once every year after."},
    {id:"7arm",label:"7/1 ARM (Adjustable-Rate Mortgage)",note:"Fixed interest rate for the first 7 years, then adjusts once every year after."},
  ];
  return(
    <div>
      <Alert type="info">
        <strong>Auto-recommendation:</strong> Based on {d.score} credit score and {d.dpPct}% down — we recommend <strong>{rec.type.toUpperCase()}</strong>. {rec.reason}
      </Alert>
      <div style={{display:"flex",alignItems:"center",gap:8,margin:"12px 0 8px"}}>
        <span style={{fontSize:12,color:C.gray700,fontWeight:600}}>Veteran / Active duty?</span>
        <button onClick={()=>setData({...d,isVet:!d.isVet})}
          style={{padding:"4px 14px",borderRadius:99,border:`1.5px solid ${d.isVet?C.green:C.gray300}`,background:d.isVet?C.green:C.white,color:d.isVet?C.white:C.gray700,fontSize:12,fontWeight:700,cursor:"pointer"}}>
          {d.isVet?"✓ Yes — show VA option":"No"}
        </button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:14}}>
        {loans.map(ln=>{
          const isRec=ln.id===rec.type,isSel=d.loanType===ln.id;
          return(
            <div key={ln.id} onClick={()=>setData({...d,loanType:ln.id})}
              style={{border:isSel?`2px solid ${C.green}`:`1.5px solid ${C.gray300}`,borderRadius:14,padding:14,cursor:"pointer",background:isSel?C.greenLight:C.white,position:"relative"}}>
              {isRec&&<div style={{position:"absolute",top:-1,left:"50%",transform:"translateX(-50%)",background:C.amber,color:C.white,fontSize:9,fontWeight:800,padding:"2px 10px",borderRadius:"0 0 8px 8px",whiteSpace:"nowrap"}}>⭐ RECOMMENDED FOR YOU</div>}
              <div style={{fontSize:20,marginBottom:6,marginTop:isRec?10:0}}>{ln.emoji}</div>
              <div style={{fontSize:13,fontWeight:isRec?800:600,color:C.charcoal,marginBottom:2}}>{ln.name}</div>
              <div style={{fontSize:20,fontWeight:900,color:isSel?C.green:C.charcoal,marginBottom:8}}>{ln.rate.toFixed(2)}%</div>
              {ln.pros.map((p,i)=><div key={i} style={{fontSize:11,color:C.green,marginBottom:1}}>✓ {p}</div>)}
              {ln.cons.map((p,i)=><div key={i} style={{fontSize:11,color:C.gray500,marginBottom:1}}>✗ {p}</div>)}
            </div>
          );
        })}
      </div>
      <Card>
        <SecTitle>Down payment</SecTitle>
        <Slider label="Down payment %" min={0} max={25} step={1} value={d.dpPct} onChange={v=>setData({...d,dpPct:v})} display={d.dpPct+"%"}
          note={d.dpPct>=20?"20%+ — no PMI required, best conventional rates":d.dpPct>=10?"10%+ — reduced PMI":"Under 10% — PMI / MIP applies"}/>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.gray500,marginTop:-8}}>
          <span>Down payment amount:</span>
          <span style={{fontWeight:700,color:C.charcoal}}>{fmt(d.price*d.dpPct/100)}</span>
        </div>
      </Card>
      <Card>
        <SecTitle>Loan term</SecTitle>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
          {terms.map(t=>(
            <div key={t.id} onClick={()=>setData({...d,loanTerm:t.id})}
              style={{border:`2px solid ${(d.loanTerm||360)===t.id?C.green:C.gray300}`,borderRadius:10,padding:"10px 12px",cursor:"pointer",background:(d.loanTerm||360)===t.id?C.greenLight:C.white}}>
              <div style={{fontSize:13,fontWeight:800,color:(d.loanTerm||360)===t.id?C.green:C.charcoal}}>{t.label}</div>
              <div style={{fontSize:10,color:C.gray500,marginTop:2}}>{t.note}</div>
            </div>
          ))}
        </div>
        {(d.loanTerm==="5arm"||d.loanTerm==="7arm")&&(
          <Alert type="warning" style={{marginTop:8}}>ARM rates adjust after the initial fixed period. Your rate could rise significantly. Only choose ARM if you plan to sell or refinance before adjustment.</Alert>
        )}
      </Card>
      <Card>
        <SecTitle>Pre-qualification check</SecTitle>
        {[{l:"Front-end DTI (housing/income)",v:fe,lim:28,ll:"28% ideal"},{l:"Back-end DTI (all debts/income)",v:be,lim:43,ll:"43% lender max"}].map(item=>(
          <div key={item.l} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
              <span style={{color:C.gray700}}>{item.l}</span>
              <span style={{fontWeight:800,color:item.v<=item.lim?C.green:C.red}}>{item.v}%</span>
            </div>
            <PBar value={item.v} max={50} color={item.v<=item.lim?C.green:item.v<=item.lim+5?C.amber:C.red}/>
            <div style={{fontSize:10,color:C.gray500,marginTop:2}}>{item.ll} — {item.v<=item.lim?"✓ Good":item.v<=item.lim+5?"⚠ Borderline":"✗ Over limit"}</div>
          </div>
        ))}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          <BigNum label="Your rate" value={ar.toFixed(2)+"%"} color={C.green}/>
          <BigNum label="Est. PITI" value={fmt(piti)+"/mo"} sub={fe+"% of income"} color={fe<=28?C.green:fe<=33?"#92400E":C.red} bg={fe<=28?C.greenPale:fe<=33?C.amberLight:C.redLight}/>
          <BigNum label="Loan" value={fmtK(loan)} color={C.charcoal}/>
        </div>
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:8}}>
        <BtnSec onClick={onBack}>← Back</BtnSec>
        <BtnPri onClick={onNext}>Continue →</BtnPri>
      </div>
      <AcronymBar keys={["FHA","VA","PMI","MIP","PITI","DTI","P&I"]}/>
    </div>
  );
}

function StepPrograms({data,setData,onNext,onBack}){
  const d=data;
  const loc=d.locationInfo||{};
  const{programs:allP,loading:progsLoading}=usePrograms(loc,d);
  const incompat=new Set();
  const estimatedAssets=((d.k401||0)+(d.roth||0)+(d.hsa||0));
  const harveyAssetCap=75000;
  const overHarveyAssetCap=estimatedAssets>harveyAssetCap;
  d.programs.forEach(id=>{const p=allP.find(x=>x.id===id);if(p)p.incompat.forEach(i=>incompat.add(i));});
  const toggle=id=>{
    const prog=allP.find(p=>p.id===id);if(!prog)return;
    if(d.programs.includes(id)){setData({...d,programs:d.programs.filter(p=>p!==id)});return;}
    const cleared=d.programs.filter(p=>!prog.incompat.includes(p));
    setData({...d,programs:[...cleared,id]});
  };
  const totalAssist=allP.filter(p=>d.programs.includes(p.id)).reduce((s,p)=>s+p.calc(d.price),0);
  const dp=d.price*d.dpPct/100;
  const fhaUp=d.loanType==="fha"?(d.price-dp)*0.0175:0;
  const needed=dp+d.price*0.03+1000+fhaUp;
  const oop=Math.max(0,needed-totalAssist);
  const layers=[
    {id:"federal",label:"Federal",col:C.blue,bg:C.blueLight},
    {id:"state",label:"State",col:C.green,bg:C.greenLight},
    {id:"city",label:"City / County",col:"#065F46",bg:"#D1FAE5"},
    {id:"heroes",label:"Heroes, Professions & Nonprofits",col:"#4C1D95",bg:"#EDE9FE"},
  ];
  return(
    <div>
      {loc.city&&<div style={{background:C.greenLight,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:12,color:C.green,fontWeight:600}}>📍 Showing programs for {loc.city}, {loc.state} (ZIP {loc.zip})</div>}
      <p style={{fontSize:13,color:C.gray700,marginBottom:12,lineHeight:1.6}}>
        Programs are grouped by funding layer. Select any you may qualify for — incompatible programs grey out automatically. Stacked programs cover your down payment and closing costs first, then reduce your loan balance.
      </p>
      {progsLoading&&<ProgramsSkeleton/>}
      {!progsLoading&&layers.map(layer=>{
        const lp=allP.filter(p=>p.layer===layer.id);
        if(!lp.length)return null;
        return(
          <div key={layer.id} style={{marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:11,fontWeight:800,padding:"3px 12px",borderRadius:99,background:layer.bg,color:layer.col,letterSpacing:"0.04em"}}>{layer.label}</span>
              <div style={{flex:1,height:1,background:C.gray100}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:8}}>
              {lp.map(prog=>{
                const on=d.programs.includes(prog.id),dim=!on&&incompat.has(prog.id);
                const amiOver=prog.amiLimit&&d.income>0&&d.income>prog.amiLimit;
                return(
                  <div key={prog.id} onClick={dim?undefined:()=>toggle(prog.id)}
                    style={{border:on?`2px solid ${C.green}`:`1.5px solid ${C.gray300}`,borderRadius:12,padding:12,cursor:dim?"not-allowed":"pointer",background:on?C.greenLight:C.white,opacity:dim?.35:amiOver?.4:1,position:"relative"}}>
                    <div style={{position:"absolute",top:8,right:8,width:18,height:18,borderRadius:"50%",background:on?C.green:C.gray100,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:C.white,fontWeight:800}}>{on?"✓":""}</div>
                    <div style={{fontSize:11,fontWeight:700,marginBottom:4,paddingRight:24,color:C.charcoal}}>{prog.name}</div>
                    <div style={{fontSize:10,color:C.gray500,marginBottom:6,lineHeight:1.35}}>{prog.short}</div>
                    <div style={{fontSize:14,fontWeight:900,color:on?C.green:C.charcoal}}>{prog.calc(d.price)>0?fmt(prog.calc(d.price)):prog.amount}</div>
                    <div style={{fontSize:10,color:C.gray500,marginTop:4,lineHeight:1.3}}>{prog.note}</div>
                    {amiOver&&<span style={{fontSize:9,fontWeight:700,color:C.red,background:C.redLight,padding:"1px 6px",borderRadius:3,display:"block",marginTop:3}}>Income may exceed AMI limit</span>}
                    {prog.id==="harvey"&&overHarveyAssetCap&&<span style={{fontSize:9,fontWeight:700,color:"#92400E",background:C.amberLight,padding:"1px 6px",borderRadius:3,display:"block",marginTop:3}}>Check Harvey asset cap ($75K)</span>}
                    {prog.expires&&<span style={{fontSize:9,fontWeight:700,color:"#92400E",background:C.amberLight,padding:"1px 6px",borderRadius:3,display:"block",marginTop:3}}>⏰ Funding: {prog.expires}</span>}
                    {prog.url&&<a href={prog.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:10,color:C.blue,display:"block",marginTop:4}}>Learn more →</a>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {progsLoading&&null}
      <Card>
        <SecTitle>Your stacked total</SecTitle>
        <InfoRow label="Total assistance" value={totalAssist>0?fmt(totalAssist):"$0 — select programs above"} valueColor={totalAssist>0?C.green:C.gray500}/>
        <InfoRow label="Cash needed (DP + closing)" value={fmt(needed)}/>
        <InfoRow label="Assistance covers" value={totalAssist>0?"- "+fmt(Math.min(totalAssist,needed)):"—"} valueColor={C.green}/>
        {totalAssist>needed&&<InfoRow label="Surplus → principal reduction" value={"- "+fmt(totalAssist-needed)} valueColor={C.green}/>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0 2px",borderTop:`2px solid ${C.gray200}`,marginTop:6}}>
          <span style={{fontSize:13,fontWeight:800,color:C.charcoal}}>You bring to closing</span>
          <span style={{fontSize:20,fontWeight:900,color:oop===0?C.green:oop<10000?"#92400E":C.red}}>{fmt(oop)}</span>
        </div>
        {oop===0&&totalAssist>0&&<Alert type="success">🎉 $0 out of pocket at closing with this combination!</Alert>}
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:8}}>
        <BtnSec onClick={onBack}>← Back</BtnSec>
        <BtnPri onClick={onNext}>Continue →</BtnPri>
      </div>
      <AcronymBar keys={["DPA","MCC","FHA","VA","HUD","AMI","MFI","TSAHC","TDHCA","IHDA","SONYMA","NACA","CalHFA","GNND"]}/>
    </div>
  );
}

function StepBudget({data,setData,onNext,onBack}){
  const d=data;
  return(
    <div>
      <p style={{fontSize:13,color:C.gray700,marginBottom:12,lineHeight:1.6}}>Your complete monthly picture — not just the mortgage payment.</p>
      <Card>
        <SecTitle>Daily life</SecTitle>
        <Slider label="Groceries" min={100} max={800} step={25} value={d.groc} onChange={v=>setData({...d,groc:v})}/>
        <Slider label="Dining out" min={0} max={600} step={25} value={d.dining} onChange={v=>setData({...d,dining:v})}/>
        <Slider label="Entertainment" min={0} max={500} step={25} value={d.ent} onChange={v=>setData({...d,ent:v})}/>
        <Slider label="Personal care (hair, skin, gym)" min={0} max={500} step={25} value={d.pcare} onChange={v=>setData({...d,pcare:v})}/>
      </Card>
      <Card>
        <SecTitle>Transportation & savings</SecTitle>
        <Slider label="Car (payment + insurance + gas)" min={0} max={1200} step={50} value={d.car} onChange={v=>setData({...d,car:v})}/>
        <Slider label="Emergency fund contributions" min={0} max={1000} step={50} value={d.efund} onChange={v=>setData({...d,efund:v})} note="Target 3–6 months of expenses before closing"/>
        {d.efund>0&&(()=>{
          const otherMo=d.groc+d.dining+d.ent+d.pcare+d.car+d.debts;
          const annualSavings=d.efund*12;
          const runway=otherMo>0?(annualSavings/otherMo).toFixed(1):null;
          return(
            <div style={{background:C.gray100,borderRadius:8,padding:"9px 12px",marginTop:4,display:"flex",flexDirection:"column",gap:4}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                <span style={{color:C.gray700}}>Annual savings at this rate</span>
                <span style={{fontWeight:800,color:C.green}}>{fmt(annualSavings)}/yr</span>
              </div>
              {runway&&<div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                <span style={{color:C.gray700}}>Runway vs. other monthly expenses</span>
                <span style={{fontWeight:800,color:C.charcoal}}>{runway} months</span>
              </div>}
            </div>
          );
        })()}
      </Card>
      <Card>
        <SecTitle>Existing monthly debts</SecTitle>
        <Slider label="Monthly student loan payments" min={0} max={2000} step={25} value={d.student||0} onChange={v=>setData({...d,student:v})} note="Counts toward your back-end DTI"/>
        <Slider label="Other monthly debts (car, credit cards)" min={0} max={2000} step={50} value={d.debts} onChange={v=>setData({...d,debts:v})} note="Car loans, credit cards — excluding future housing payment"/>
        {d.debts>500&&<Alert type="warning">High debt load ({fmt(d.debts)}/mo) will affect your DTI ratio. Consider paying down debts before buying.</Alert>}
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:8}}>
        <BtnSec onClick={onBack}>← Back</BtnSec>
        <BtnPri onClick={onNext}>Continue →</BtnPri>
      </div>
      <AcronymBar keys={["DTI","PITI","HOA","P&I","HOA"]}/>
    </div>
  );
}

function StepChecklist({data,setData,onNext,onBack}){
  const [tl,setTl]=useState("6mo");
  const [checked,setChecked]=useState({});
  const loc=data.locationInfo||{};
  const cl=generateChecklist(data,loc);
  const cur=cl[tl];
  const toggle=id=>setChecked(p=>({...p,[id]:!p[id]}));
  const done=cur.tasks.filter(t=>checked[t.id]).length;
  const timelines=[
    {id:"3mo",label:"3 months",emoji:"🚀",desc:"Final sprint"},
    {id:"6mo",label:"6 months",emoji:"🏗️",desc:"Build foundation"},
    {id:"12mo",label:"12 months",emoji:"🌱",desc:"Plant seeds"},
  ];
  return(
    <div>
      <p style={{fontSize:13,color:C.gray700,marginBottom:14,lineHeight:1.6}}>Your personalized action plan — tailored to your programs, credit score, debt load, and savings goals. Toggle between timelines below.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
        {timelines.map(t=>(
          <div key={t.id} onClick={()=>setTl(t.id)}
            style={{border:`2px solid ${tl===t.id?cl[t.id].color:C.gray300}`,borderRadius:12,padding:"10px 8px",cursor:"pointer",background:tl===t.id?cl[t.id].bg:C.white,textAlign:"center"}}>
            <div style={{fontSize:20,marginBottom:2}}>{t.emoji}</div>
            <div style={{fontSize:12,fontWeight:800,color:tl===t.id?cl[t.id].color:C.charcoal}}>{t.label}</div>
            <div style={{fontSize:10,color:C.gray500}}>{t.desc}</div>
          </div>
        ))}
      </div>
      <Card style={{borderTop:`4px solid ${cur.color}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
          <div>
            <div style={{fontSize:18,fontWeight:900,color:cur.color}}>{cur.label}</div>
            <div style={{fontSize:12,color:C.gray500,marginTop:2}}>{cur.desc}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:18,fontWeight:900,color:cur.color}}>{done}/{cur.tasks.length}</div>
            <div style={{fontSize:10,color:C.gray500}}>completed</div>
          </div>
        </div>
        <PBar value={done} max={cur.tasks.length} color={cur.color}/>
        <div style={{height:10}}/>
        {["urgent","other"].map(grp=>{
          const tasks=cur.tasks.filter(t=>(grp==="urgent")===t.urgent);
          if(!tasks.length)return null;
          return(
            <div key={grp}>
              <div style={{fontSize:10,fontWeight:700,color:grp==="urgent"?C.red:C.gray500,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6,marginTop:grp==="other"?12:0}}>
                {grp==="urgent"?"⚡ High priority":"Regular tasks"}
              </div>
              {tasks.map(task=>(
                <div key={task.id} onClick={()=>toggle(task.id)}
                  style={{display:"flex",gap:10,padding:"8px 0",borderBottom:`0.5px solid ${C.gray100}`,cursor:"pointer",alignItems:"flex-start"}}>
                  <div style={{width:20,height:20,borderRadius:4,border:`2px solid ${checked[task.id]?cur.color:C.gray300}`,background:checked[task.id]?cur.color:C.white,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                    {checked[task.id]&&<span style={{color:C.white,fontSize:12,fontWeight:900}}>✓</span>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,fontWeight:700,color:cur.color,marginBottom:1}}>{task.cat}</div>
                    <div style={{fontSize:12,color:checked[task.id]?C.gray300:C.charcoal,textDecoration:checked[task.id]?"line-through":"none",lineHeight:1.45}}>{task.text}</div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </Card>
      <BtnSec onClick={onBack}>← Back to Results</BtnSec>
      <AcronymBar keys={["DTI","MCC","DPA","FHA","VA","HUD","TSAHC","TDHCA","HYSA","FICO","AMI"]}/>
    </div>
  );
}

function StepResults({data,onBack,onNext,onRestart}){
  const [tab,setTab]=useState("summary");
  const [shareMsg,setShareMsg]=useState("");
  const [waitYr,setWaitYr]=useState(1);
  const d=data;
  const loc=d.locationInfo||{};
  const grossMo=Math.round(d.income/12);
  const k401mo=Math.round(d.k401/12),rothmo=Math.round(d.roth/12),hsamo=Math.round(d.hsa/12);
  const pretaxMo=k401mo+hsamo;
  const taxFICA=calcTax(d.income,d.k401+d.hsa);
  const taxSavMo=calcTax(d.income,0)-taxFICA;
  const trueTakeHome=grossMo-taxFICA-pretaxMo-rothmo;
  const ar=d.loanType==="fha"?6.48:d.loanType==="va"?6.17:convRate(d.score,d.dpPct);
  const dp=d.price*d.dpPct/100;
  const{programs:allP}=usePrograms(loc,d);
  const totalAssist=allP.filter(p=>d.programs.includes(p.id)).reduce((s,p)=>s+p.calc(d.price),0);
  const fhaUp=d.loanType==="fha"?(d.price-dp)*0.0175:0;
  const cashNeeded=dp+d.price*0.03+1000+fhaUp;
  const assistPrin=Math.max(0,totalAssist-cashNeeded);
  const effLoan=(d.price-dp)-assistPrin;
  const oop=Math.max(0,cashNeeded-totalAssist);
  let miMo=0;
  if(d.loanType==="fha")miMo=Math.round(effLoan*0.0055/12);
  else if(d.loanType==="conv"){const pr=d.score>=780?.002:d.score>=760?.003:d.score>=740?.004:d.score>=720?.006:.009;miMo=d.dpPct<20?Math.round(effLoan*pr/12):0;}
  const piMo=Math.round(mpi(effLoan,ar,360));
  const txMo=Math.round(d.price*0.022/12),insMo=Math.round(d.price*0.012/12);
  const piti=piMo+txMo+insMo+miMo;
  const utils=240,hoa=d.price<280000?0:d.price<340000?55:d.price<400000?120:175,maint=Math.round(d.price*.01/12);
  const housing=piti+utils+hoa+maint;
  const mccMo=d.programs.some(p=>p.includes("mcc"))?Math.round(piMo*12*.15/12):0;
  const currentRent=d.isRenting?(d.monthlyRent||0):0;
  const personal=d.groc+d.dining+d.ent+d.pcare+d.car+d.debts+(d.student||0)+d.efund+currentRent;
  const remaining=trueTakeHome-housing-personal+mccMo;
  const bufCol=remaining>=500?C.green:remaining>=100?"#92400E":C.red;
  const fe=Math.round(piti/grossMo*100),be=Math.round((piti+d.debts+(d.student||0))/grossMo*100);
  const fprice=Math.round(d.price*Math.pow(1.043,waitYr));
  const fpiti=Math.round(mpi(fprice*(1-d.dpPct/100),ar+waitYr*.1,360)+fprice*.022/12+fprice*.012/12);
  const vtype=remaining>=500?"success":remaining>=100?"warning":"danger";

  const share=()=>{
    const url=`${window.location.href.split("?")[0]}?zip=${loc.zip||""}&income=${d.income}&price=${d.price}&score=${d.score}`;
    navigator.clipboard?.writeText(url).then(()=>setShareMsg("✓ Copied!")).catch(()=>setShareMsg("Copy failed"));
    setTimeout(()=>setShareMsg(""),3000);
  };
  const download=async()=>{
    // Load logo for PDF
    let logoB64=null;
    try{
      const res=await fetch("/logo.png");
      const buf=await res.arrayBuffer();
      const bytes=new Uint8Array(buf);
      let bin="";for(let i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);
      logoB64="data:image/png;base64,"+btoa(bin);
    }catch(e){logoB64=null;}

    const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
    const W=210,M=16,CW=W-M*2;
    let y=0;

    // ── Color palette ────────────────────────────────────────────────────────
    const GRN=[27,107,68],GRNL=[232,245,238],GRNM=[74,155,111];
    const AMB=[232,160,32],AMBL=[254,243,220];
    const RED=[220,38,38],REDL=[254,226,226];
    const CHR=[44,44,44],G7=[75,85,99],G5=[107,114,128],G3=[209,213,219],G1=[243,244,246];
    const WHT=[255,255,255];

    // ── Helpers ──────────────────────────────────────────────────────────────
    const nl=(n=5)=>{y+=n;};
    const newPage=()=>{doc.addPage();y=M;};
    const safe=(n=6)=>{if(y>260){newPage();}};
    const stripEmoji=s=>String(s||"").replace(/[\uD800-\uDFFF]|️/g,"").trim();

    const fillRect=(x,ry,w,h,rgb)=>{doc.setFillColor(...rgb);doc.rect(x,ry,w,h,"F");};
    const strokeRect=(x,ry,w,h,rgb,lw=0.3)=>{doc.setDrawColor(...rgb);doc.setLineWidth(lw);doc.rect(x,ry,w,h,"S");};
    const hline=(ry,col=G3,lw=0.25)=>{doc.setDrawColor(...col);doc.setLineWidth(lw);doc.line(M,ry,W-M,ry);};

    const txt=(t,x,ry,size,rgb,style="normal",align="left")=>{
      doc.setFont("helvetica",style);doc.setFontSize(size);doc.setTextColor(...rgb);
      doc.text(String(t),x,ry,{align});
    };
    const wrap=(t,x,ry,maxW,size,rgb,style="normal",lineH=4.2)=>{
      doc.setFont("helvetica",style);doc.setFontSize(size);doc.setTextColor(...rgb);
      const lines=doc.splitTextToSize(String(t),maxW);
      doc.text(lines,x,ry);
      return lines.length*lineH;
    };

    // Labeled data row with divider
    const row=(label,val,valRgb=CHR,indent=0)=>{
      safe();
      txt(label,M+indent,y,10,G5);
      txt(val,W-M,y,10,valRgb,"bold","right");
      nl(6.5);
      hline(y);nl(1.5);
    };

    // Section header — green pill badge left, title right of it
    const sectionHead=(title,emoji="")=>{
      safe();
      if(y>M+5)nl(8);
      fillRect(M,y-4,CW,9,GRNL);
      doc.setDrawColor(...GRN);doc.setLineWidth(1);
      doc.line(M,y-4,M,y+5);
      txt((emoji?emoji+" ":"")+title,M+5,y+1,11,GRN,"bold");
      nl(10);
    };

    // Stat card — filled box with label + big value
    const statCard=(label,value,rgb=GRN,bgRgb=GRNL,x2,ry2,w2,h2=14)=>{
      fillRect(x2,ry2,w2,h2,bgRgb);
      strokeRect(x2,ry2,w2,h2,rgb,0.2);
      txt(label,x2+w2/2,ry2+4.5,9,G5,"normal","center");
      txt(value,x2+w2/2,ry2+10.5,11,rgb,"bold","center");
    };

    // ── Figma-inspired 2-column checklist row ────────────────────────────────
    // Col 1 (8mm fixed): circle checkbox, vertically centered to first text line
    // Col 2 (flex):      task text (medium weight) + category subtext (light, muted)
    const taskRow=(task,accent)=>{
      const CB_X=M+4;          // checkbox circle center-x
      const CB_W=9;            // column 1 width (mm)
      const TEXT_X=M+CB_W;    // column 2 start-x
      const TEXT_W=CW-CB_W-1; // column 2 width
      const PAD_V=4;            // vertical padding top/bottom inside row
      const LINE_H=5;          // main text line height (mm) — 10pt font
      const SUB_H=4.2;         // subtext line height — 8.5pt font

      // Pre-measure text to size the row correctly
      doc.setFont("helvetica","bold");doc.setFontSize(10);
      const mainLines=doc.splitTextToSize(String(task.text),TEXT_W);
      const rawCat=stripEmoji(task.cat);
      const subLines=rawCat?(doc.setFont("helvetica","normal"),doc.setFontSize(8.5),doc.splitTextToSize(rawCat,TEXT_W)):[];
      const mainH=mainLines.length*LINE_H;
      const subH=subLines.length>0?subLines.length*SUB_H+1.5:0;
      const rowH=mainH+subH+PAD_V*2;

      safe(rowH+4);

      // Row: alternating subtle fill + single bottom rule
      fillRect(M,y,CW,rowH,[250,251,252]);
      doc.setDrawColor(220,224,228);doc.setLineWidth(0.18);
      doc.line(M,y+rowH,M+CW,y+rowH);

      // Checkbox circle — open ring only (never pre-filled; urgent = red border, regular = slate)
      const cbCY=y+PAD_V+(LINE_H*0.65);
      doc.setDrawColor(...(task.urgent?RED:[160,168,178]));
      doc.setLineWidth(task.urgent?0.8:0.5);
      doc.circle(CB_X,cbCY,2.8,"S");

      // Main task text — 10pt bold, charcoal (urgent = red)
      doc.setFont("helvetica","bold");doc.setFontSize(10);
      doc.setTextColor(...(task.urgent?RED:CHR));
      doc.text(mainLines,TEXT_X,y+PAD_V+LINE_H*0.85);

      // Subtext (category) — 8.5pt regular, muted gray
      if(subLines.length>0){
        const subY=y+PAD_V+mainH+1.5+SUB_H*0.85;
        doc.setFont("helvetica","normal");doc.setFontSize(8.5);
        doc.setTextColor(...G5);
        doc.text(subLines,TEXT_X,subY);
      }

      y+=rowH;
    };

    // ── Add footer to every page after building ──────────────────────────────
    const addFooters=()=>{
      const pages=doc.getNumberOfPages();
      for(let i=1;i<=pages;i++){
        doc.setPage(i);
        fillRect(0,287,W,10,[248,250,252]);
        hline(287,G3,0.3);
        txt("Bread Crumbs  ·  Home Buying Financial Summary",M,292,7,G5);
        txt(`Page ${i} of ${pages}`,W-M,292,7,G5,"normal","right");
        txt(new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),W/2,292,7,G5,"normal","center");
      }
    };

    // ════════════════════════════════════════════════════════════════════════
    // PAGE 1 — COVER
    // ════════════════════════════════════════════════════════════════════════
    // Dark green header band
    fillRect(0,0,W,72,GRN);
    // Decorative accent stripe
    fillRect(0,68,W,4,GRNM);

    // Logo
    if(logoB64){
      try{doc.addImage(logoB64,"PNG",M,6,18,18);}catch(e){}
    }

    // Brand name
    txt("Bread Crumbs",M+22,14,22,WHT,"bold");
    txt("Home Buying Financial Summary",M+22,20,9,[232,245,238],"normal");

    // Date pill top-right
    const dateStr=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
    txt(dateStr,W-M,12,8,[200,230,215],"normal","right");

    // Location strip inside header
    fillRect(M,28,CW,10,[255,255,255,0.12]);
    fillRect(M,28,CW,10,[21,85,54]);
    txt(`${loc.city||""}${loc.state?", "+loc.state:""}  |  ZIP ${loc.zip||"—"}  |  ${d.isFirstTime?"First-time buyer":"Buying again"}`,M+4,34,9,[200,230,215],"normal");

    // 4 hero stat cards across the header bottom
    const cards=[
      {l:"Purchase Price",v:fmt(d.price),rgb:WHT,bg:[21,85,54]},
      {l:"You Bring to Closing",v:oop===0?"$0":fmt(oop),rgb:oop<5000?[134,239,172]:oop<20000?AMB:RED,bg:[21,85,54]},
      {l:"Monthly Housing",v:fmt(housing)+"/mo",rgb:WHT,bg:[21,85,54]},
      {l:"Monthly Buffer",v:(remaining>=0?"+":"-")+fmt(Math.abs(remaining)),rgb:remaining>=500?[134,239,172]:remaining>=0?AMB:RED,bg:[21,85,54]},
    ];
    const cw=(CW-9)/4;
    cards.forEach((c,i)=>{
      const cx=M+i*(cw+3);
      fillRect(cx,44,cw,22,c.bg);
      strokeRect(cx,44,cw,22,[255,255,255,0.2],0.2);
      txt(c.l,cx+cw/2,51,6.5,[180,220,200],"normal","center");
      txt(c.v,cx+cw/2,59,9,c.rgb,"bold","center");
    });

    y=82;

    // ── Quick snapshot grid ──────────────────────────────────────────────────
    sectionHead("At a Glance","");

    const snap2col=(items)=>{
      const half=Math.ceil(items.length/2);
      const col1=items.slice(0,half),col2=items.slice(half);
      const maxRows=Math.max(col1.length,col2.length);
      for(let i=0;i<maxRows;i++){
        safe();
        if(col1[i]){
          txt(col1[i][0],M,y,10,G5);
          txt(col1[i][1],M+CW/2-2,y,10,col1[i][2]||CHR,"bold","right");
        }
        if(col2[i]){
          txt(col2[i][0],M+CW/2+2,y,10,G5);
          txt(col2[i][1],W-M,y,10,col2[i][2]||CHR,"bold","right");
        }
        nl(5);
        if(i<maxRows-1){hline(y,G1);nl(0.5);}
      }
      nl(2);
    };

    snap2col([
      ["Gross income",fmtK(d.income)+"/yr"],
      ["Take-home (after tax & 401k)",fmt(trueTakeHome)+"/mo"],
      ["Credit score",String(d.score),d.score>=740?GRN:d.score>=680?AMB:RED],
      ["Down payment",`${fmt(dp)} (${d.dpPct}%)`],
      ["Loan type",d.loanType.toUpperCase()+" @ "+ar.toFixed(2)+"%"],
      ["Effective loan",fmt(effLoan)],
      ["Front-end DTI",fe+"%",fe<=28?GRN:RED],
      ["Back-end DTI",be+"%",be<=43?GRN:RED],
      ["Total assistance",totalAssist>0?fmt(totalAssist):"None",totalAssist>0?GRN:G5],
      ["Programs selected",String(d.programs.length)+" program"+(d.programs.length!==1?"s":"")],
    ]);

    // Programs selected list
    if(d.programs.length>0){
      safe();
      const pNames=d.programs.map(id=>allP.find(p=>p.id===id)?.name||id).join("  ·  ");
      wrap(pNames,M,y,CW,8,GRNM,"normal",4);
      nl(8);
    }

    // ════════════════════════════════════════════════════════════════════════
    // CLOSING COSTS
    // ════════════════════════════════════════════════════════════════════════
    sectionHead("Closing Cost Breakdown","");
    row("Purchase price",fmt(d.price));
    row(`Down payment (${d.dpPct}%)`,`- ${fmt(dp)}`);
    row("Base loan amount",fmt(d.price-dp));
    if(fhaUp>0)row("FHA upfront MIP (1.75%)",fmt(fhaUp),RED);
    row("Lender fees & title (~2%)",fmt(d.price*.02));
    row("Prepaid taxes & insurance (~1%)",fmt(d.price*.01));
    row("Inspection + appraisal","$1,000");
    safe();
    fillRect(M,y,CW,7,G1);
    txt("Total cash needed",M+2,y+4.5,10,CHR,"bold");
    txt(fmt(cashNeeded),W-M-2,y+4.5,10,CHR,"bold","right");
    nl(9);
    if(totalAssist>0){
      row("Assistance applied",`- ${fmt(Math.min(totalAssist,cashNeeded))}`,GRN);
      if(assistPrin>0)row("Principal buydown",`- ${fmt(assistPrin)}`,GRN);
    }
    safe();
    fillRect(M,y,CW,9,oop===0?GRNL:oop<10000?AMBL:REDL);
    txt("You bring to closing",M+2,y+5.5,10.5,oop===0?GRN:oop<10000?AMB:RED,"bold");
    txt(oop===0?"$0  (fully covered!)":fmt(oop),W-M-2,y+5.5,10.5,oop===0?GRN:oop<10000?AMB:RED,"bold","right");
    nl(13);

    // ════════════════════════════════════════════════════════════════════════
    // MONTHLY BUDGET
    // ════════════════════════════════════════════════════════════════════════
    sectionHead("Monthly Budget","");

    // Income waterfall
    txt("INCOME",M,y,9,G5,"bold");nl(5.5);
    row("Gross monthly income",fmt(grossMo),GRN);
    if(d.k401>0)row("401(k) / 403(b) pre-tax",`- ${fmt(Math.round(d.k401/12))}`,RED);
    if(d.hsa>0)row("HSA pre-tax",`- ${fmt(Math.round(d.hsa/12))}`,RED);
    row("Federal income tax + FICA",`- ${fmt(taxFICA)}`,RED);
    if(d.roth>0)row("Roth IRA (post-tax)",`- ${fmt(Math.round(d.roth/12))}`,RED);
    safe();
    fillRect(M,y,CW,7,GRNL);
    txt("True spendable take-home",M+2,y+4.5,10,GRN,"bold");
    txt(fmt(trueTakeHome)+"/mo",W-M-2,y+4.5,10,GRN,"bold","right");
    nl(11);

    txt("HOUSING",M,y,9,G5,"bold");nl(5.5);
    row(`Principal & Interest (${ar.toFixed(2)}%)`,fmt(piMo)+"/mo");
    row("Property tax (est. 2.2%/yr)",fmt(txMo)+"/mo");
    row("Homeowners insurance (est. 1.2%/yr)",fmt(insMo)+"/mo");
    if(miMo>0)row("PMI / MIP",fmt(miMo)+"/mo",RED);
    row("Utilities (estimate)","$240/mo");
    if(hoa>0)row("HOA fees",fmt(hoa)+"/mo");
    row("Maintenance reserve (1%/yr)",fmt(maint)+"/mo");
    safe();
    fillRect(M,y,CW,7,G1);
    txt("Total housing (PITI + utils + HOA)",M+2,y+4.5,10,CHR,"bold");
    txt(fmt(housing)+"/mo",W-M-2,y+4.5,10,CHR,"bold","right");
    nl(11);

    txt("LIFESTYLE",M,y,9,G5,"bold");nl(5.5);
    if(d.groc>0)row("Groceries",fmt(d.groc)+"/mo");
    if(d.dining>0)row("Dining out",fmt(d.dining)+"/mo");
    if(d.ent>0)row("Entertainment",fmt(d.ent)+"/mo");
    if(d.pcare>0)row("Personal care",fmt(d.pcare)+"/mo");
    if(d.car>0)row("Car (payment + insurance + gas)",fmt(d.car)+"/mo");
    if(d.debts>0)row("Other debts (credit cards, loans)",fmt(d.debts)+"/mo",RED);
    if(d.efund>0)row("Emergency fund contributions",fmt(d.efund)+"/mo",AMB);
    if(currentRent>0)row("Current rent (while renting)",fmt(currentRent)+"/mo");

    safe();
    const bufRgb=remaining>=500?GRN:remaining>=0?AMB:RED;
    const bufBg=remaining>=500?GRNL:remaining>=0?AMBL:REDL;
    fillRect(M,y,CW,9,bufBg);
    txt("Monthly buffer",M+2,y+5.5,10.5,bufRgb,"bold");
    txt((remaining>=0?"+ ":"")+fmt(remaining)+"/mo",W-M-2,y+5.5,10.5,bufRgb,"bold","right");
    nl(13);
    if(mccMo>0){
      safe();
      fillRect(M,y,CW,6,GRNL);
      txt("MCC tax credit (at filing)",M+2,y+3.5,10,GRN,"bold");
      txt(`+ ${fmt(mccMo*12)}/yr saved on federal taxes`,W-M-2,y+3.5,10,GRN,"bold","right");
      nl(10);
    }

    // ════════════════════════════════════════════════════════════════════════
    // WAIT VS BUY
    // ════════════════════════════════════════════════════════════════════════
    sectionHead("Wait vs. Buy Analysis","");
    const fp1=Math.round(d.price*Math.pow(1.043,1));
    const fp1i=Math.round(mpi(fp1*(1-d.dpPct/100),ar+.1,360)+fp1*.022/12+fp1*.012/12);
    const colW=(CW-4)/2;
    safe();
    // Side-by-side comparison boxes
    fillRect(M,y,colW,36,GRNL);strokeRect(M,y,colW,36,GRN,0.4);
    txt("BUY NOW",M+colW/2,y+6,9,GRN,"bold","center");
    txt(fmt(d.price),M+colW/2,y+14,13,GRN,"bold","center");
    txt("P&I: "+fmt(piMo)+"/mo",M+colW/2,y+21,9,GRNM,"normal","center");
    txt("Rate: "+ar.toFixed(2)+"%",M+colW/2,y+27,9,GRNM,"normal","center");
    txt("Today's opportunity",M+colW/2,y+33,8,[100,170,130],"normal","center");

    const bx=M+colW+4;
    fillRect(bx,y,colW,36,REDL);strokeRect(bx,y,colW,36,RED,0.4);
    txt("WAIT 1 YEAR",bx+colW/2,y+6,9,RED,"bold","center");
    txt(fmt(fp1),bx+colW/2,y+14,13,RED,"bold","center");
    txt("P&I: "+fmt(fp1i)+"/mo",bx+colW/2,y+21,9,RED,"normal","center");
    txt("Rate: ~"+(ar+.1).toFixed(2)+"%",bx+colW/2,y+27,9,RED,"normal","center");
    txt("+ "+fmt(fp1-d.price)+" more",bx+colW/2,y+33,8,[200,60,60],"normal","center");
    nl(40);

    row("Monthly payment increase if you wait",`+ ${fmt(fp1i-piMo)}/mo`,RED);
    row("Price increase if you wait",`+ ${fmt(fp1-d.price)}`,RED);
    row(d.isRenting?`Rent paid while waiting (${fmt(d.monthlyRent)}/mo)`:"Est. rent while waiting",`- ${fmt(12*(d.isRenting?d.monthlyRent:1500))}`,RED);
    row("Equity you build by buying now",`+ ${fmtK(piMo*12*.25)} in Year 1`,GRN);

    // ════════════════════════════════════════════════════════════════════════
    // NEIGHBORHOODS
    // ════════════════════════════════════════════════════════════════════════
    const hoods=getNeighborhoods(loc.city);
    if(hoods){
      sectionHead(`Neighborhood Guide — ${loc.city}`,"");
      hoods.forEach((h,i)=>{
        safe();
        const schoolColor=h.schools>=8?GRN:h.schools>=6?AMB:RED;
        fillRect(M,y-1,CW,5,i%2===0?G1:[248,250,252]);
        txt(h.name,M+2,y+2.5,10,CHR,"bold");
        txt(`Schools: ${h.schools}/10`,W-M-2,y+2.5,10,schoolColor,"bold","right");
        nl(6);
        txt(`${h.medianPrice}  |  ${h.commute}`,M+2,y,9,G5,"normal");
        nl(5);
        const lh=wrap(h.notes,M+2,y,CW-4,9,G7,"normal",4.2);
        nl(lh+3);
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // CLIMATE RISK
    // ════════════════════════════════════════════════════════════════════════
    const climate=getClimate(loc.state);
    if(climate){
      sectionHead(`Climate Risk — ${loc.state}`,"");
      wrap(`Always verify flood zone at msc.fema.gov for ZIP ${loc.zip||"your area"} before purchasing. Get insurance quotes before making any offer.`,M,y,CW,10,AMB,"normal",4.8);
      nl(10);
      const riskColor=(r)=>r==="Extreme"||r==="Very High"?RED:r==="High"?AMB:r==="Moderate"||r==="Low-Moderate"?GRNM:GRN;
      const riskBg=(r)=>r==="Extreme"||r==="Very High"?REDL:r==="High"?AMBL:GRNL;
      Object.entries(climate).filter(([,v])=>v.risk!=="None").forEach(([key,val])=>{
        safe();
        fillRect(M,y-1,CW,6,riskBg(val.risk));
        txt(`${key.charAt(0).toUpperCase()+key.slice(1)} Risk`,M+2,y+3,10,riskColor(val.risk),"bold");
        txt(val.risk,W-M-2,y+3,10,riskColor(val.risk),"bold","right");
        nl(7);
        const lh=wrap(val.detail,M+2,y,CW-4,9,G7,"normal",4.2);
        nl(lh+4);
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // ACTION PLAN — all 3 timelines
    // ════════════════════════════════════════════════════════════════════════
    const cl=generateChecklist(d,loc);
    const tlColors={
      "3mo":RED,
      "6mo":AMB,
      "12mo":GRN,
    };
    const tlBg={
      "3mo":REDL,
      "6mo":AMBL,
      "12mo":GRNL,
    };
    ["3mo","6mo","12mo"].forEach(tlKey=>{
      const cur=cl[tlKey];
      const accent=tlColors[tlKey];
      const bg=tlBg[tlKey];
      safe();
      fillRect(0,y-2,W,10,bg);
      doc.setDrawColor(...accent);doc.setLineWidth(1.5);doc.line(0,y-2,0,y+8);
      txt(cur.label,M,y+4,11,accent,"bold");
      txt(cur.desc,W-M,y+4,9,G5,"normal","right");
      nl(14);

      const urgentTasks=cur.tasks.filter(t=>t.urgent);
      const otherTasks=cur.tasks.filter(t=>!t.urgent);

      if(urgentTasks.length){
        safe();
        // Priority group label — pill badge style
        fillRect(M,y,32,5.5,REDL);
        txt("PRIORITY",M+3,y+3.8,6.5,RED,"bold");
        nl(8);
        urgentTasks.forEach(task=>taskRow(task,RED));
        nl(3);
      }

      if(otherTasks.length){
        safe();
        fillRect(M,y,22,5.5,G1);
        txt("TO DO",M+3,y+3.8,6.5,G7,"bold");
        nl(8);
        otherTasks.forEach(task=>taskRow(task,[180,186,194]));
      }
      nl(6);
    });

    // ════════════════════════════════════════════════════════════════════════
    // NEGOTIATION GUIDE
    // ════════════════════════════════════════════════════════════════════════
    sectionHead("Negotiation Guide","");
    wrap("Everything below is negotiable — most buyers leave money on the table by not asking. Your agent works for you; these are the levers you control.",M,y,CW,10,G7,"normal",4.8);
    nl(12);

    const negSections=[
      {title:"Purchase Price",items:[
        "List price is a starting point, not the final number. Comparable sales (comps) determine market value.",
        "In a buyer's market: offer 3–8% below list. In a hot market: offer at or above list.",
        `At ${fmt(d.price)} list, a 3% reduction saves you ${fmt(d.price*.03)} upfront.`,
        "Ask your agent to pull comps from the past 90 days within a 0.5-mile radius before writing any offer.",
      ]},
      {title:"Seller Concessions (Closing Costs)",items:[
        "You can ask the seller to pay some or all of your closing costs — called a seller concession.",
        `Closing costs on a ${fmt(d.price)} home run ~${fmt(d.price*.03)}. Asking for 2–3% concession is common.`,
        "FHA allows up to 6% in seller concessions. Conventional allows up to 3% (under 10% down) or 9% (10%+ down).",
        "Framing it as 'net price' works better than asking for a discount — seller nets the same, you get cash at closing.",
      ]},
      {title:"Repairs After Inspection",items:[
        "After the inspection, you can request repairs, a price reduction, or a repair credit at closing.",
        "Repair credits are often better — you control the contractor and the quality of work.",
        "Focus on health/safety issues (roof, electrical, plumbing, HVAC) — not cosmetic items.",
        "If the seller won't budge on repairs, factor the repair cost into your offer price.",
      ]},
      {title:"Closing Date & Possession",items:[
        "Sellers often value a flexible closing date as much as a higher price.",
        "If a seller needs more time, offer a leaseback — they rent from you post-closing.",
        "If you need speed, a 21-day close can beat a higher offer from a buyer needing 45 days.",
        "If the seller wants 30–60 days post-close possession, charge fair market rent.",
      ]},
      {title:"Home Warranty",items:[
        "Ask the seller to provide a 1-year home warranty ($400–700). Low cost to them, high value to you.",
        "Covers HVAC, plumbing, electrical, and appliances for the first year — when surprises are most likely.",
        "If they decline, ask your agent to cover it as a buyer's closing gift — many do.",
      ]},
      {title:"Appliances & Fixtures",items:[
        "Permanently attached items (built-in appliances, light fixtures, blinds) convey with the home by default.",
        "Freestanding appliances (washer, dryer, fridge) do NOT transfer unless you ask.",
        "Ask for everything you want in writing in the contract. Verbal agreements don't hold.",
        "If the seller won't leave the fridge, ask for a $500–800 appliance credit instead.",
      ]},
      {title:"Earnest Money Deposit",items:[
        "Earnest money (1–3% of price) shows commitment. The amount is negotiable.",
        "Make sure your contract has strong contingencies: financing, inspection, and appraisal.",
        "An appraisal contingency protects you if the home appraises below purchase price.",
        "In a competitive market, a larger EMD (3%+) signals seriousness without raising your offer price.",
      ]},
      {title:"Rate Buydown (Seller-Paid Points)",items:[
        "Ask the seller to pay points to permanently or temporarily buy down your interest rate.",
        `At ${ar.toFixed(2)}%, buying down 0.5% costs ~${fmt(d.price*.01)} and saves ~${fmt(Math.round(mpi(effLoan,ar-.5,360)-mpi(effLoan,ar,360)))}/mo for the life of the loan.`,
        "A 2-1 buydown costs ~2–3% of the loan — sellers sometimes pay this to close a deal.",
        "Most powerful in a high-rate environment where buyers are rate-sensitive.",
      ]},
      {title:"HOA & Transfer Fees",items:[
        "HOA transfer fees ($200–500+) are negotiable — ask the seller to pay them.",
        "Review the HOA's financials and reserve fund before closing. Underfunded HOAs lead to special assessments.",
        "Ask for all HOA docs (CC&Rs, bylaws, meeting minutes, financials) at least 7 days before closing.",
        "Pending litigation or deferred maintenance is a negotiating point on price.",
      ]},
    ];

    negSections.forEach((sec,si)=>{
      safe();
      fillRect(M,y-1,CW,6,si%2===0?G1:[248,250,252]);
      doc.setDrawColor(...GRN);doc.setLineWidth(0.8);doc.line(M,y-1,M,y+5);
      txt(sec.title,M+4,y+3,10,CHR,"bold");
      nl(8);
      sec.items.forEach(item=>{
        safe();
        // Bullet dot positioned at the hanging indent column
        doc.setFillColor(...GRNM);doc.circle(M+3,y-0.5,1.2,"F");
        // Text starts at M+8, maxW shrinks accordingly so wrapped lines stay aligned
        const lh=wrap(item,M+8,y,CW-10,10,G7,"normal",4.8);
        nl(lh+3);
      });
      nl(3);
    });

    addFooters();
    doc.save(`breadcrumbs-${loc.zip||"report"}.pdf`);
  };

  const TABS=[{id:"summary",l:"Summary"},{id:"closing",l:"Closing"},{id:"monthly",l:"Monthly"},{id:"wait",l:"Wait vs Buy"},{id:"areas",l:"📍 Areas"},{id:"climate",l:"🌍 Climate"},{id:"negotiable",l:"🤝 Negotiate"}];

  return(
    <div>
      <div style={{background:`linear-gradient(135deg,${C.green},${C.greenMid})`,borderRadius:16,padding:"20px 16px",marginBottom:12,color:C.white}}>
        <div style={{fontSize:13,fontWeight:600,opacity:.85,marginBottom:4}}>{loc.city||"Your area"}{loc.state?", "+loc.state:""} · ZIP {loc.zip||"—"}</div>
        <div style={{fontSize:30,fontWeight:900,marginBottom:2}}>{fmt(d.price)}</div>
        <div style={{fontSize:13,opacity:.85}}>{d.loanType.toUpperCase()} · {ar.toFixed(2)}% · {fmtK(effLoan)} effective loan</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:12}}>
          {[{l:"To closing",v:oop===0?"$0 🎉":fmt(oop)},{l:"PITI/mo",v:fmt(piti)},{l:"True monthly",v:fmt(housing)}].map(m=>(
            <div key={m.l} style={{background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
              <div style={{fontSize:10,opacity:.8,marginBottom:2}}>{m.l}</div>
              <div style={{fontSize:15,fontWeight:900}}>{m.v}</div>
            </div>
          ))}
        </div>
      </div>

      <Alert type={vtype}>
        {remaining>=500&&<span>✓ <strong>Solid picture.</strong> After all expenses you keep <strong>{fmt(remaining)}/mo</strong>. Back-end DTI {be}% — lenders approve up to 43%.</span>}
        {remaining>=100&&remaining<500&&<span>⚠ <strong>Tight but workable.</strong> About <strong>{fmt(remaining)}/mo</strong> buffer. Stack more programs or lower the price $10–20K.</span>}
        {remaining<100&&<span>✗ <strong>Too tight.</strong> {remaining<0?fmt(Math.abs(remaining))+" shortfall/mo — ":"Nearly nothing left — "}lower price, add more programs, or reduce other debts.</span>}
      </Alert>

      <div style={{display:"flex",gap:6,overflowX:"auto",padding:"8px 0 4px",marginBottom:10}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"6px 14px",borderRadius:99,border:`1.5px solid ${tab===t.id?C.green:C.gray300}`,background:tab===t.id?C.green:C.white,color:tab===t.id?C.white:C.gray700,fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
            {t.l}
          </button>
        ))}
      </div>

      {tab==="summary"&&(
        <Card>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:12}}>
            <BigNum label="Gross monthly" value={fmt(grossMo)} sub={fmtK(d.income)+"/yr"}/>
            <BigNum label="Take-home" value={fmt(trueTakeHome)} sub="after tax + retirement"/>
            <BigNum label="Housing cost" value={fmt(housing)} sub={Math.round(housing/grossMo*100)+"% of gross"} color={Math.round(housing/grossMo*100)>35?C.red:C.green} bg={Math.round(housing/grossMo*100)>35?C.redLight:C.greenPale}/>
            <BigNum label="Buffer" value={remaining>=0?fmt(remaining):"- "+fmt(Math.abs(remaining))} sub={remaining<0?"shortfall":"left over"} color={bufCol} bg={remaining>=500?C.greenPale:remaining>=100?C.amberLight:C.redLight}/>
          </div>
          <InfoRow label="Front-end DTI" value={fe+"% "+(fe<=28?"✓":"⚠")} valueColor={fe<=28?C.green:C.red}/>
          <InfoRow label="Back-end DTI" value={be+"% "+(be<=43?"✓":"✗")} valueColor={be<=43?C.green:C.red}/>
          <InfoRow label="Retirement savings" value={fmt(k401mo+rothmo+hsamo)+"/mo"} valueColor={C.amber}/>
          <InfoRow label="Tax savings (pre-tax)" value={"+ "+fmt(taxSavMo)+"/mo"} valueColor={C.green}/>
          {mccMo>0&&<InfoRow label="MCC tax credit" value={"+ "+fmt(mccMo*12)+"/yr"} valueColor={C.green}/>}
          {totalAssist>0&&<InfoRow label="Total assistance stacked" value={fmt(totalAssist)} valueColor={C.green}/>}
        </Card>
      )}

      {tab==="closing"&&(
        <Card>
          <SecTitle>Loan flow</SecTitle>
          <div style={{border:`1px solid ${C.gray300}`,borderRadius:10,padding:"10px 12px",marginBottom:6}}>
            <div style={{fontSize:11,color:C.gray500,fontWeight:600}}>Purchase price</div>
            <div style={{fontSize:18,fontWeight:900}}>{fmt(d.price)}</div>
          </div>
          <div style={{fontSize:12,color:C.gray500,padding:"3px 0 3px 8px"}}>↓ Down payment ({d.dpPct}%): <strong>{fmt(dp)}</strong></div>
          <div style={{border:`1px solid ${C.gray300}`,borderRadius:10,padding:"10px 12px",marginBottom:6}}>
            <div style={{fontSize:11,color:C.gray500,fontWeight:600}}>Base loan</div>
            <div style={{fontSize:16,fontWeight:900}}>{fmt(d.price-dp)}</div>
            <div style={{fontSize:11,color:C.gray500}}>What your lender approves against</div>
          </div>
          {totalAssist>0&&<>
            <div style={{fontSize:12,color:C.gray500,padding:"3px 0 3px 8px"}}>↓ Assistance covers cash at closing: <strong style={{color:C.green}}>- {fmt(Math.min(totalAssist,cashNeeded))}</strong></div>
            {assistPrin>0&&<div style={{fontSize:12,color:C.gray500,padding:"3px 0 3px 8px"}}>↓ Surplus reduces principal: <strong style={{color:C.green}}>- {fmt(assistPrin)}</strong></div>}
          </>}
          <div style={{border:`2px solid ${assistPrin>0?C.green:C.gray300}`,borderRadius:10,padding:"12px",background:assistPrin>0?C.greenLight:C.white,marginBottom:12}}>
            <div style={{fontSize:11,color:assistPrin>0?C.green:C.gray500,fontWeight:700}}>✓ Effective loan — P&I is based on this</div>
            <div style={{fontSize:22,fontWeight:900,color:assistPrin>0?C.green:C.charcoal}}>{fmt(effLoan)}</div>
            {assistPrin>0&&<div style={{fontSize:11,color:C.greenMid}}>Reduced from {fmt(d.price-dp)} by {fmt(assistPrin)} principal buydown</div>}
          </div>
          <InfoRow label="Down payment" value={fmt(dp)}/>
          {fhaUp>0&&<InfoRow label="FHA upfront MIP (1.75%)" value={fmt(fhaUp)} valueColor={C.red}/>}
          <InfoRow label="Lender fees & title (~2%)" value={fmt(d.price*.02)}/>
          <InfoRow label="Prepaid taxes & insurance (~1%)" value={fmt(d.price*.01)}/>
          <InfoRow label="Inspection + appraisal" value="$1,000"/>
          <InfoRow label="Total cash needed" value={fmt(cashNeeded)} bold topBorder/>
          {totalAssist>0&&<InfoRow label="Assistance applied" value={"- "+fmt(Math.min(totalAssist,cashNeeded))} valueColor={C.green}/>}
          {assistPrin>0&&<InfoRow label="Principal buydown" value={"- "+fmt(assistPrin)} valueColor={C.green}/>}
          <InfoRow label="You bring to closing" value={fmt(oop)} valueColor={oop<2000?C.green:oop<10000?"#92400E":C.red} bold topBorder/>
        </Card>
      )}

      {tab==="monthly"&&(
        <Card>
          <SecTitle>Paycheck flow</SecTitle>
          {[{l:"Gross monthly",v:fmt(grossMo),c:C.green},{l:"401(k) pre-tax",v:"- "+fmt(k401mo),c:C.red},{l:"HSA pre-tax",v:"- "+fmt(hsamo),c:C.red},{l:"Federal tax + FICA",v:"- "+fmt(taxFICA),c:C.red}].map((r,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`0.5px solid ${C.gray100}`,fontSize:12}}>
              <span style={{color:C.gray700}}>{r.l}</span><span style={{fontWeight:700,color:r.c}}>{r.v}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0 3px",borderTop:`1px solid ${C.gray300}`,marginTop:4,fontSize:13,fontWeight:800,color:C.green}}>
            <span>Net take-home</span><span>{fmt(grossMo-taxFICA-pretaxMo)}/mo</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`0.5px solid ${C.gray100}`,fontSize:12,color:C.gray700}}>
            <span>Roth IRA (post-tax)</span><span style={{fontWeight:700,color:C.red}}>- {fmt(rothmo)}/mo</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0 12px",borderTop:`1px solid ${C.gray300}`,marginTop:4,fontSize:14,fontWeight:900,color:C.green}}>
            <span>True spendable take-home</span><span>{fmt(trueTakeHome)}/mo</span>
          </div>
          {[[`P&I (${fmt(effLoan)} @ ${ar.toFixed(2)}%)`,piMo],["Property tax (2.2%)",txMo],["Insurance (1.2%)",insMo],["PMI / MIP",miMo],["Utilities (est.)",utils],["HOA + Maintenance",hoa+maint],["Groceries",d.groc],["Dining out",d.dining],["Entertainment",d.ent],["Personal care",d.pcare],["Car",d.car],["Other debts",d.debts],["Student loans",d.student||0],["Emergency fund",d.efund],["Retirement (all)",k401mo+rothmo+hsamo],d.isRenting?["Current rent (while renting)",currentRent]:null].filter(r=>r&&r[1]>0).map((r,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:`0.5px solid ${C.gray100}`,fontSize:12}}>
              <span style={{color:C.gray700}}>{r[0]}</span><span style={{fontWeight:600}}>{fmt(r[1])}/mo</span>
            </div>
          ))}
          {mccMo>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:`0.5px solid ${C.gray100}`,fontSize:12}}>
            <span style={{color:C.green}}>MCC credit (at tax time)</span><span style={{fontWeight:600,color:C.green}}>+ {fmt(mccMo*12)}/yr</span>
          </div>}
          <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0 0",borderTop:`2px solid ${C.charcoal}`,fontSize:14,fontWeight:900,marginTop:8}}>
            <span>Monthly buffer</span><span style={{color:bufCol}}>{remaining>=0?fmt(remaining):"⚠ - "+fmt(Math.abs(remaining))}</span>
          </div>
        </Card>
      )}

      {tab==="wait"&&(
        <Card>
          <SecTitle>What if I wait?</SecTitle>
          <Slider label="Years to wait" min={1} max={5} step={1} value={waitYr} onChange={setWaitYr} display={waitYr+(waitYr===1?" year":" years")} note="Based on 4.3% average annual appreciation"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            <div style={{background:C.greenLight,borderRadius:12,padding:12,textAlign:"center"}}>
              <div style={{fontSize:10,color:C.greenMid,fontWeight:700,marginBottom:3}}>BUY NOW</div>
              <div style={{fontSize:18,fontWeight:900,color:C.green}}>{fmt(d.price)}</div>
              <div style={{fontSize:11,color:C.greenMid}}>P&I: {fmt(piMo)}/mo</div>
              <div style={{fontSize:11,color:C.greenMid}}>Rate: {ar.toFixed(2)}%</div>
            </div>
            <div style={{background:C.redLight,borderRadius:12,padding:12,textAlign:"center"}}>
              <div style={{fontSize:10,color:C.red,fontWeight:700,marginBottom:3}}>WAIT {waitYr}yr</div>
              <div style={{fontSize:18,fontWeight:900,color:C.red}}>{fmt(fprice)}</div>
              <div style={{fontSize:11,color:C.red}}>P&I: {fmt(fpiti)}/mo</div>
              <div style={{fontSize:11,color:C.red}}>Rate: ~{(ar+waitYr*.1).toFixed(2)}%</div>
            </div>
          </div>
          <InfoRow label="Price increase" value={"+ "+fmt(fprice-d.price)} valueColor={C.red}/>
          <InfoRow label="Monthly P&I increase" value={"+ "+fmt(fpiti-piMo)+"/mo"} valueColor={C.red}/>
          <InfoRow label={d.isRenting?`Your rent paid while waiting (${fmt(d.monthlyRent)}/mo)`:"Estimated rent if you start renting ($1,500/mo)"} value={"- "+fmt(waitYr*12*(d.isRenting?d.monthlyRent:1500))} valueColor={C.red}/>
          <InfoRow label="Equity built buying now" value={"+ "+fmtK(piMo*waitYr*12*.25)} valueColor={C.green}/>
          <Alert type={fpiti-piMo>200?"danger":"warning"}>
            Waiting {waitYr} year{waitYr>1?"s":""} could cost <strong>{fmt(fpiti-piMo)}/mo more</strong> in payments and <strong>{fmt(fprice-d.price)}</strong> more in price.
          </Alert>
        </Card>
      )}

      {tab==="areas"&&(()=>{
        const hoods=getNeighborhoods(loc.city);
        const crime=getCrime(loc.city);
        // Filter neighborhoods that fit the user's budget (price ± 25%) — for "recommended outside your zip"
        const priceNum=p=>parseInt((p||"$0").replace(/[^0-9]/g,""))*1000;
        const budgetHoods=hoods?hoods.filter(h=>{const mp=priceNum(h.medianPrice);return mp>0&&mp<=d.price*1.25&&mp>=d.price*.6;}).sort((a,b)=>b.schools-a.schools):[];
        const topPicks=budgetHoods.slice(0,3);
        return(
          <div>
            {/* School ratings for this zip */}
            <div style={{background:C.blueLight,borderRadius:12,padding:"12px 14px",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:800,color:C.blue,marginBottom:4}}>🎓 School ratings for ZIP {loc.zip}</div>
              <div style={{fontSize:11,color:C.charcoal,lineHeight:1.6,marginBottom:8}}>
                School quality varies by individual school, not just zip code. Use these official sources to look up schools near your specific address:
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                <a href={`https://nces.ed.gov/ccd/schoolsearch/school_list.asp?Search=1&Zip=${loc.zip}&Radius=5`} target="_blank" rel="noreferrer"
                  style={{background:"rgba(255,255,255,0.75)",borderRadius:8,padding:"8px 10px",textDecoration:"none",display:"block"}}>
                  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
                    <span style={{fontSize:8,fontWeight:900,background:C.blue,color:C.white,padding:"1px 5px",borderRadius:3}}>.GOV</span>
                    <span style={{fontSize:10,fontWeight:800,color:C.blue}}>NCES School Finder →</span>
                  </div>
                  <div style={{fontSize:9,color:C.gray500}}>Federal database — all public schools within 5 miles of ZIP {loc.zip}</div>
                </a>
                <a href={`https://www.greatschools.org/search/search.page?location=${loc.zip}`} target="_blank" rel="noreferrer"
                  style={{background:"rgba(255,255,255,0.75)",borderRadius:8,padding:"8px 10px",textDecoration:"none",display:"block"}}>
                  <span style={{fontSize:10,fontWeight:800,color:C.blue,display:"block",marginBottom:2}}>GreatSchools.org →</span>
                  <div style={{fontSize:9,color:C.gray500}}>Ratings, reviews & test scores for schools near ZIP {loc.zip}</div>
                </a>
              </div>
            </div>

            <CrimeCard crime={crime} city={loc.city} zip={loc.zip}/>

            {/* Recommended neighborhoods that fit the budget */}
            {topPicks.length>0&&(
              <div style={{marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:800,color:C.charcoal,marginBottom:4}}>⭐ Top picks for your budget near {loc.city}</div>
                <div style={{fontSize:10,color:C.gray500,marginBottom:8}}>Areas within or near your {fmt(d.price)} target — ranked by school rating:</div>
                {topPicks.map((h,i)=>(
                  <div key={i} style={{background:i===0?C.greenLight:C.white,borderRadius:12,padding:"12px 14px",marginBottom:8,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:i===0?`2px solid ${C.green}`:"1px solid "+C.gray100}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        {i===0&&<span style={{fontSize:10,fontWeight:800,background:C.amber,color:C.white,padding:"2px 7px",borderRadius:99}}>Best fit</span>}
                        <span style={{fontSize:14,fontWeight:800,color:C.charcoal}}>{h.name}</span>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:12,fontWeight:900,color:C.green}}>Schools {h.schools}/10</div>
                        <div style={{fontSize:9,color:C.gray500}}>{"★".repeat(Math.round(h.schools/2))}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,marginBottom:5,flexWrap:"wrap"}}>
                      <span style={{fontSize:11,fontWeight:700,color:C.charcoal,background:C.gray100,padding:"2px 8px",borderRadius:99}}>🏷️ {h.medianPrice}</span>
                      <span style={{fontSize:11,color:C.gray700,background:C.gray100,padding:"2px 8px",borderRadius:99}}>🚗 {h.commute}</span>
                    </div>
                    <div style={{fontSize:11,color:C.gray500,lineHeight:1.5}}>{h.notes}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Full neighborhood list */}
            {hoods?(
              <div>
                <div style={{fontSize:12,fontWeight:700,color:C.charcoal,marginBottom:10}}>📍 All neighborhoods in {loc.city}:</div>
                {hoods.map((h,i)=>(
                  <div key={i} style={{background:C.white,borderRadius:12,padding:"12px 14px",marginBottom:8,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                      <span style={{fontSize:14,fontWeight:800,color:C.charcoal}}>{h.name}</span>
                      <span style={{fontSize:11,fontWeight:700,color:C.green}}>Schools {h.schools}/10</span>
                    </div>
                    <div style={{display:"flex",gap:8,marginBottom:5,flexWrap:"wrap"}}>
                      <span style={{fontSize:11,fontWeight:700,color:C.charcoal,background:C.gray100,padding:"2px 8px",borderRadius:99}}>🏷️ {h.medianPrice}</span>
                      <span style={{fontSize:11,color:C.gray700,background:C.gray100,padding:"2px 8px",borderRadius:99}}>🚗 {h.commute}</span>
                    </div>
                    <div style={{fontSize:11,color:C.gray500,lineHeight:1.5}}>{h.notes}</div>
                  </div>
                ))}
                <Alert type="info">School ratings are estimates. Use NCES.ed.gov (official) or GreatSchools.org to verify individual schools near your target address.</Alert>
              </div>
            ):(
              <Alert type="info">Detailed neighborhood data isn't available for {loc.city||"your area"} yet. Use the school links above and search your city on Niche.com for neighborhood guides.</Alert>
            )}
          </div>
        );
      })()}

      {tab==="climate"&&(
        <div>
          <ClimateCard climate={getClimate(loc.state)} state={loc.state} zip={loc.zip}/>
          <Alert type="warning" style={{marginTop:8}}>
            Climate risk directly affects your insurance costs, mortgage qualification, and resale value.
            Always get flood <em>and</em> windstorm insurance quotes <strong>before making an offer</strong> — in some zip codes the cost makes an otherwise affordable home unaffordable.
          </Alert>
        </div>
      )}

      {tab==="negotiable"&&(
        <div>
          <Alert type="info">Everything below is negotiable — most buyers leave money on the table by not asking. Your agent works for you; these are the levers you control.</Alert>
          {[
            {emoji:"💰",title:"Purchase Price",items:[
              "List price is a starting point, not the final number. Comparable sales (comps) determine market value.",
              "In a buyer's market: offer 3–8% below list. In a hot market: offer at or above list.",
              `At ${fmt(d.price)} list, a 3% reduction saves you ${fmt(d.price*.03)} upfront.`,
              "Ask your agent to pull comps from the past 90 days within a 0.5-mile radius before writing any offer.",
            ]},
            {emoji:"🏷️",title:"Seller Concessions (Closing Costs)",items:[
              "You can ask the seller to pay some or all of your closing costs — called a seller concession.",
              `Closing costs on a ${fmt(d.price)} home run ~${fmt(d.price*.03)}. Asking for 2–3% concession is common.`,
              "FHA allows up to 6% in seller concessions. Conventional allows up to 3% (under 10% down) or 9% (10%+ down).",
              "Framing it as 'net price' works better than asking for a discount — seller nets the same, you get cash at closing.",
            ]},
            {emoji:"🔧",title:"Repairs After Inspection",items:[
              "After the inspection, you can request repairs, a price reduction, or a repair credit at closing.",
              "Repair credits are often better — you control the contractor and the quality of work.",
              "Focus on health/safety issues (roof, electrical, plumbing, HVAC) — not cosmetic items.",
              "If the seller won't budge on repairs, that's a data point: factor the repair cost into your offer price.",
            ]},
            {emoji:"📅",title:"Closing Date & Possession",items:[
              "Sellers often value a flexible closing date as much as a higher price.",
              "If a seller needs more time, offer a leaseback (they rent from you post-closing) — it can make your offer win without raising price.",
              "If you need speed, a 21-day close can beat a higher offer from a buyer needing 45 days.",
              "Possession at closing is standard. If the seller wants 30–60 days post-close, charge fair market rent.",
            ]},
            {emoji:"🛡️",title:"Home Warranty",items:[
              "Ask the seller to provide a 1-year home warranty ($400–700). It's low cost to them, high value to you.",
              "Covers HVAC, plumbing, electrical, and appliances for the first year — when surprises are most likely.",
              "If they decline, ask your agent to cover it as a buyer's closing gift — many do.",
            ]},
            {emoji:"🛋️",title:"Appliances & Fixtures",items:[
              "In Texas, anything permanently attached (built-in appliances, light fixtures, blinds) conveys with the home by default.",
              "Freestanding appliances (washer, dryer, fridge) do NOT transfer unless you ask.",
              "Ask for everything you want in writing in the contract. Verbal agreements don't hold.",
              "If the seller won't leave the fridge, ask for a $500–800 appliance credit instead.",
            ]},
            {emoji:"💵",title:"Earnest Money Deposit",items:[
              "Earnest money (1–3% of price) shows commitment. The amount is negotiable — as is what triggers its return.",
              "Make sure your contract has strong contingencies: financing contingency, inspection contingency, and appraisal contingency.",
              "An appraisal contingency protects you if the home appraises below purchase price.",
              "In a competitive market, a larger EMD (3%+) signals seriousness without raising your offer price.",
            ]},
            {emoji:"📉",title:"Rate Buydown (Seller-Paid Points)",items:[
              "Ask the seller to pay points to permanently or temporarily buy down your interest rate.",
              `At ${ar.toFixed(2)}%, buying down 0.5% costs ~${fmt(d.price*.01)} and saves ~${fmt(Math.round(mpi(effLoan,ar-.5,360)-mpi(effLoan,ar,360)))}/mo for the life of the loan.`,
              "A 2-1 buydown (rate is 2% lower year 1, 1% lower year 2, then full rate) costs ~2–3% of loan — sellers sometimes pay this to close a deal.",
              "This is most powerful in a high-rate environment where buyers are rate-sensitive.",
            ]},
            {emoji:"🏘️",title:"HOA & Transfer Fees",items:[
              "HOA transfer fees ($200–500+) are negotiable — ask the seller to pay them.",
              "Review the HOA's financials and reserve fund before closing. Underfunded HOAs lead to special assessments.",
              "Ask for all HOA docs (CC&Rs, bylaws, meeting minutes, financials) at least 7 days before closing.",
              "If the HOA has pending litigation or deferred maintenance, that's a negotiating point on price.",
            ]},
          ].map(section=>(
            <Card key={section.title}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{fontSize:20}}>{section.emoji}</span>
                <div style={{fontSize:14,fontWeight:800,color:C.charcoal}}>{section.title}</div>
              </div>
              {section.items.map((item,i)=>(
                <div key={i} style={{display:"flex",gap:8,padding:"5px 0",borderBottom:i<section.items.length-1?`0.5px solid ${C.gray100}`:"none"}}>
                  <span style={{color:C.green,fontWeight:900,flexShrink:0,marginTop:1}}>·</span>
                  <span style={{fontSize:12,color:C.charcoal,lineHeight:1.55}}>{item}</span>
                </div>
              ))}
            </Card>
          ))}
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
        <button onClick={share} style={{padding:12,borderRadius:12,border:`2px solid ${C.green}`,background:C.white,color:C.green,fontSize:13,fontWeight:700,cursor:"pointer"}}>
          {shareMsg||"🔗 Share"}
        </button>
        <button onClick={download} style={{padding:12,borderRadius:12,border:"none",background:C.green,color:C.white,fontSize:13,fontWeight:700,cursor:"pointer"}}>
          ⬇️ Download
        </button>
      </div>
      <AcronymBar keys={["PITI","P&I","DTI","PMI","MIP","MCC","DPA","FHA","VA","HOA","AMI","FEMA","UCR","GNND"]}/>
      <div style={{marginTop:8}}><BtnPri onClick={onNext}>See my action plan ✅</BtnPri></div>
      <div style={{marginTop:8}}><BtnSec onClick={onBack}>← Edit budget</BtnSec></div>
      <div style={{textAlign:"center",marginTop:10,fontSize:11,color:C.gray500}}>
        <span onClick={onRestart} style={{color:C.green,fontWeight:700,cursor:"pointer"}}>Start over →</span>
      </div>
    </div>
  );
}

function StepUnderwriting({data,onNext,onBack}){
  const d=data;
  const loc=d.locationInfo||{};
  const grossMo=Math.round((d.income+(d.alimony||0))/12);
  const{programs:allP}=usePrograms(loc,d);
  const totalAssist=allP.filter(p=>d.programs.includes(p.id)).reduce((s,p)=>s+p.calc(d.price),0);
  const dp=d.price*d.dpPct/100;
  const fhaUp=d.loanType==="fha"?(d.price-dp)*0.0175:0;
  const cashNeeded=dp+d.price*0.03+1000+fhaUp;
  const assistPrin=Math.max(0,totalAssist-cashNeeded);
  const effLoan=(d.price-dp)-assistPrin;
  const ar=d.loanType==="fha"?6.48:d.loanType==="va"?6.17:convRate(d.score,d.dpPct);
  const piMo=Math.round(mpi(effLoan,ar,360));
  const txMo=Math.round(d.price*0.022/12),insMo=Math.round(d.price*0.012/12);
  let miMo=0;
  if(d.loanType==="fha")miMo=Math.round(effLoan*0.0055/12);
  else if(d.loanType==="conv"){const pr=d.score>=780?.002:d.score>=760?.003:d.score>=740?.004:d.score>=720?.006:.009;miMo=d.dpPct<20?Math.round(effLoan*pr/12):0;}
  const piti=piMo+txMo+insMo+miMo;
  const totalDebt=piti+d.debts+(d.student||0);
  const fe=Math.round(piti/grossMo*100);
  const be=Math.round(totalDebt/grossMo*100);
  const feStatus=fe<=28?"good":fe<=33?"caution":"risk";
  const beStatus=be<=36?"good":be<=43?"caution":"risk";
  const statusColor=s=>s==="good"?C.green:s==="caution"?C.amber:C.red;
  const statusLabel=s=>s==="good"?"✓ Within guidelines":s==="caution"?"⚠ Borderline":"✗ Over limit";
  return(
    <div>
      <Alert type="info">These are the two ratios lenders use to decide if you qualify. See where you land before reviewing your full results.</Alert>
      <Card>
        <SecTitle>Front-End Ratio (Housing Ratio)</SecTitle>
        <div style={{fontSize:11,color:C.gray500,marginBottom:10,lineHeight:1.5}}>
          (PITI) ÷ Gross Monthly Income · <strong>Benchmark: 28% max</strong>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <span style={{fontSize:28,fontWeight:900,color:statusColor(feStatus)}}>{fe}%</span>
          <span style={{fontSize:12,fontWeight:700,color:statusColor(feStatus),background:fe<=28?C.greenLight:fe<=33?C.amberLight:C.redLight,padding:"4px 12px",borderRadius:99}}>{statusLabel(feStatus)}</span>
        </div>
        <PBar value={fe} max={50} color={statusColor(feStatus)}/>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.gray500,marginTop:3}}>
          <span>0%</span><span style={{color:C.green,fontWeight:700}}>28% ideal</span><span>50%+</span>
        </div>
        <div style={{marginTop:10,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
          <div style={{background:C.gray100,borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
            <div style={{fontSize:10,color:C.gray500}}>P&I</div>
            <div style={{fontSize:13,fontWeight:800}}>{fmt(piMo)}/mo</div>
          </div>
          <div style={{background:C.gray100,borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
            <div style={{fontSize:10,color:C.gray500}}>Taxes + Ins</div>
            <div style={{fontSize:13,fontWeight:800}}>{fmt(txMo+insMo)}/mo</div>
          </div>
          <div style={{background:C.gray100,borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
            <div style={{fontSize:10,color:C.gray500}}>PMI/MIP</div>
            <div style={{fontSize:13,fontWeight:800}}>{miMo>0?fmt(miMo)+"/mo":"None"}</div>
          </div>
        </div>
      </Card>
      <Card>
        <SecTitle>Back-End Ratio (Debt-to-Income / DTI)</SecTitle>
        <div style={{fontSize:11,color:C.gray500,marginBottom:10,lineHeight:1.5}}>
          (PITI + All Monthly Debts) ÷ Gross Monthly Income · <strong>Benchmark: 36–43% max</strong>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <span style={{fontSize:28,fontWeight:900,color:statusColor(beStatus)}}>{be}%</span>
          <span style={{fontSize:12,fontWeight:700,color:statusColor(beStatus),background:be<=36?C.greenLight:be<=43?C.amberLight:C.redLight,padding:"4px 12px",borderRadius:99}}>{statusLabel(beStatus)}</span>
        </div>
        <PBar value={be} max={60} color={statusColor(beStatus)}/>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.gray500,marginTop:3}}>
          <span>0%</span><span style={{color:C.green,fontWeight:700}}>36%</span><span style={{color:C.amber,fontWeight:700}}>43% max</span><span>60%+</span>
        </div>
        <div style={{marginTop:10}}>
          {[[`PITI`,piti],[`Student loans`,d.student||0],[`Other debts`,d.debts]].filter(r=>r[1]>0).map((r,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"3px 0",borderBottom:`0.5px solid ${C.gray100}`}}>
              <span style={{color:C.gray700}}>{r[0]}</span><span style={{fontWeight:700}}>{fmt(r[1])}/mo</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"6px 0 0",fontWeight:800}}>
            <span>Total monthly obligations</span><span>{fmt(totalDebt)}/mo</span>
          </div>
        </div>
      </Card>
      <div style={{background:C.gray100,borderRadius:12,padding:"12px 14px",fontSize:11,color:C.gray700,lineHeight:1.6}}>
        <strong>Gross monthly income used:</strong> {fmt(grossMo)}/mo{(d.alimony||0)>0?` (includes ${fmt(Math.round((d.alimony||0)/12))}/mo alimony)`:""}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:8,marginTop:12}}>
        <BtnSec onClick={onBack}>← Back</BtnSec>
        <BtnPri onClick={onNext}>See My Full Results →</BtnPri>
      </div>
      <AcronymBar keys={["PITI","DTI","PMI","MIP","FHA","VA"]}/>
    </div>
  );
}

const STEPS=[
  {id:1,label:"Location",icon:"📍",title:"Where are you buying?"},
  {id:2,label:"Income",icon:"💰",title:"Your income & savings"},
  {id:3,label:"Home",icon:"🏠",title:"Your target home"},
  {id:4,label:"Loan",icon:"🏦",title:"Choose your loan"},
  {id:5,label:"Programs",icon:"🎯",title:"Available programs"},
  {id:6,label:"Budget",icon:"📊",title:"Monthly spending"},
  {id:7,label:"Ratios",icon:"📐",title:"Underwriting ratios"},
  {id:8,label:"Results",icon:"✨",title:"Your full picture"},
  {id:9,label:"Action Plan",icon:"✅",title:"Your personalized action plan"},
];

const DEFAULT={
  zip:"",locationInfo:null,isFirstTime:true,
  income:86000,alimony:0,score:740,dpPct:5,debts:300,isVet:false,profession:"none",monthlyRent:1500,isRenting:true,
  k401:3000,roth:1000,hsa:0,
  price:340000,loanType:"fha",loanTerm:360,
  programs:["tsahc","mcc_tx"],
  groc:400,dining:200,ent:150,pcare:150,car:500,efund:300,
  householdSize:1,student:0,
};

export default function App(){
  const [step,setStep]=useState(1);
  const [maxStep,setMaxStep]=useState(1);
  const [data,setData]=useState(DEFAULT);
  const [hoveredStep,setHoveredStep]=useState(null);
  const goTo=s=>{setStep(s);if(s>maxStep)setMaxStep(s);window.scrollTo(0,0);};
  return(
    <div style={{background:C.cream,minHeight:"100vh",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",color:C.charcoal}}>
      <div style={{background:C.white,borderBottom:`1px solid ${C.gray100}`,padding:"12px 16px",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:600,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <img src="/logo.png" alt="Bread Crumbs" style={{height:28,width:"auto",display:"block"}}/>
            <span style={{fontSize:18,fontWeight:900,color:C.green,letterSpacing:"-0.02em"}}>Bread Crumbs</span>
          </div>
          <div style={{fontSize:11,color:C.gray500,fontWeight:600}}>Step {step} of {STEPS.length}</div>
        </div>
      </div>
      <div style={{background:C.white,padding:"10px 16px 12px",borderBottom:`1px solid ${C.gray100}`}}>
        <div style={{maxWidth:600,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center"}}>
            {STEPS.map((s,i)=>(
              <div key={s.id} style={{display:"flex",alignItems:"center",flex:i<STEPS.length-1?1:0,position:"relative"}}>
                <div
                  onClick={()=>s.id<=maxStep&&goTo(s.id)}
                  onMouseEnter={()=>s.id<=maxStep&&setHoveredStep(s.id)}
                  onMouseLeave={()=>setHoveredStep(null)}
                  style={{
                    width:28,height:28,borderRadius:"50%",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:s.id<=step?13:11,flexShrink:0,fontWeight:700,
                    // background: completed=green, current=green, unlocked-future=white, locked=gray
                    background:s.id<step?C.green:s.id===step?C.green:s.id<=maxStep?C.white:C.gray100,
                    // color: completed/current=white, unlocked-future=green, locked=gray
                    color:s.id<=step?C.white:s.id<=maxStep?C.green:C.gray500,
                    // border: current=thick green, unlocked-future=thin green, others=none
                    border:s.id===step?`3px solid ${C.greenMid}`:s.id<=maxStep&&s.id!==step?`2px solid ${C.green}`:"none",
                    boxShadow:s.id===step?`0 0 0 3px ${C.greenLight}`:"none",
                    cursor:s.id<=maxStep?"pointer":"default",
                    pointerEvents:s.id>maxStep?"none":"auto",
                    transition:"background 0.15s,border 0.15s",
                  }}>
                  {s.id<step?"✓":s.icon}
                </div>
                {hoveredStep===s.id&&(
                  <div style={{position:"absolute",top:34,left:"50%",transform:"translateX(-50%)",background:C.charcoal,color:C.white,fontSize:10,fontWeight:600,padding:"3px 9px",borderRadius:6,whiteSpace:"nowrap",zIndex:200,pointerEvents:"none",boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>
                    {s.label}
                  </div>
                )}
                {i<STEPS.length-1&&<div style={{flex:1,height:2,background:s.id<step?C.green:C.gray100,margin:"0 2px"}}/>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{maxWidth:600,margin:"0 auto",padding:"16px 14px 40px"}}>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:22,fontWeight:900,color:C.charcoal,letterSpacing:"-0.02em"}}>{STEPS[step-1].icon} {STEPS[step-1].title}</div>
        </div>
        {step===1&&<StepLocation data={data} setData={setData} onNext={()=>goTo(2)}/>}
        {step===2&&<StepIncome data={data} setData={setData} onNext={()=>goTo(3)} onBack={()=>goTo(1)}/>}
        {step===3&&<StepHome data={data} setData={setData} onNext={()=>goTo(4)} onBack={()=>goTo(2)}/>}
        {step===4&&<StepLoan data={data} setData={setData} onNext={()=>goTo(5)} onBack={()=>goTo(3)}/>}
        {step===5&&<StepPrograms data={data} setData={setData} onNext={()=>goTo(6)} onBack={()=>goTo(4)}/>}
        {step===6&&<StepBudget data={data} setData={setData} onNext={()=>goTo(7)} onBack={()=>goTo(5)}/>}
        {step===7&&<StepUnderwriting data={data} onNext={()=>goTo(8)} onBack={()=>goTo(6)}/>}
        {step===8&&<StepResults data={data} onBack={()=>goTo(7)} onNext={()=>goTo(9)} onRestart={()=>{setData(DEFAULT);goTo(1);}}/>}
        {step===9&&<StepChecklist data={data} setData={setData} onNext={()=>goTo(9)} onBack={()=>goTo(8)}/>}
      </div>
    </div>
  );
}