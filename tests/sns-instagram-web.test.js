const test=require('node:test');
const assert=require('node:assert/strict');
const {instagramWebPosts,instagramWebScope}=require('../src/main/sns/instagramWeb');

const account={platform:'IG',handle:'example'};
const jar='# Netscape HTTP Cookie File\n'+
  '#HttpOnly_.instagram.com\tTRUE\t/\tTRUE\t0\tsessionid\tfixture-session\n'+
  '.instagram.com\tTRUE\t/\tTRUE\t0\tcsrftoken\tfixture-csrf\n'+
  '.example.com\tTRUE\t/\tTRUE\t0\tsessionid\tforeign-value\n';
const home='["DTSGInitialData",[],{"token":"fixture-page"}] ["LSD",[],{"token":"fixture-lsd"}] {"IG_USER_EIMU":"123"}';
const node={pk:'999999999999999919',code:'Sample',user:{pk:'123',username:'example'},
  caption:{text:'caption'},taken_at:1795000000,
  carousel_media:[{pk:'33',media_type:1,image_versions2:{candidates:[
    {url:'https://scontent.cdninstagram.com/thumb.jpg',width:10,height:10},
    {url:'https://scontent.cdninstagram.com/orig.jpg',width:3000,height:4000}
  ]}}]};
const page=(nodes,next)=>({data:{xdt_api__v1__feed__user_timeline_graphql_connection:{
  edges:nodes.map(node=>({node})),page_info:{has_next_page:Boolean(next),end_cursor:next}
}}});
const signal=new AbortController().signal;

test('reads two username pages with scoped cookies and stable media metadata',async()=>{
  const calls=[];
  const fetcher=async (url,options)=>{
    calls.push([url,options]);
    if(calls.length===1)return new Response(home);
    if(calls.length===2)return Response.json(page([node],'cursor-one'));
    return Response.json(page([{...node,pk:'999999999999999920'}],null));
  };
  const result=await instagramWebPosts(account,jar,signal,{fetcher,interval:0});
  assert.deepEqual(result.errors,[]);
  assert.equal(result.posts.length,2);
  assert.equal(result.posts[0].id,node.pk);
  assert.equal(result.posts[0].media[0].urls[0],'https://scontent.cdninstagram.com/orig.jpg');
  assert.equal(result.posts[0].media[0].altState,'na');
  assert.equal(calls[1][0],'https://www.instagram.com/api/graphql');
  assert.equal(JSON.parse(calls[2][1].body.get('variables')).after,'cursor-one');
  assert.equal(calls[1][1].headers['x-csrftoken'],'fixture-csrf');
  assert.doesNotMatch(calls[1][1].headers.cookie,/foreign-value/);
  assert.equal(calls[1][1].redirect,'manual');
});

test('returns a partial result for repeated cursors and stops on a login rejection',async()=>{
  let calls=0;
  const partial=await instagramWebPosts(account,jar,signal,{interval:0,fetcher:async()=>(
    ++calls===1?new Response(home):Response.json(page([node],'same'))
  )});
  assert.equal(partial.posts.length,1);
  assert.deepEqual(partial.errors,['ig-web-unverified']);
  const denied=await instagramWebPosts(account,jar,signal,{fetcher:async()=>new Response('',{status:403})});
  assert.deepEqual(denied,{posts:[],errors:['forbidden']});
});

test('uses a rotated Instagram CSRF cookie and reports the exact failing stage',async()=>{
  const htmlCookies=new Headers();
  htmlCookies.append('Set-Cookie','csrftoken=rotated-fixture; Domain=.instagram.com; Path=/; Secure');
  htmlCookies.append('Set-Cookie','sessionid=foreign-fixture; Domain=.example.com; Path=/; Secure');
  let calls=0;
  const result=await instagramWebPosts(account,jar,signal,{fetcher:async (_url,{headers})=>{
    if(++calls===1)return new Response(home,{headers:htmlCookies});
    assert.equal(headers['x-csrftoken'],'rotated-fixture');
    assert.match(headers.cookie,/sessionid=fixture-session/);
    assert.doesNotMatch(headers.cookie,/foreign-fixture/);
    return new Response('<html>fixture unexpected response</html>');
  }});
  assert.equal(calls,2);
  assert.deepEqual(result,{posts:[],errors:['ig-web-query']});
  const bootstrap=await instagramWebPosts(account,jar,signal,{fetcher:async()=>new Response('<html>fixture missing data</html>')});
  assert.deepEqual(bootstrap,{posts:[],errors:['ig-web-bootstrap']});
});

test('full IG backup follows 109 pages while a login probe reads one',async()=>{
  for(const probe of [false,true]){
    let pages=0,summary;
    const result=await instagramWebPosts(account,jar,signal,{interval:0,probe,onScan:value=>{summary=value;},
      fetcher:async(url,options)=>{
        if(url.endsWith('/'))return new Response(home);
        assert.equal(JSON.parse(options.body.get('variables')).after,pages?String(pages):undefined);
        pages++;
        assert.ok(pages<=109);
        const nodes=Array.from({length:pages===109?6:12},(_,i)=>({...node,pk:String(10000+12*pages+i)}));
        return Response.json(page(nodes,pages<109?String(pages):null));
      }});
    assert.equal(result.posts.length,probe?12:1302);
    assert.deepEqual(result.errors,[]);
    assert.deepEqual(summary,{pages:probe?1:109,posts:result.posts.length,stop:probe?'probe':'end'});
  }
});

test('reuses one Instagram session for reels, stories and highlights via GraphQL and media info',async()=>{
  const sessionBox={};
  const owned={...account,accountId:'123'};
  let homes=0, infoCalls=0;
  const fetcher=async(url,options)=>{
    const address=String(url);
    if(address==='https://www.instagram.com/'){homes++;return new Response(home);}
    if(address.includes('/api/graphql')){
      const docId=options.body.get('doc_id');
      const variables=JSON.parse(options.body.get('variables'));
      if(variables.data?.target_user_id){
        assert.equal(variables.data.target_user_id,'123');
        assert.equal(docId,'28170354102656082');
        return Response.json({data:{fetch__XDTUserDict:{clips_connection:{edges:[
          {node:{media:{pk:'999999999999999919',id:'999999999999999919_123',code:'Sample',media_type:2,
            user:{pk:'123',id:'123'},image_versions2:{candidates:[{url:'https://scontent.cdninstagram.com/thumb.jpg',width:10,height:10}]}}}},
          {node:{media:{pk:'888',id:'888_123',code:'ReelOnly',media_type:2,
            user:{pk:'123',id:'123'},image_versions2:{candidates:[{url:'https://scontent.cdninstagram.com/thumb.jpg',width:10,height:10}]}}}},
          {node:{media:{pk:'999',id:'999_456',code:'CollabReel',media_type:2,
            user:{pk:'456',id:'456'},image_versions2:{candidates:[{url:'https://scontent.cdninstagram.com/thumb.jpg',width:10,height:10}]}}}}
        ],page_info:{has_next_page:false}}}}});
      }
      if(variables.user_id==='123'){
        assert.equal(docId,'26970053832668570');
        return Response.json({data:{highlights:{edges:[{node:{id:'highlight:99',title:'Saved'}}],page_info:{has_next_page:false}}}});
      }
      if(Array.isArray(variables.reel_ids)){
        assert.equal(docId,'30276333305287704');
        assert.equal(variables.__relay_internal__pv__PolarisCommunityNoteStoriesLabelEnabledrelayprovider,true);
        if(variables.reel_ids[0]==='123'){
          return Response.json({data:{xdt_api__v1__feed__reels_media__connection:{edges:[],page_info:{has_next_page:false}}}});
        }
        assert.deepEqual(variables.reel_ids,['highlight:99']);
        return Response.json({data:{xdt_api__v1__feed__reels_media__connection:{edges:[{node:{
          id:'highlight:99',
          items:[{pk:'77',media_type:2,taken_at:1795000000,
            video_versions:[
              {url:'https://scontent.cdninstagram.com/hl-small.mp4',width:10,height:10},
              {url:'https://scontent.cdninstagram.com/hl-best.mp4',width:1080,height:1920}
            ]}]
        }}],page_info:{has_next_page:false}}}});
      }
      return Response.json(page([node],null));
    }
    if(address==='https://www.instagram.com/api/v1/media/888/info/'){
      infoCalls++;
      assert.equal(options.headers['x-requested-with'],'XMLHttpRequest');
      return Response.json({items:[{
        pk:'888',code:'ReelOnly',media_type:2,user:{pk:'123',username:'example'},taken_at:1795000000,
        caption:{text:'reel only'},video_versions:[
          {url:'https://scontent.cdninstagram.com/small.mp4',width:10,height:10},
          {url:'https://scontent.cdninstagram.com/best.mp4',width:1080,height:1920}
        ]
      }]});
    }
    throw new Error('unexpected '+address);
  };
  const posts=await instagramWebPosts(owned,jar,signal,{fetcher,interval:0,sessionBox});
  const knownPosts=new Map(posts.posts.map(post=>[post.id,post]));
  const reels=await instagramWebScope(owned,jar,signal,{scope:'reels',fetcher,interval:0,sessionBox,knownPosts});
  const stories=await instagramWebScope(owned,jar,signal,{scope:'story',fetcher,interval:0,sessionBox});
  const highlights=await instagramWebScope(owned,jar,signal,{scope:'highlight',fetcher,interval:0,sessionBox});
  assert.equal(homes,1);
  assert.equal(infoCalls,1);
  assert.equal(posts.posts.length,1);
  assert.deepEqual(reels.errors,[]);
  assert.equal(reels.posts.length,2);
  const hydrated=reels.posts.find(post=>post.id==='888');
  assert.equal(hydrated.kind,'reel');
  assert.equal(hydrated.text,'reel only');
  assert.equal(hydrated.date,'2026-11-18T11:06:40.000Z');
  assert.equal(hydrated.media[0].urls[0],'https://scontent.cdninstagram.com/best.mp4');
  assert.equal(hydrated.media[0].directBest,true);
  assert.equal(reels.posts.find(post=>post.id==='999999999999999919').kind,'reel');
  assert.deepEqual(stories,{posts:[],errors:[]});
  assert.equal(highlights.errors.length,0);
  assert.equal(highlights.posts[0].url,'https://www.instagram.com/stories/example/77/');
  assert.equal(highlights.posts[0].media[0].urls[0],'https://scontent.cdninstagram.com/hl-best.mp4');
  assert.equal(highlights.posts[0].media[0].directBest,true);
  assert.deepEqual(highlights.posts[0].memberships,[{id:'99',title:'Saved'}]);
});

test('resolves rotated story GraphQL doc_id and relay providers from Instagram JS bundle',async()=>{
  const owned={...account,accountId:'123'};
  const homeWithBundle=home+' <link href="https://static.cdninstagram.com/rsrc.php/v4/fixture-bundle.js">';
  const seen=[];
  const fetcher=async(url,options)=>{
    const address=String(url);
    if(address==='https://www.instagram.com/')return new Response(homeWithBundle);
    if(address==='https://static.cdninstagram.com/rsrc.php/v4/fixture-bundle.js'){
      return new Response(
        '__d("PolarisStoriesV3ReelPageGalleryQuery_instagramRelayOperation",[],(function(a,b,c,d,e,f){e.exports="999888777"}));'+
        '__d("PolarisStoriesV3ReelPageGalleryQuery$Parameters",["PolarisDynamicStoryFlag.relayprovider"],(function(){}));'
      );
    }
    if(address.includes('/api/graphql')){
      seen.push({docId:options.body.get('doc_id'),variables:JSON.parse(options.body.get('variables'))});
      return Response.json({data:{xdt_api__v1__feed__reels_media__connection:{edges:[{node:{
        id:'123',user:{pk:'123',username:'example'},
        items:[{pk:'555',media_type:1,taken_at:1795000000,
          image_versions2:{candidates:[{url:'https://scontent.cdninstagram.com/story.jpg',width:1080,height:1920}]}}]
      }}],page_info:{has_next_page:false}}}});
    }
    throw new Error('unexpected '+address);
  };
  const result=await instagramWebScope(owned,jar,signal,{scope:'story',fetcher,interval:0,sessionBox:{}});
  assert.deepEqual(result.errors,[]);
  assert.equal(result.posts.length,1);
  assert.equal(result.posts[0].id,'555');
  assert.equal(seen[0].docId,'999888777');
  assert.equal(seen[0].variables.__relay_internal__pv__PolarisDynamicStoryFlagrelayprovider,true);
});

test('an empty extra Instagram list is success and a rejected list stays in that scope',async()=>{
  const owned={...account,accountId:'123'};
  const empty=await instagramWebScope(owned,jar,signal,{scope:'reels',interval:0,fetcher:async url=>String(url).endsWith('/')?
    new Response(home):Response.json({data:{fetch__XDTUserDict:{connection:{edges:[],page_info:{has_next_page:false}}}}})});
  assert.deepEqual(empty,{posts:[],errors:[]});
  const denied=await instagramWebScope(owned,jar,signal,{scope:'story',fetcher:async url=>String(url).endsWith('/')?
    new Response(home):new Response('',{status:403})});
  assert.deepEqual(denied.posts,[]);
  assert.deepEqual(denied.errors,['stories-unverified']);
});

test('skips foreign collab posts on regular timeline while still rejecting unrelated profiles',async()=>{
  const collabNode={...node,pk:'888888888888888801',user:{pk:'456',username:'partner'},
    coauthor_producers:[{pk:'123',username:'example'}]};
  let calls=0;
  const mixed=await instagramWebPosts(account,jar,signal,{interval:0,fetcher:async()=>{
    if(++calls===1)return new Response(home);
    return Response.json(page([collabNode,node],null));
  }});
  assert.deepEqual(mixed.errors,[]);
  assert.equal(mixed.posts.length,1);
  assert.equal(mixed.posts[0].id,node.pk);

  let wrongCalls=0;
  const wrongUser={...node,pk:'888888888888888802',user:{pk:'999',username:'stranger'}};
  const rejected=await instagramWebPosts(account,jar,signal,{interval:0,fetcher:async()=>{
    if(++wrongCalls===1)return new Response(home);
    return Response.json(page([wrongUser],null));
  }});
  assert.equal(rejected.posts.length,0);
  assert.deepEqual(rejected.errors,['ig-web-identity']);
});

test('stops scanning Instagram JS bundles once the target GraphQL op is resolved',async()=>{
  const owned={...account,accountId:'123'};
  const homeWithTwoBundles=home+
    ' <link href="https://static.cdninstagram.com/rsrc.php/v4/first.js">'+
    ' <link href="https://static.cdninstagram.com/rsrc.php/v4/second.js">';
  const fetchedBundles=[];
  const fetcher=async(url)=>{
    const address=String(url);
    if(address==='https://www.instagram.com/')return new Response(homeWithTwoBundles);
    if(address.startsWith('https://static.cdninstagram.com/rsrc.php/')){
      fetchedBundles.push(address);
      return new Response(
        '__d("PolarisStoriesV3ReelPageGalleryQuery_instagramRelayOperation",[],(function(a,b,c,d,e,f){e.exports="111222333"}));'+
        '__d("PolarisStoriesV3ReelPageGalleryQuery$Parameters",["PolarisDynamicStoryFlag.relayprovider"],(function(){}));'
      );
    }
    return Response.json({data:{xdt_api__v1__feed__reels_media__connection:{edges:[],page_info:{has_next_page:false}}}});
  };
  const result=await instagramWebScope(owned,jar,signal,{scope:'story',fetcher,interval:0,sessionBox:{}});
  assert.deepEqual(result.errors,[]);
  assert.deepEqual(fetchedBundles,['https://static.cdninstagram.com/rsrc.php/v4/first.js']);
});
