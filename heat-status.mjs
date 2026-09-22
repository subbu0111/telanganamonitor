import {eligible} from './core.mjs';

// This is a literal, attributed headline signal, not an AI assessment or a score.
export function reportedDeathSignal(issues,now=Date.now()){
 const sources=issues.flatMap(i=>{
  const source=[...i.sources].filter(s=>eligible(s,now)).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))[0];
  return source?[{id:i.id,source}]:[];
 }).sort((a,b)=>Date.parse(b.source.publishedAt)-Date.parse(a.source.publishedAt));
 return sources.find(({source:s})=>{
  const t=s.title;
  if(/\b(no|not|never|den(?:y|ies|ied)|fake|false|hoax|rumou?r|may|might|could|would|risk|fear\w*|warn\w*|threat|if|alleg\w*|claim\w*|anniversary|penalty|sentence|toll-free|years? ago|last year|fiction|film|movie|actor|actress|martyr|tribute|obituary|cattle|birds?|dogs?|tigers?|deer|livestock|trees?|fish|resurrect\w*)\b|\?|\b(?:19|20)\d{2}\b/i.test(t))return false;
  return /\b(?:\d+\s+(?:(?:people|workers|children|passengers|residents)\s+)?(?:dead|killed)|killed\s+\d+|(?:man|woman|boy|girl|child|teen|student|teacher|worker|driver|dealer|wife|husband)\b.{0,35}\b(?:killed|dies|died|dead)|stabbed to death|beaten to death|shot dead)\b/i.test(t);
 })||null;
}
export function heatStatus(heat,issues,now=Date.now()){
 if(heat.value!==null)return {label:heat.value+' / 100',detail:'Highest fully supported incident impact in this selection.',source:null};
 const partial=heat.contributions.find(c=>c.severity!==null);
 if(partial){const labels={25:'Inconvenience reported',50:'Material harm reported',75:'Serious harm reported',100:'Life-threatening harm reported'};return {label:labels[partial.severity],detail:'Full score pending: '+partial.components.filter(c=>c.value===null).map(c=>c.label.toLowerCase()).join(', ')+'.',source:{id:partial.id,source:partial.source}};}
 const signal=reportedDeathSignal(issues,now);
 if(signal)return {label:'Deaths reported',detail:'Reported in the linked headline. The four-part impact score is not established; this label is not an AI score.',source:signal};
 if(!issues.length)return {label:'Coverage unavailable',detail:'No matched reporting is available for this place and period.',source:null};
 if(heat.assessed<heat.denominator)return {label:'Impact assessment pending',detail:'Some reports have not been assessed. Pending analysis does not mean low impact.',source:null};
 return {label:'Impact details unavailable',detail:'The assessed reports do not establish enough impact details. This is not a low-impact score.',source:null};
}
