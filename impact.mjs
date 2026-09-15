import {eligible} from './core.mjs';
export const IMPACT_VERSION='reported-impact-1';
export const RUBRIC={
 severity:{label:'Severity',weight:.4,levels:{inconvenience:25,material_harm:50,serious_harm:75,life_threatening:100}},
 service:{label:'Essential-service disruption',weight:.3,levels:{not_service_related:0,delays:25,partial_disruption:50,essential_unavailable:75,multiple_essential_unavailable:100}},
 reach:{label:'Reported reach',weight:.2,levels:{individual_or_site:25,neighbourhood:50,district_or_city:75,multiple_districts:100}},
 duration:{label:'Documented duration',weight:.1,levels:{under_day:25,one_to_three_days:50,four_to_seven_days:75,over_week_or_recurrent:100}}
};
export function evidenceKey(s){return JSON.stringify([s.title,s.excerpt||'',s.publishedAt]);}
export function componentSupported(key,c){
 if(!c)return true;const q=c.quote?.toLowerCase()||'';
 const patterns={
 severity:{inconvenience:/inconvenien|delays?|stranded|traffic congestion/,material_harm:/disruption|disrupted|damage|loss|lost|destroyed|unavailable|without (?:water|power|electricity)/,serious_harm:/serious(?:ly)? injur|critical(?:ly)?|displac|evacuat|livelihood.{0,20}(?:lost|loss)|homeless/,life_threatening:/\b(?:killed|dead|died|deaths?|fatal|life-threatening)\b/},
 service:{not_service_related:/\b(?:accident|collision|crash|assault|murder|theft|robbery)\b/,delays:/\b(?:delay|delays|delayed)\b/,partial_disruption:/\b(?:partial|intermittent|disrupted|disruption|services hit)\b/,essential_unavailable:/\b(?:suspended|unavailable|shutdown|shut down|power cuts|outage|without water|without electricity|supply cut|supply stopped)\b/,multiple_essential_unavailable:/(?:water.{0,30}(?:and|,)\s*(?:power|electricity)|(?:power|electricity).{0,30}(?:and|,)\s*water).{0,40}(?:cut|unavailable|disrupted|suspended)/},
 reach:{individual_or_site:/\b(?:one|single|a man|a woman|a child|a girl|a boy|a person|a family|a factory|a school|a hospital|a bus|a train)\b/,neighbourhood:/\b(?:neighbourhood|neighborhood|locality|streets|colony|village)\b/,district_or_city:/\b(?:city-wide|citywide|district-wide|districtwide|across (?:the )?(?:city|district)|entire (?:city|district))\b/,multiple_districts:/\b(?:multiple districts|several districts|across districts|state-wide|statewide|nationwide|across (?:the )?(?:state|country))\b/}
 };
 if(key==='duration'){
  if(c.level==='over_week_or_recurrent'&&/\b(?:recurring|recurrent|repeated|daily outages|every day)\b/.test(q))return true;
  const numbers={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,a:1};
  const m=q.match(/\b(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|a)[ -]+(hours?|days?|weeks?)\b/);if(!m)return false;
  const n=Number(m[1])||numbers[m[1]],hours=n*(m[2].startsWith('week')?168:m[2].startsWith('day')?24:1);
  return c.level===(hours<24?'under_day':hours<=72?'one_to_three_days':hours<=168?'four_to_seven_days':'over_week_or_recurrent');
 }
 return patterns[key]?.[c.level]?.test(q)===true;
}
export function validateAssessment(a,s){
 if(!s||!eligible(s)||a?.sourceId!==s.id||a.version!==IMPACT_VERSION||a.evidenceKey!==evidenceKey(s)||a.verified!==true)throw Error('Unverified or outdated impact evidence');
 for(const [key,r] of Object.entries(RUBRIC)){const c=a.components?.[key];if(c===null)continue;if(!c||!Object.hasOwn(r.levels,c.level)||typeof c.quote!=='string'||c.quote.length<12||![s.title,s.excerpt||''].some(t=>t.includes(c.quote))||!componentSupported(key,c))throw Error('Unsupported impact component: '+key);}
 return a;
}
export function impactScore(a,s){
 try{validateAssessment(a,s);}catch{return null;}
 const components=Object.entries(RUBRIC).map(([key,r])=>({key,label:r.label,weight:r.weight,...a.components[key],value:a.components[key]?r.levels[a.components[key].level]:null}));
 const complete=components.every(c=>c.value!==null),severity=components[0].value;
 return {value:complete?Math.round(components.reduce((sum,c)=>sum+c.weight*c.value,0)):null,severity,components,sourceId:s.id,source:s,assessedAt:a.assessedAt,reason:complete?null:'Insufficient evidence for a total impact score'};
}
export function reportedHeat(issues,now=Date.now()){
 const scored=[];const seen=new Set();for(const i of issues){if(seen.has(i.id))continue;seen.add(i.id);
  // A later account without an assessment must not silently inherit an older score.
  const latest=[...i.sources].filter(s=>eligible(s,now)).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))[0];
  if(!latest)continue;const score=impactScore(latest.impactAssessment,latest);if(score)scored.push({...score,id:i.id,title:i.title,locations:i.locations});
 }
 const complete=scored.filter(i=>i.value!==null).sort((a,b)=>b.value-a.value||Date.parse(b.source.publishedAt)-Date.parse(a.source.publishedAt));
 const partial=scored.filter(i=>i.value===null&&i.severity!==null).sort((a,b)=>b.severity-a.severity);
 return {value:complete[0]?.value??null,leader:complete[0]||null,contributions:[...complete,...partial],assessed:scored.length,complete:complete.length,denominator:issues.length,method:IMPACT_VERSION,reason:complete.length?null:'Insufficient evidence',unknown:issues.length-complete.length};
}
