import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export function nextDaily(now=Date.now()){const d=new Date(now+330*60000);let target=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),1,30);if(target<=now)target+=86400000;return target;}
export function startAutomation(enabled){
 const active=enabled&&Boolean(process.env.OPENROUTER_API_KEY);
 const status={enabled:active,mode:'Local preview',analysisIntervalHours:2,dailyTime:'07:00 IST',nextAnalysis:active?new Date(Date.now()+7200000).toISOString():null,nextDaily:active?new Date(nextDaily()).toISOString():null,running:false,lastResult:null};
 let child;
 const run=(script,args=[])=>new Promise((resolve,reject)=>{child=spawn(process.execPath,[fileURLToPath(new URL(script,import.meta.url)),...args],{windowsHide:true,stdio:'ignore'});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(script+' failed')));});
 const timer=active?setInterval(async()=>{if(status.running)return;const daily=Date.parse(status.nextDaily)<=Date.now(),analysis=Date.parse(status.nextAnalysis)<=Date.now();if(!daily&&!analysis)return;status.running=true;try{await run('./collect-news.mjs');await run('./generate-impact.mjs');await run('./generate-intelligence.mjs',['--type='+(daily?'daily':'analysis')]);status.lastResult={ok:true,at:new Date().toISOString()};}catch{status.lastResult={ok:false,at:new Date().toISOString(),message:'Refresh failed; previous reports retained'};}finally{status.running=false;if(daily)status.nextDaily=new Date(nextDaily()).toISOString();else status.nextAnalysis=new Date(Date.now()+7200000).toISOString();}},30000):null;
 timer?.unref();return {status:()=>({...status}),stop:()=>{if(timer)clearInterval(timer);if(child&&!child.killed)child.kill();}};
}
