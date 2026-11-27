const {spawnSync}=require('node:child_process');const fs=require('node:fs');const path=require('node:path');
for(const name of fs.readdirSync('tests').filter(f=>f.endsWith('.test.js'))){const r=spawnSync(process.execPath,[path.join('tests',name)],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
