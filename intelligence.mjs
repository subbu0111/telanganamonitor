import {eligible} from './core.mjs';
export const ANALYSIS_SECTIONS=['Executive Summary','Risk Assessment','Cross-Correlation','Recommendations','District Focus'];
export const DAILY_SECTIONS=['Daily Overview','Key Developments','Trend Analysis','Follow-ups & Unknowns','Action Items'];
export function validateReport(report,sources){
 if(!report||!['analysis','daily'].includes(report.type)||!report.region||!Array.isArray(report.sections))throw Error('Invalid report envelope');
 const byId=new Map(sources.map(s=>[s.id,s])),seen=new Set(),allowed=report.type==='analysis'?ANALYSIS_SECTIONS:DAILY_SECTIONS;
 if(report.sections.length!==allowed.length||report.sections.some((s,i)=>s.title!==allowed[i]))throw Error('Invalid report sections');
 for(const section of report.sections){if(!Array.isArray(section.items))throw Error('Invalid section items');for(const item of section.items){
  if(!item.id||seen.has(item.id)||!item.text||item.text.length>1600||!['fact','inference','recommendation'].includes(item.kind)||!Array.isArray(item.citations)||!item.citations.length)throw Error('Invalid report item');seen.add(item.id);
  for(const c of item.citations){const s=byId.get(c.sourceId);if(!s||!eligible(s)||typeof c.quote!=='string'||c.quote.length<12||![s.title,s.excerpt||''].some(t=>t.includes(c.quote)))throw Error('Unsupported citation in '+item.id);}
  // Headlines describing planned events cannot establish completion. Missing records cannot prove absence.
  const quotes=item.citations.map(c=>c.quote).join(' ');
  if(/\b(?:will|to)\s+(?:organis[ez]|launch|inaugurate|address|visit|hold|begin|open)\b|\bscheduled to\b/i.test(quotes)&&/\b(?:launched|inaugurated|addressed|visited|held|began|opened)\b/i.test(item.text))throw Error('Planned event presented as completed in '+item.id);
  if(/\b(?:not yet published|no .{0,80}(?:announced|published|reported)|(?:have|has) not been (?:announced|published|reported))\b/i.test(item.text)&&!quotes.toLowerCase().includes(item.text.toLowerCase()))throw Error('Unsupported absence claim in '+item.id);
  // Numeric factual claims require an identical number in the cited evidence.
  if(item.kind==='fact'){const evidence=item.citations.map(c=>{const s=byId.get(c.sourceId);return s.title+' '+(s.excerpt||'');}).join(' ').replace(/,/g,'');for(const n of item.text.replace(/,/g,'').match(/\d+(?:\.\d+)?/g)||[])if(!new RegExp('(?:^|[^0-9])'+n.replace('.','\\.')+'(?:$|[^0-9])').test(evidence))throw Error('Unsupported number in '+item.id);}
 }}
 return report;
}
export function applyVerification(report,review){
 if(!Array.isArray(review?.items))throw Error('Invalid verification result');
 const results=new Map();for(const item of review.items){if(!item.id||results.has(item.id)||typeof item.supported!=='boolean')throw Error('Invalid verification item');results.set(item.id,item);}
 const withheld=[];const sections=report.sections.map(s=>({...s,items:s.items.filter(item=>{const check=results.get(item.id);if(check?.supported===true)return true;withheld.push({id:item.id,reason:check?.reason||'No independent support decision'});return false;})}));
 if(!sections[0].items.length)throw Error('No supported executive overview remains');
 return {...report,sections,verification:{method:'Original-page provenance, exact evidence citations, numeric checks and a second model support check',withheldItems:withheld.length}};
}
export function pruneUnsupportedItems(report,sources){
 const allowed=report.type==='analysis'?ANALYSIS_SECTIONS:DAILY_SECTIONS;
 if(!Array.isArray(report.sections)||report.sections.length!==allowed.length||report.sections.some((s,i)=>s.title!==allowed[i]||!Array.isArray(s.items)))throw Error('Malformed report cannot be repaired');
 let withheld=0;const used=new Set();const sections=report.sections.map((section,index)=>({...section,items:section.items.filter(item=>{try{if(used.has(item.id))throw Error('Duplicate ID');validateReport({...report,sections:report.sections.map((s,i)=>({...s,items:i===index?[item]:[]}))},sources);used.add(item.id);return true;}catch{withheld++;return false;}})}));
 return {...report,sections,citationRejectedItems:withheld};
}
export const reportDay=t=>new Date(t).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
