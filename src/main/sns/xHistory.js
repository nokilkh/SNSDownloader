const dayMs=86400000;
const firstDay=Date.parse('2006-03-21')/dayMs;
const hkOffset=8*3600000;
const calendarDay=time=>Math.floor((time+hkOffset)/dayMs);
const iso=day=>new Date(day*dayMs).toISOString().slice(0,10);

function dateSearchUrl(handle,from,until) {
  const query=encodeURIComponent(`from:${handle} since:${from} until:${until}`);
  return 'https://x.com/search?q='+query+'&f=live';
}

// Intervals are Hong Kong calendar days, with an exclusive upper bound. Today's results can change.
function addRange(ranges,start,end) {
  if(start>=end)return ranges;
  const merged=[];
  for(const [left,right] of [...ranges,[start,end]].sort((a,b)=>a[0]-b[0])){
    const last=merged.at(-1);
    if(last && left<=last[1])last[1]=Math.max(last[1],right);
    else merged.push([left,right]);
  }
  return merged;
}

async function scanHistory({ranges=[],search,save,commit,report,now=Date.now(),floor=firstDay,until,wait,accountFloor=()=>firstDay}){
  const today=calendarDay(now);
  let end=until??today+1,days=Infinity;
  while(end>Math.max(floor,accountFloor())){
    const covered=ranges.find(([a,b])=>a<end && end<=b);
    if(covered){end=covered[0];continue;}
    const prior=ranges.filter(([,b])=>b<end).at(-1);
    const monthStart=Date.parse(iso(end-1).slice(0,7)+"-01")/dayMs;
    const start=Math.max(monthStart,floor,accountFloor(),end-days,prior?.[1]??floor);
    const window={from:iso(start),through:iso(end-1)};
    report({...window,state:'searching'});
    const result=await search(iso(start-1),iso(end));
    const errors=new Set(result.errors);
    const valid=result.posts.filter(post=>{
      const time=Date.parse(post.date);
      if(Number.isFinite(time))return calendarDay(time)>=start && calendarDay(time)<end;
      errors.add('x-date-unverified');
      return false;
    });
    for(const issue of await save(valid))errors.add(issue);
    if(errors.size===1 && errors.has('rate-limit') && wait){
      report({...window,state:'cooldown'});
      await wait(15*60*1000);
      continue;
    }
    if(errors.size){report({...window,state:'pending'});return [...errors];}
    if(result.posts.length>=200 && end-start>1){
      days=Math.ceil((end-start)/2);
      continue;
    }
    ranges=addRange(ranges,start,Math.min(end,today));
    await commit(ranges);
    end=start;
    days=Infinity;
  }
  report({state:'searched'});
  return [];
}
module.exports={scanHistory,dateSearchUrl};
