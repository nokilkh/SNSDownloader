const {target, enumerate, mediaURL} = require('./sources');

function postLink(value) {
  const uri = new URL(value.trim());
  if (uri.protocol !== 'https:' || uri.username || uri.password || uri.port) throw new Error('invalid-post-link');
  const host = uri.hostname.replace(/^www\./,'');
  if (['x.com','twitter.com'].includes(host)) {
    const match = uri.pathname.match(/^\/(\w+)\/status\/(\d+)(?:\/(?:photo|video)\/\d+)?\/?$/i);
    if (match) {
      const account = target('X',match[1]);
      return {platform:'X',account,id:match[2],url:'https://x.com/'+account.handle+'/status/'+match[2]};
    }
  }
  if (host === 'instagram.com') {
    const match = uri.pathname.match(/^\/(p|reel)\/([\w-]{1,32})\/?$/);
    if (match) return {platform:'IG',id:match[2],url:'https://www.instagram.com/'+match[1]+'/'+match[2]+'/'};
  }
  if (host === 'tiktok.com') {
    const match = uri.pathname.match(/^\/@([\w.]+)\/(photo|video)\/(\d+)\/?$/);
    if (match) {
      const account = target('TikTok',match[1]);
      return {platform:'TikTok',account,id:match[3],url:'https://www.tiktok.com/@'+account.handle+'/'+match[2]+'/'+match[3]};
    }
  }
  throw new Error('invalid-post-link');
}

function instagramEmbedPost(html, shortcode, url = 'https://www.instagram.com/p/'+shortcode+'/') {
  let item;
  for (const [literal] of html.matchAll(/"(?:[^"\\]|\\.)*"/g)) {
    if (!literal.includes('shortcode_media') || !literal.includes('gql_data')) continue;
    try {
      const candidate = JSON.parse(JSON.parse(literal))?.gql_data?.shortcode_media;
      if (candidate?.shortcode === shortcode) {item=candidate;break;}
    } catch {}
  }
  const accountId = String(item?.owner?.id || '');
  const id = String(item?.id || '');
  if (!/^\d+$/.test(id) || !/^\d+$/.test(accountId) || typeof item.owner.username !== 'string') {
    throw new Error('unverified');
  }
  const {handle} = target('IG',item.owner.username);
  const entries = item.edge_sidecar_to_children?.edges ?? [{node:item}];
  if (!Array.isArray(entries) || !entries.length) throw new Error('unverified');
  const media = entries.flatMap((entry,order) => {
    const node = entry?.node;
    const mediaId = String(node?.id || '');
    if (!/^\d+$/.test(mediaId)) return [];
    if (node.is_video) {
      if (entries.length > 1 && !mediaURL(node.video_url)) return [];
      return [{id:mediaId,order:order+1,type:'video',ext:'mp4',altState:'na',
        urls:[node.video_url].filter(mediaURL),postUrl:url,videoUseTool:entries.length===1}];
    }
    const resources = Array.isArray(node.display_resources) ? node.display_resources : [];
    const variants = resources.filter(resource=>resource && mediaURL(resource.src))
      .sort((a,b)=>b.config_width*b.config_height-a.config_width*a.config_height);
    const urls = [...new Set([...variants.map(resource=>resource.src),node.display_url].filter(mediaURL))];
    if (!urls.length) return [];
    return [{id:mediaId,order:order+1,type:'image',ext:'jpg',altState:'na',urls,
      width:Number(node.dimensions?.width)||0,height:Number(node.dimensions?.height)||0}];
  });
  if (!media.length) throw new Error('unverified');
  const timestamp = Number(item.taken_at_timestamp);
  const date = new Date(timestamp*1000);
  return {platform:'IG',account:handle,accountId,id,date:timestamp>0 && Number.isFinite(+date)?date.toISOString():null,
    text:item.edge_media_to_caption?.edges?.[0]?.node?.text || '',kind:url.includes('/reel/')?'reel':'post',
    url,media,expected:entries.length,memberships:[]};
}

async function readLinkedPost(link, signal, cookieFile) {
  if (link.platform !== 'IG') {
    const result = await enumerate(link.account,'posts',link.url,cookieFile,signal);
    const post = result.posts.find(item=>item.id===link.id);
    if (!post || (link.url.includes('/photo/') && !post.media.some(media=>media.type==='image'))) {
      throw Object.assign(new Error('unverified'),{code:result.errors[0] || 'unverified'});
    }
    return post;
  }
  const response = await fetch(link.url+'embed/',{
    signal:AbortSignal.any([signal,AbortSignal.timeout(20000)]),redirect:'error'
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error('HTTP '+response.status);
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > 2*1024*1024) throw new Error('unverified');
    chunks.push(chunk);
  }
  return instagramEmbedPost(Buffer.concat(chunks).toString('utf8'),link.id,link.url);
}

module.exports = {postLink, instagramEmbedPost, readLinkedPost};
