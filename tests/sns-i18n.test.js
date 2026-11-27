const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'src/renderer/sns/index.html'),'utf8');
const appSource=fs.readFileSync(path.join(root,'src/renderer/sns/app.js'),'utf8');
const mainSource=fs.readFileSync(path.join(root,'src/main/sns/main.js'),'utf8');

// 1. Language selector options must be ordered: Chinese, English, Japanese.
const selectMatch=/<select id="language"[^>]*>([\s\S]*?)<\/select>/.exec(html);
assert.ok(selectMatch,'Missing #language select element');
const options=[...selectMatch[1].matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)]
  .map(([,value,label])=>({value,label}));
assert.deepEqual(options,[
  {value:'zh-Hant',label:'繁體中文'},
  {value:'en',label:'English'},
  {value:'ja',label:'日本語'}
]);

// 2. Main process must allow zh-Hant, en, and ja.
assert.match(mainSource,/\['zh-Hant','en','ja'\]\.includes\(lang\)/);

// 3. No Cantonese colloquialisms in SNS UI or main process messages.
const cantonese=/[嘅喺揀冇搵唔睇吓畀]|呢[篇個次]|遲過|先會|先可|今次|讀到|未入|一條/;
for (const [name,content] of [
  ['src/renderer/sns/index.html',html],
  ['src/renderer/sns/app.js',appSource],
  ['src/main/sns/main.js',mainSource]
]) {
  const match=cantonese.exec(content);
  assert.equal(match,null,`Unexpected Cantonese phrasing "${match?.[0]}" in ${name}`);
}

// 4. Every static [data-t] string and dynamic UI dictionary entry must have both en and ja translations.
const sandbox={
  IntersectionObserver:class { observe(){} unobserve(){} disconnect(){} },
  Intl,
  document:{
    querySelectorAll:()=>[],
    getElementById:()=>null
  }
};
const sliceEnd=appSource.indexOf('const loginPending=');
assert.ok(sliceEnd>0,'Could not locate translation tables in app.js');
const tables=vm.runInNewContext(
  appSource.slice(0,sliceEnd)+'\n({translations,labels,loginCopy,phases,metrics,libraryTypes})',
  sandbox
);

const requiredKeys=new Set(['主選單','平台']);
for (const [,text] of html.matchAll(/<[^>]*\bdata-t\b[^>]*>([^<]+)<\/[^>]+>/g)) {
  requiredKeys.add(text);
}
for (const value of [
  ...Object.values(tables.labels),
  ...Object.values(tables.loginCopy),
  ...Object.values(tables.phases),
  ...tables.metrics.map(([,label])=>label),
  ...Object.values(tables.libraryTypes)
]) {
  requiredKeys.add(value);
}
// Also capture string literals passed directly to tr(...), btn(...), notice(...)
for (const [,text] of appSource.matchAll(/\b(?:tr|btn|notice)\('([^']+)'/g)) {
  requiredKeys.add(text);
}

for (const lang of ['en','ja']) {
  const dict=tables.translations[lang];
  assert.ok(dict,`Missing translation table for ${lang}`);
  const missing=[...requiredKeys].filter(key=>!Object.hasOwn(dict,key) || !dict[key]);
  assert.deepEqual(missing,[],`Missing ${lang} translations: ${missing.join(', ')}`);
}

// Ensure en and ja dictionaries cover the exact same key set.
assert.deepEqual(
  Object.keys(tables.translations.en).sort(),
  Object.keys(tables.translations.ja).sort(),
  'English and Japanese translation keys must match'
);

console.log(`SNS i18n checks passed (${requiredKeys.size} required keys verified for zh-Hant, en, ja).`);
