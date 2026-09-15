export const AI_MODEL='nvidia/nemotron-3.5-lightning:free';
export function parseJSON(text){return JSON.parse(String(text).trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));}
export async function completeJSON(messages,max=4000){
 const key=process.env.OPENROUTER_API_KEY;if(!key)throw Error('OpenRouter connection is not configured');
 let last;for(let attempt=0;attempt<3;attempt++){try{
  const r=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',signal:AbortSignal.timeout(120000),headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','X-OpenRouter-Title':'CivicDarpan'},body:JSON.stringify({model:AI_MODEL,temperature:0,max_tokens:max,reasoning:{enabled:false},messages:[{role:'system',content:'Return only a valid JSON object. No markdown, commentary or reasoning outside JSON.'},...messages]})});
  if(!r.ok){if([401,402,403].includes(r.status))throw Object.assign(Error('OpenRouter HTTP '+r.status),{fatal:true});throw Error('OpenRouter HTTP '+r.status);}
  const j=await r.json();if(j.error)throw Error('OpenRouter provider error');if(j.choices?.[0]?.finish_reason==='length')throw Error('Incomplete model response');return parseJSON(j.choices?.[0]?.message?.content);
 }catch(e){if(e.fatal)throw e;last=e;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,10000*(attempt+1)));}}
 throw last;
}
