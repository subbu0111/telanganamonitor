export const readingSources = [
 ['The Hindu','https://www.thehindu.com/',['India','Andhra Pradesh','Telangana','Tamil Nadu']],
 ['The Indian Express','https://indianexpress.com/',['India','Telangana','Tamil Nadu']],
 ['NDTV.com','https://www.ndtv.com/',['India','Andhra Pradesh','Telangana','Tamil Nadu']],
 ['Times of India','https://timesofindia.indiatimes.com/',['India','Andhra Pradesh','Telangana','Tamil Nadu']],
 ['Hindustan Times','https://www.hindustantimes.com/',['India']],
 ['The New Indian Express','https://www.newindianexpress.com/',['India','Andhra Pradesh','Telangana','Tamil Nadu']],
 ['Deccan Chronicle','https://www.deccanchronicle.com/',['India','Andhra Pradesh','Telangana','Tamil Nadu']],
 ['Telangana Today','https://telanganatoday.com/',['Telangana']],
 ['Siasat','https://www.siasat.com/',['Telangana']],
 ['The News Minute','https://www.thenewsminute.com/',['Andhra Pradesh','Telangana','Tamil Nadu']],
 ['DT Next','https://www.dtnext.in/',['Tamil Nadu']],
 ['Citizen Matters','https://citizenmatters.in/',['India','Telangana','Tamil Nadu']],
 ['Scroll.in','https://scroll.in/',['India']],
 ['IndiaSpend','https://www.indiaspend.com/',['India']],
 ['Mongabay India','https://india.mongabay.com/',['India']],
 ['India Water Portal','https://www.indiawaterportal.org/',['India']],
 ['Factly','https://factly.in/',['India','Andhra Pradesh','Telangana']],
 ['BBC News India','https://www.bbc.com/news/world/asia/india',['India']],
 ['Press Information Bureau','https://www.pib.gov.in/',['India']],
 ['Global Voices India','https://globalvoices.org/-/world/south-asia/india/',['India']]
].map(([name,url,places])=>({name,url,places}));

export function countLabel(n){return n>0?`${n} source article${n===1?'':'s'}`:'Coverage not yet available';}
export function readingFor(region=''){return readingSources.filter(s=>!region||s.places.includes(region)||s.places.includes('India'));}
export function coverageFallback(articles,{region='',district='',days=7},matches,now=Date.now()){
 if(!region)return {label:'',articles:[]};
 const parent=district?region:'';
 return {label:parent||'India',articles:articles.filter(a=>Date.parse(a.publishedAt)>=now-days*86400000&&Date.parse(a.publishedAt)<=now&&matches(a,parent,''))};
}
