import {clean,dated} from '../core.mjs';
import {overlap} from '../v2.mjs';
export function publisherState(url){const path=new URL(url).pathname.split('/')[1];return {'ghaziabad-news':'Uttar Pradesh','lucknow-news':'Uttar Pradesh','noida-news':'Uttar Pradesh','allahabad-news':'Uttar Pradesh','andhra-pradesh-news':'Andhra Pradesh','telangana-news':'Telangana','hyderabad-news':'Telangana','tamil-nadu-news':'Tamil Nadu','chennai-news':'Tamil Nadu','kerala-news':'Kerala','karnataka-news':'Karnataka','bangalore-news':'Karnataka','mumbai-news':'Maharashtra','maharashtra-news':'Maharashtra','delhi-news':'Delhi','uttar-pradesh-news':'Uttar Pradesh','kolkata-news':'West Bengal','west-bengal-news':'West Bengal','gujarat-news':'Gujarat','rajasthan-news':'Rajasthan','bihar-news':'Bihar','madhya-pradesh-news':'Madhya Pradesh','odisha-news':'Odisha','punjab-news':'Punjab','assam-news':'Assam'}[path]||'';}
export function metadata(html,name){for(const m of html.matchAll(/<meta\b[^>]*>/gi)){const a={};for(const x of m[0].matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g))a[x[1].toLowerCase()]=x[3];if((a.property||a.name||'').toLowerCase()===name)return clean(a.content);}return '';}
export function publisherPage(html,candidate){
 const articles=[];function walk(x){if(!x||typeof x!=='object')return;if(Array.isArray(x)){x.forEach(walk);return;}if(/Article|Reportage|BlogPosting/i.test([x['@type']].flat().join(' ')))articles.push(x);if(x['@graph'])walk(x['@graph']);}
 for(const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{walk(JSON.parse(m[1]));}catch{}}
 const matches=title=>!!title&&(clean(title).toLowerCase()===clean(candidate.title).toLowerCase()||overlap(clean(title),candidate.title).j>=0.85);
 const article=articles.find(a=>matches(a.headline)),title=article?.headline||metadata(html,'og:title');
 if(!matches(title))throw Error('Feed headline does not match original page');
 const raw=article?.datePublished||metadata(html,'article:published_time');if(!dated(raw))throw Error('Original publication timestamp missing');
 const authors=[article?.author].flat().filter(Boolean).map(a=>typeof a==='string'?a:a.name).filter(Boolean).join(', ');
 if(candidate.rule.requiredLicense&&!html.includes(candidate.rule.requiredLicense))throw Error('Page licence not established');
 return {geographyText:metadata(html,'og:description'),title:clean(candidate.title),raw,author:candidate.rule.preferFeedAuthor&&candidate.author&&clean(html).includes(candidate.author)?candidate.author:authors||metadata(html,'author')||candidate.author||candidate.rule.publisher,excerpt:candidate.rule.headlineOnly?'':metadata(html,'og:description'),locator:article?.datePublished?'JSON-LD datePublished':'meta article:published_time'};
}
