import {spawnSync} from 'node:child_process';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {feeds} from './feeds.mjs';
const type=process.argv.includes('--daily')?'daily':'analysis';
if(!feeds.some(f=>f.publicAllowed&&f.permissionUrl&&f.permissionCheckedAt))throw Error('Public refresh blocked: no documented publisher reuse permissions. Existing public data retained.');
function run(file,args=[]){const r=spawnSync(process.execPath,[fileURLToPath(new URL(file,import.meta.url)),...args],{stdio:'inherit',windowsHide:true});if(r.status!==0)throw Error(file+' failed; existing report generations retained');}
run('./collect-news.mjs',['--public']);
run('./generate-impact.mjs');
run('./generate-intelligence.mjs',['--type='+type]);
const url=new URL('../data/intelligence.json',import.meta.url),data=JSON.parse(await readFile(url));
data.schedule={enabled:true,host:'GitHub Actions',analysisEveryHours:2,dailyAt:'07:00 IST',lastSuccessfulType:type,lastSuccessfulAt:new Date().toISOString()};
const pending=new URL('../data/intelligence.pending.json',import.meta.url);await writeFile(pending,JSON.stringify(data));await rename(pending,url);
run('./validate-public.mjs');
