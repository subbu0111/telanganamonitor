import {clean} from '../core.mjs';
export function discoverPublisherLinks(html,rule){
 const links=new Map();for(const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  let url;try{url=new URL(m[1],rule.url);}catch{continue;}
  const title=clean(m[2].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  if(url.protocol!=='https:'||!rule.hosts.includes(url.hostname)||url.pathname.split('/').filter(Boolean).length<2||title.length<35||title.length>240)continue;
  if(/\/(?:author|tag|topic|search|terms|privacy|about)(?:\/|$)/.test(url.pathname))continue;
  url.hash='';url.search='';links.set(url.href,{url:url.href,title,rule});
 }return [...links.values()].slice(0,60);
}
