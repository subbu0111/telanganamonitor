import {readFile} from 'node:fs/promises';
import {eligible} from '../core.mjs';
import {validateReport} from '../intelligence.mjs';
import {validateAssessment} from '../impact.mjs';
import {feeds} from './feeds.mjs';
const base=new URL('../data/',import.meta.url),read=async n=>JSON.parse(await readFile(new URL(n,base)));
const n=await read('news.json'),d=await read('intelligence.json'),h=await read('impact.json');
const publishers=new Set(feeds.filter(f=>f.publicAllowed&&f.permissionUrl&&f.permissionCheckedAt).map(f=>f.publisher));
function permitted(s){return s.publicAllowed===true&&publishers.has(s.publisher)&&eligible(s);}
for(const s of n.articles)if(!permitted(s))throw Error('Unapproved or invalid public source: '+s.id);
const sources=new Map(n.articles.map(s=>[s.id,s]));
for(const r of [...d.analyses,...d.digests]){validateReport(r,r.sources);for(const s of r.sources)if(!permitted(s))throw Error('Unapproved source in AI report');}
for(const a of h.assessments)validateAssessment(a,sources.get(a.sourceId));
console.log('Public payload validated: '+n.articles.length+' articles; '+(d.analyses.length+d.digests.length)+' reports');
