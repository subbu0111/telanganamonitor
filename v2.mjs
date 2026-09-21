import {DAY,eligible,clean} from './core.mjs';
import {reportedHeat} from './impact.mjs';
export const HUBS=['Environment','Civic Pulse','Whisper Net','Trends','AI Analysis','Daily Report'];
export const CIVIC=['Water & environment','Public services','Health & safety','Education','Politics & governance'];
const stop=new Set('a an the to in of for and as at on by with from after over new says said will is are has have its his her their this that into amid was were be being been during following'.split(' '));
export function words(text){return clean(text).toLowerCase().replace(/\b(?:shutdown|suspension|suspended|disrupted|disruptions|outages?|cuts?)\b/g,'disruption').replace(/\b(?:killed|dead|dies|died|deaths?|fatal)\b/g,'death').replace(/\b(?:buses|bus)\b/g,'bus').replace(/\b(?:arrested|arrests)\b/g,'arrest').replace(/\b(?:launches|launched|opens|opened|inaugurates|inaugurated)\b/g,'launch').replace(/\b(?:crores|crore)\b/g,'crore').match(/[a-z0-9]+/g)?.filter(w=>!stop.has(w))||[];}
export function overlap(a,b){const x=new Set(words(a)),y=new Set(words(b));const n=[...x].filter(w=>y.has(w)).length;return {n,j:n/(new Set([...x,...y]).size||1),containment:n/(Math.min(x.size,y.size)||1)};}
const locationKeys=a=>(a.locations||[]).map(l=>[l.state,l.district].filter(Boolean).join('/')).filter(Boolean);
export function eventMatch(a,b){
 if(a.url===b.url)return true;
 if(Math.abs(Date.parse(a.publishedAt)-Date.parse(b.publishedAt))>36*3600000)return false;
 const x=locationKeys(a),y=locationKeys(b);if(!x.length||!y.length)return false;
 const xd=(a.locations||[]).filter(l=>l.district).map(l=>l.state+'/'+l.district),yd=(b.locations||[]).filter(l=>l.district).map(l=>l.state+'/'+l.district);
 if(xd.length&&yd.length&&!xd.some(k=>yd.includes(k)))return false;
 if(!x.some(k=>y.includes(k)))return false;
 const textA=a.matchTitle||a.title,textB=b.matchTitle||b.title;
 const neg=t=>/\b(no|not|deny|denies|denied|fake|false|rumour|hoax)\b/i.test(t);
 if(neg(textA)!==neg(textB))return false;
 // Different explicit numbers or event dates require separate records, not guessed updates.
 const nums=t=>[...new Set(t.match(/\d+(?:\.\d+)?/g)||[])].sort().join(',');
 if(nums(textA)!==nums(textB))return false;
 const m=overlap(textA,textB);
 const event=/\b(death|disruption|arrest|launch|protest|accident|collision|flood|settle|settled|lok|adalat|rescue|strike|election|fire)\b/;
 return m.n>=5&&((m.j>=.64&&m.containment>=.8)||(m.j>=.45&&m.containment>=.72&&event.test(words(textA).join(' '))&&event.test(words(textB).join(' '))));
}
export function groupStories(articles,now=Date.now()){
 const groups=[],urls=new Set();
 for(const a of [...articles].filter(a=>eligible(a,now)).sort((a,b)=>Date.parse(a.publishedAt)-Date.parse(b.publishedAt)||a.id.localeCompare(b.id))){
  if(urls.has(a.url))continue;urls.add(a.url);
  const group=groups.find(g=>Date.parse(a.publishedAt)-Date.parse(g.sources[0].publishedAt)<=36*3600000&&g.sources.every(s=>eventMatch(a,s)));
  if(group)group.sources.push(a);else groups.push({id:a.id,sources:[a]});
 }
 return groups.map(g=>{const latest=[...g.sources].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))[0];return {...g,title:latest.title,category:latest.category,locations:latest.locations,latestAt:latest.publishedAt,firstAt:g.sources[0].publishedAt,publishers:[...new Set(g.sources.map(s=>s.publisher))],syndicated:g.sources.some(s=>/\b(PTI|ANI|IANS|Reuters|Associated Press)\b/i.test(s.author||''))};});
}
export function inPlace(a,region='',district=''){return (a.locations||[]).some(l=>l.country==='India'&&(!region||l.state===region)&&(!district||l.district===district));}
export function indiaRelevant(a){if(a.sourceScope==='world')return false;if(a.publicAllowed&&a.permissionId?.startsWith('pib-'))return true;if((a.locations||[]).some(l=>l.country==='India'&&l.state))return true;if(/\b(india|indian|telugu|tamil|bollywood|tollywood|kollywood)\b/i.test(a.title+' '+(a.excerpt||'')))return true;try{return /\/(india|india-news|national|nation|cities|telangana|andhra-pradesh|tamil-nadu|hyderabad)(\/|[?#])/.test(new URL(a.url).pathname);}catch{return false;}}
export function storyPlace(i){return [...new Set((i.locations||[]).map(l=>l.district||l.state).filter(Boolean))].join(' · ')||'India · location unspecified';}
export const HEAT_TOPICS={Water:['water','hmwssb','tanker','borewell','pipeline','scarcity'],Power:['power cut','outage','tsspdcl','tsnspdcl','tgspdcl','load shedding','transformer','power supply'],Roads:['pothole','road','flyover','manhole','footpath','crater'],Sanitation:['garbage','sewage','sanitation','drain','dumping','landfill','waste'],Traffic:['traffic','congestion','accident','jam','signal','diversion'],Crime:['crime','theft','robbery','assault','police','snatch','scam','fraud']};
export function heatEvidence(issues,now=Date.now()){
 return reportedHeat(issues,now);
}
export function dailyGroups(issues){const dates={};for(const i of issues){for(const day of new Set(i.sources.map(a=>new Date(a.publishedAt).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'})))){(dates[day]??=[]).push(i);}}return dates;}
export function validateBrief(plan,issues){
 if(!plan||!Array.isArray(plan.sections))throw Error('Invalid briefing');
 const byId=new Map(issues.flatMap(i=>i.sources.map(s=>[s.id,s])));
 const allowed=new Set(['What happened','Public services','District focus','Documented responses','What to follow']);
 for(const section of plan.sections){if(!allowed.has(section.title)||!Array.isArray(section.items))throw Error('Invalid section');for(const item of section.items){const s=byId.get(item.sourceId);if(!s||item.text!==s.title)throw Error('Unsupported briefing text');}}
 return plan;
}
const aliases={Telangana:['hyderabad','secunderabad'], 'Andhra Pradesh':['andhra pradesh','visakhapatnam','vijayawada','tirupati'], 'Tamil Nadu':['tamil nadu','chennai','coimbatore','madurai'],Maharashtra:['mumbai','pune','nagpur'],Karnataka:['bengaluru','bangalore','mysuru','mysore'],Delhi:['new delhi','delhi'], 'Uttar Pradesh':['lucknow','noida','varanasi','kanpur'], 'West Bengal':['kolkata'],Gujarat:['ahmedabad','surat','gandhinagar'],Kerala:['kochi','thiruvananthapuram','kozhikode'],'Jammu & Kashmir':['jammu','kashmir','srinagar'],Odisha:['bhubaneswar','cuttack'],Bihar:['patna'],Rajasthan:['jaipur','jodhpur'],Punjab:['amritsar','ludhiana'],Haryana:['gurugram','gurgaon'], 'Madhya Pradesh':['bhopal','indore'],Assam:['guwahati'],Uttarakhand:['dehradun'],Jharkhand:['ranchi'],Chhattisgarh:['raipur'],Goa:['panaji'],'Himachal Pradesh':['shimla'],Manipur:['imphal'],Meghalaya:['shillong'],Tripura:['agartala'],Nagaland:['kohima'],Mizoram:['aizawl'],Sikkim:['gangtok'],'Arunachal Pradesh':['itanagar']};
function named(text,name){return new RegExp('(?:^|[^a-z])'+name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:$|[^a-z])').test(text.toLowerCase());}
export function locateIndia(title,lead,geo,sectionState=''){
 const locations=[],mentions=[];
 for(const s of geo.states.features){const name=s.properties.name,ns=[name,...(aliases[name]||[])];
  const titleNames=ns.filter(n=>named(title,n));const leadNames=ns.filter(n=>named(lead,n));
  if(titleNames.length||leadNames.length){const event=[...titleNames,...leadNames].some(anchor=>new RegExp('\\b(?:in|at|across|near|within)\\s+(?:the\\s+)?'+anchor+'\\b','i').test(title+' '+lead)||new RegExp('^'+anchor+'\\s*[:—-]','i').test(lead));
   mentions.push({country:'India',state:name,district:null,basis:titleNames.length?'Named in headline':'Named in article introduction',role:event?'event-location':'mentioned'});
   if(titleNames.length||event)locations.push({...mentions.at(-1)});
  }
 }
 for(const d of geo.districts){const ns=[d.name,...(d.name==='NTR'?['vijayawada']:d.name==='SPSR Nellore'?['nellore']:d.name==='Kumuram Bheem Asifabad'?['asifabad']:[])];const n=ns.find(n=>named(title,n));if(n){if(!locations.some(l=>l.state===d.state))locations.push({country:'India',state:d.state,district:null,role:'mentioned',basis:'District named in headline'});locations.push({country:'India',state:d.state,district:d.name,role:new RegExp('\\b(in|at|near|across)\\s+'+n+'\\b','i').test(title)?'event-location':'mentioned',basis:'District named in headline'});}}
 if(!locations.length&&sectionState)locations.push({country:'India',state:sectionState,district:null,role:'section',basis:'Publisher state section; event location not established'});
 if(!locations.length)locations.push({country:'India',state:null,district:null,role:'section',basis:'Indian publisher section; precise location not established'});
 return {locations,mentions};
}
export function categoryOf(title){for(const [n,re] of [['Sports',/\b(cricket|t20|ipl|football|tennis|badminton|hockey|olympic|world cup|asia cup)\b/i],['Culture & entertainment',/\b(film|cinema|actor|actress|movie|music|festival|concert|theatre|art exhibition)\b/i],['Water & environment',/\b(water|rain|flood|pollution|climate|reservoir|sewage|drought)\b/i],['Public services',/\b(power|road|traffic|metro|rail|transport|garbage|infrastructure|outage)\b/i],['Health & safety',/\b(hospital|health|disease|killed|dead|injured|police|crime|arrest|accident)\b/i],['Economy & livelihoods',/\b(jobs|price|economy|workers|farmers|business|tax|trade|investment|market)\b/i],['Education',/\b(school|college|university|students|exam|education)\b/i],['Politics & governance',/\b(minister|election|government|parliament|assembly|bjp|congress|court|policy|mla|brs|dmk)\b/i]])if(re.test(title))return n;return 'Other news';}
