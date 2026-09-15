import {readFile} from 'node:fs/promises';
import {eligible} from '../core.mjs';
import {validateReport} from '../intelligence.mjs';
import {validateAssessment} from '../impact.mjs';
import {isPublicSource} from './public-sources.mjs';
import {AI_MODEL} from './ai-client.mjs';
const base=new URL('../data/',import.meta.url),read=async n=>JSON.parse(await readFile(new URL(n,base)));
const n=await read('news.json'),d=await read('intelligence.json'),h=await read('impact.json');
function permitted(s){return isPublicSource(s)&&eligible(s);}
for(const s of n.articles)if(!permitted(s))throw Error('Unapproved or invalid public source: '+s.id);
const sources=new Map(n.articles.map(s=>[s.id,s]));
for(const r of [...d.analyses,...d.digests]){if(r.model!==AI_MODEL)throw Error('Unexpected report model');validateReport(r,r.sources);for(const s of r.sources)if(!permitted(s))throw Error('Unapproved source in AI report');}
for(const a of h.assessments){if(a.model!==AI_MODEL)throw Error('Unexpected impact model');validateAssessment(a,sources.get(a.sourceId));}
console.log('Public payload validated: '+n.articles.length+' articles; '+(d.analyses.length+d.digests.length)+' reports');
