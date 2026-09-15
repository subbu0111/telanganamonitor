export const VERSION='civic-priority-1.0';
export const DAY=86400000;
export const SPECIAL=['Andhra Pradesh','Telangana','Tamil Nadu'];
export const clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#(?:x([a-f\d]+)|(\d+));/gi,(_,h,d)=>String.fromCodePoint(parseInt(h||d,h?16:10))).replace(/&(?:quot|#34);/g,'"').replace(/&(?:apos|#39);/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
export function dated(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})$/.test(s)||!Number.isFinite(Date.parse(s)))return false;const [y,m,d]=s.slice(0,10).split('-').map(Number);return m>=1&&m<=12&&d>=1&&d<=new Date(Date.UTC(y,m,0)).getUTCDate()&&+s.slice(11,13)<24&&+s.slice(14,16)<60;}
export function safeUrl(s){try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password&&!/^(localhost|127\.|10\.|192\.168\.|\[)/i.test(u.hostname);}catch{return false;}}
export function eligible(a,now=Date.now()){
 return safeUrl(a.url)&&a.language==='en'&&dated(a.publishedAt)&&Date.parse(a.publishedAt)<=now&&a.provenance?.pageFetched===true&&a.provenance?.headlineMatched===true&&a.provenance?.timestampLocator&&a.title&&a.title.length>12;
}
export function evidence(a){return 50+(a.author?25:0)+(a.bodyEvidence?25:0);}
// Conservative documented-impact signals. Only exact headline language triggers a flag.
// This is an editorial prioritisation rubric, not a measure of actual suffering or certainty.
export function impact(a){
 const text=a.title.toLowerCase();
 const flags=[
  {key:'life',label:'Reported loss of life / injury',points:40,re:/\b(killed|dead|deaths|fatal|injured|injuries)\b/},
  {key:'services',label:'Reported essential-service interruption',points:30,re:/\b(water (?:supply )?(?:cut|disrupt\w*|suspend\w*)|power (?:cuts?|outages?|disrupt\w*)|blackout|hospital\w* (?:clos\w*|shut\w*)|schools? (?:clos\w*|shut\w*))\b/},
  {key:'displacement',label:'Reported evacuation / displacement',points:30,re:/\b(evacuat\w*|displaced|homeless)\b/}
 ];
 const uncertain=/\b(no |not |deny |denies |denied |fake |false |rumou?r|hoax|may |could |might |risk of |fear of |threat of |if )/.test(text);
 const matches=uncertain?[]:flags.filter(f=>f.re.test(text)).map(({re,...f})=>f);
 return {value:matches.length?Math.min(100,matches.reduce((s,f)=>s+f.points,0)):null,flags:matches,method:'Headline signals only; unknown is not zero impact',sourceId:a.id};
}
export function issueScore(issue,now=Date.now()){
 const sources=issue.sources.filter(a=>eligible(a,now));
 if(!sources.length)return {value:null,reason:'No eligible evidence'};
 const first=Math.min(...sources.map(s=>Date.parse(s.publishedAt)));
 const recency=100*Math.max(0,1-(now-first)/(7*DAY));
 const quality=Math.max(...sources.map(evidence));
 const signals=sources.map(impact).filter(i=>i.value!==null);
 const impactValue=signals.length?Math.max(...signals.map(i=>i.value)):null;
 // Fixed denominator: an unknown impact component earns no points, and is explicitly missing.
 return {version:VERSION,value:Math.round(.35*quality+.25*recency+.40*(impactValue??0)),quality,recency:Math.round(recency),impact:impactValue,impactFlags:signals.flatMap(i=>i.flags.map(f=>({...f,sourceId:i.sourceId}))),missingImpact:impactValue===null,asOf:new Date(now).toISOString()};
}
const STOP=new Set('a an the to in of for and as at on by with from after over new says said will is are has have its his her their this that into amid'.split(' '));
export function tokens(title){return clean(title).toLowerCase().replace(/water shutdown|water suspension/g,'water disruption').replace(/suspended|suspension|disrupted|disruptions|shutdown/g,'disruption').replace(/\d+/g,n=>' '+n+' ').match(/[a-z0-9]+/g)?.filter(w=>!STOP.has(w))||[];}
export function sameEvent(a,b){
 if(a.url===b.url)return true;
 if(Math.abs(Date.parse(a.publishedAt)-Date.parse(b.publishedAt))>36*3600000)return false;
 if(!a.locations.length||JSON.stringify(a.locations)!==JSON.stringify(b.locations))return false;
 const x=new Set(tokens(a.title)),y=new Set(tokens(b.title));
 const numberSet=s=>[...new Set(s.match(/\d+/g)||[])].sort().join(',');
 if(numberSet(a.title)!==numberSet(b.title))return false;
 const neg=s=>/\b(no|not|deny|denies|denied|fake|false|rumour|hoax)\b/i.test(s);
 if(neg(a.title)!==neg(b.title))return false;
 const intersection=[...x].filter(t=>y.has(t)).length;
 return intersection/Math.max(x.size,y.size)>=.86&&intersection>=5;
}
export function consolidate(articles,now=Date.now()){
 const issues=[];const urls=new Set();
 for(const a of [...articles].filter(a=>eligible(a,now)).sort((a,b)=>Date.parse(a.publishedAt)-Date.parse(b.publishedAt))){
  if(urls.has(a.url))continue;urls.add(a.url);
  let issue=issues.find(i=>i.sources.every(s=>sameEvent(a,s)));
  if(issue)issue.sources.push(a);else issues.push({id:a.id,title:a.title,category:a.category,locations:a.locations,sources:[a]});
 }
 return issues.map(i=>({...i,score:issueScore(i,now),latestAt:i.sources.map(a=>a.publishedAt).sort((a,b)=>Date.parse(b)-Date.parse(a))[0]}));
}
export function regionalScore(issues,now=Date.now()){
 const scores=issues.map(i=>issueScore(i,now));
 const valid=scores.filter(s=>s.value!==null);
 const n=valid.length;
 return {value:n>=5?Math.round(valid.reduce((s,x)=>s+x.value,0)/n):null,provisional:n?Math.round(valid.reduce((s,x)=>s+x.value,0)/n):null,issues:n,articles:issues.reduce((s,i)=>s+i.sources.length,0),publishers:new Set(issues.flatMap(i=>i.sources.map(s=>s.publisher))).size,impactKnown:valid.filter(s=>s.impact!==null).length,quality:n?Math.round(valid.reduce((s,x)=>s+x.quality,0)/n):null,reason:n<5?'At least 5 consolidated issues required':null};
}
export function matchesLocation(a,scope,region='',district=''){
 if(scope==='world'){const international=a.sourceScope==='world'||a.locations.some(l=>l.country&&l.country!=='India');return international&&(!region||a.locations.some(l=>l.country===region));}
 return a.locations.some(l=>l.country==='India'&&(!region||l.state===region)&&(!district||l.district===district));
}
