import {mkdir,copyFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
const check=spawnSync(process.execPath,['scripts/validate-public.mjs'],{stdio:'inherit'});if(check.status!==0)throw Error('Public validation failed');
// Explicit public files only; no private archive, scripts or repository history.
for(const file of ['index.html','styles.css','app.mjs','core.mjs','coverage.mjs','v2.mjs','map.mjs','impact.mjs','heat-status.mjs','intelligence.mjs','intelligence-ui.mjs','assets/geography.json','data/news.json','data/intelligence.json','data/impact.json']){await mkdir(dirname('public-site/'+file),{recursive:true});await copyFile(file,'public-site/'+file);}
