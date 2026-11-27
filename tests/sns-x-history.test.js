const test=require('node:test');
const assert=require('node:assert/strict');
const {scanHistory}=require('../src/main/sns/xHistory');
const day=86400000;
const now=Date.parse('2026-11-22T12:00:00Z');
const floor=Math.floor(now/day)-74;

test('continues across empty slices, preserves partial rows and resumes only unfinished closed dates',async()=>{
  let ranges=[],last,limit=true;
  const saved=new Set(),queries=[];
  const run=()=>scanHistory({floor,now,ranges,report:r=>{last=r;},commit:r=>{ranges=r;},
    search:async(from,until)=>{
      queries.push([from,until]);
      if(from==='2026-09-30')return {posts:[{id:'old',date:from+"T16:00:00Z"}],errors:limit?['rate-limit']:[]};
      return {posts:[],errors:[]};
    },save:async posts=>{for(const p of posts)saved.add(p.id);return [];}});
  assert.deepEqual(await run(),['rate-limit']);
  assert.ok(saved.has('old'));
  assert.equal(last.state,'pending');
  const pending=queries.at(-1);
  queries.length=0;
  limit=false;
  assert.deepEqual(await run(),[]);
  assert.deepEqual(queries[1],pending);
  assert.deepEqual(queries[0],['2026-11-21','2026-11-23']);
  assert.equal(queries.at(-1)[0],'2026-09-08');
  assert.equal(last.state,'searched');
});

test('splits dense windows before committing coverage, abort and write failure leave the window pending',async()=>{
  const calls=[],commits=[];
  await assert.rejects(scanHistory({floor,now,report(){},commit:r=>commits.push(r),
    search:async(from,until)=>{
      calls.push([from,until]);
      return {posts:Array.from({length:calls.length===1?200:1},(_,i)=>({id:i,date:from+"T16:00:00Z"})),errors:[]};
    },save:async()=>{if(calls.length===2)throw Error('cancelled');return [];}}),/cancelled/);
  assert.deepEqual(calls,[['2026-10-31','2026-11-23'],['2026-11-11','2026-11-23']]);
  assert.deepEqual(commits,[]);
});

test('January to June saves each Hong Kong month and waits 15 minutes on repeated June limits',async()=>{
  const events=[];
  let limits=2;
  await scanHistory({floor:Date.parse('2019-01-01')/day,until:Date.parse('2019-07-01')/day,
    search:async(from,end)=>{events.push('search '+end);return {posts:[{date:from+'T16:00:00Z'}],errors:limits-->0?['rate-limit']:[]};},
    save:async posts=>{assert.equal(posts.length,1);events.push('save');return [];},
    wait:async ms=>{assert.equal(ms,900000);events.push('wait');},commit(){},report(){}});
  assert.deepEqual(events,['search 2019-07-01','save','wait','search 2019-07-01','save','wait',
    ...['07','06','05','04','03','02'].flatMap(m=>['search 2019-'+m+'-01','save'])]);
});
