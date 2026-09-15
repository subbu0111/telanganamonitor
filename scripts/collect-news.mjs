import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {clean,dated,eligible} from '../core.mjs';
import {locateIndia,categoryOf,overlap,indiaRelevant} from '../v2.mjs';
import {feeds as registry} from './feeds.mjs';
const base=new URL('../',import.meta.url);
const geography=JSON.parse(await readFile(new URL('assets/geography.json',base),'utf8'));
const publicMode=process.argv.includes('--public');
const feeds=registry.filter(f=>!publicMode||(f.publicAllowed&&f.permissionUrl&&f.permissionCheckedAt));
if(!feeds.length)throw Error('No sources approved for public redistribution. Local preview: omit --public.');
const allowed=new Set([...feeds.map(f=>new URL(f.url).hostname),'www.ndtv.com','www.deccanchronicle.com','scroll.in','www.thehindu.com','www.siasat.com','telanganatoday.com','indianexpress.com']);
async function fetchText(url,depth=0){
 const u=new URL(url);if(u.protocol!=='https:'||!allowed.has(u.hostname)||depth>4)throw new Error('Unapproved URL/redirect');
 const r=await fetch(u,{redirect:'manual',signal:AbortSignal.timeout(18000),headers:{'User-Agent':'CivicDarpan/2.0 (public RSS reader; https://subbu0111.github.io/telanganamonitor/)','Accept':'text/html,application/rss+xml,application/xml,text/plain'}});
 if(r.status>=300&&r.status<400)return fetchText(new URL(r.headers.get('location'),u).href,depth+1);
 if(!r.ok)throw new Error('HTTP '+r.status);
 if(+r.headers.get('content-length')>4000000)throw new Error('Page too large');
 const chunks=[];let n=0;for await(const chunk of r.body){n+=chunk.length;if(n>4000000)throw new Error('Page too large');chunks.push(chunk);}
 return Buffer.concat(chunks).toString('utf8');
}
const robotCache=new Map();
async function robotsAllowed(url){
 const u=new URL(url);
 if(!robotCache.has(u.origin))robotCache.set(u.origin,fetchText(u.origin+'/robots.txt').catch(()=>null));
 const text=await robotCache.get(u.origin);if(text===null)return false;
 const groups=[];let agents=[],rules=[],hasRules=false;
 for(const line of text.split(/\r?\n/)){const match=line.split('#')[0].match(/^\s*(user-agent|allow|disallow)\s*:\s*(.*)$/i);if(!match)continue;const type=match[1].toLowerCase(),value=match[2].trim();if(type==='user-agent'){if(hasRules){groups.push({agents,rules});agents=[];rules=[];hasRules=false;}agents.push(value.toLowerCase());}else{hasRules=true;if(value)rules.push({allow:type==='allow',path:value});}}
 groups.push({agents,rules});const specific=groups.filter(g=>g.agents.some(a=>a.includes('civicdarpan')));const active=specific.length?specific:groups.filter(g=>g.agents.includes('*'));
 const matching=active.flatMap(g=>g.rules).filter(r=>{const pattern=r.path.replace(/[.+?^{}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*');try{return new RegExp('^'+pattern).test(u.pathname+u.search);}catch{return true;}}).sort((a,b)=>b.path.length-a.path.length||Number(b.allow)-Number(a.allow));
 return !matching.length||matching[0].allow;
}
const tag=(xml,name)=>clean((xml.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'))||[])[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1'));
function meta(html,name){for(const match of html.matchAll(/<meta\b[^>]*>/gi)){const attrs={};for(const a of match[0].matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g))attrs[a[1].toLowerCase()]=a[3];if((attrs.property||attrs.name||'').toLowerCase()===name)return clean(attrs.content);}return '';}
function nodes(html){const out=[];function walk(x){if(!x||typeof x!=='object')return;if(Array.isArray(x)){x.forEach(walk);return;}const t=[x['@type']].flat().join(' ');if(/Article|Reportage|BlogPosting/i.test(t))out.push(x);if(x['@graph'])walk(x['@graph']);}for(const s of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{walk(JSON.parse(s[1]));}catch{}}return out;}
let previous={articles:[]};try{previous=JSON.parse(await readFile(new URL('data/news.json',base),'utf8'));}catch{}
for(const a of previous.articles)a.sourceScope||=['BBC','Al Jazeera'].includes(a.publisher)?'world':'india';
const candidates=new Map(),health=[];const held={};const hold=reason=>held[reason]=(held[reason]||0)+1;
await Promise.all(feeds.map(async ({publisher,url,country,state:sectionState,terms,publicAllowed})=>{try{if(!await robotsAllowed(url))throw new Error('Robots unavailable or disallowed');const xml=await fetchText(url);const items=[...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0,100);if(!items.length)throw new Error('No RSS items');let count=0;for(const [,item] of items){const link=tag(item,'link'),title=tag(item,'title');if(link&&title){candidates.set(link,{url:link,title,publisher,country,sectionState,terms,publicAllowed});count++;}}health.push({publisher,url,status:'ok',discovered:count,terms,publicAllowed});}catch(e){health.push({publisher,url,status:'unavailable',reason:e.message,terms,publicAllowed});}}));
if(!health.some(h=>h.status==='ok'))throw Error('No feeds responded; previous collection and successful timestamp retained');
console.log('Feeds',health.map(h=>h.publisher+':'+h.status+' '+(h.discovered||0)).join(' | '));
const accepted=new Map(previous.articles.filter(a=>a.sourceScope!=='world'&&(!publicMode||a.publicAllowed===true)&&Date.now()-Date.parse(a.publishedAt)<30*86400000).map(a=>[a.url,a]));
let fetched=0;const queue=[...candidates.values()];
async function worker(){while(queue.length){const candidate=queue.shift();try{
 if(!await robotsAllowed(candidate.url)){hold('robots_or_unavailable');continue;}
 const html=await fetchText(candidate.url);fetched++;
 const articles=nodes(html);const node=articles.find(n=>n.headline&&clean(n.headline).toLowerCase()===candidate.title.toLowerCase())||articles[0]||{};
 const pageTitle=clean(node.headline||meta(html,'og:title'));
 const strip=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
 if(!pageTitle||(!strip(pageTitle).includes(strip(candidate.title))&&!strip(candidate.title).includes(strip(pageTitle))&&overlap(pageTitle,candidate.title).containment<.85)){hold('headline_mismatch');continue;}
 const raw=node.datePublished||meta(html,'article:published_time')||meta(html,'datePublished');
 if(!dated(raw)){hold('missing_publication_time');continue;}
 const publishedAt=new Date(raw).toISOString();if(Date.parse(publishedAt)>Date.now()||Date.now()-Date.parse(publishedAt)>30*86400000){hold('outside_time_window');continue;}
 const declared=(node.inLanguage||html.match(/<html[^>]+lang=["']([^"']+)/i)?.[1]||'en').toLowerCase();if(!declared.startsWith('en')){hold('not_english');continue;}
 const title=pageTitle;
 const authorBlock=html.match(/itemprop=["']author["'][\s\S]{0,1600}/i)?.[0]||'';
 const author=clean((Array.isArray(node.author)?node.author[0]?.name:node.author?.name)||meta(html,'author')||authorBlock.match(/itemprop=["']name["'][^>]*content=["']([^"']+)/i)?.[1]||authorBlock.match(/itemprop=["']name["'][^>]*>([^<]+)/i)?.[1]||'');
 const microBody=html.match(/itemprop=["']articleBody["'][^>]*>([\s\S]*?)<\/div>/i)?.[1];
 const body=clean(node.articleBody||microBody||'');
 const description=clean(node.description||meta(html,'og:description')||meta(html,'description')||'');
 const lead=(body||description).split(/\s+/).slice(0,160).join(' ');
 const geographyMatch=locateIndia(pageTitle,lead,geography,candidate.sectionState);
 if(/\/(?:world|international)\//.test(candidate.url)&&!geographyMatch.locations.some(l=>l.state)&&!(/\bIndia(?:n)?\b/i.test(pageTitle))){hold('outside_india_scope');continue;}
 
 const a={id:createHash('sha256').update(candidate.url).digest('hex').slice(0,16),url:candidate.url,publisher:candidate.publisher,title,language:'en',publishedAt,timestampRaw:raw,modifiedAt:dated(node.dateModified)?new Date(node.dateModified).toISOString():null,author,bodyEvidence:!!body,excerpt:description.split(/\s+/).slice(0,35).join(' '),category:categoryOf(pageTitle),locations:geographyMatch.locations,mentions:geographyMatch.mentions,publicAllowed:candidate.publicAllowed,sourceTerms:candidate.terms,provenance:{pageFetched:true,headlineMatched:true,timestampLocator:node.datePublished?'NewsArticle.datePublished':'meta article:published_time',checkedAt:new Date().toISOString(),mode:'Extracted source headline; no generated factual summary'}};
 a.sourceScope='india';
 if(eligible(a)&&indiaRelevant(a)){const prior=accepted.get(a.url);a.firstSeenAt=prior?.firstSeenAt||prior?.provenance?.checkedAt||a.provenance.checkedAt;accepted.set(a.url,a);}else hold('validation_failed');
 }catch(e){hold('page_unavailable');}}}
await Promise.all(Array.from({length:5},worker));
await mkdir(new URL('data/',base),{recursive:true});
const result={schemaVersion:2,generatedAt:new Date().toISOString(),language:'en',mode:publicMode?'Public approved sources':'Local preview — source reuse rights recorded',sourceRegistry:registry.map(f=>({publisher:f.publisher,url:f.url,directory:f.directory,terms:f.terms,publicAllowed:f.publicAllowed})),feeds:health,validation:{discovered:candidates.size,pagesFetched:fetched,held},articles:[...accepted.values()].filter(indiaRelevant).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))};
await writeFile(new URL('data/news.pending.json',base),JSON.stringify(result));await rename(new URL('data/news.pending.json',base),new URL('data/news.json',base));
console.log('Published',result.articles.length,'dated source records; held',held);
