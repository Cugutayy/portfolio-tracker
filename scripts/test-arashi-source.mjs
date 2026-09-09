import test from 'node:test';
import assert from 'node:assert/strict';
const uid='c1IlgGbj09LvsTkQR4-mUA';
const row=()=>({id:'123',squareUid:uid,username:'realArashi',firstReleaseTime:Date.now(),bodyTextOnly:'Original author text',quoteContent:{bodyTextOnly:'Not author text'}});
let sequence=0;
async function call(raw,status=200,method='GET') {
  const {default:handler}=await import(`../api/arashi-source.js?test=${++sequence}`);
  const original=globalThis.fetch;
  globalThis.fetch=async()=>({status,json:async()=>raw});
  const res={setHeader(){},status(value){this.code=value;return this;},json(value){this.body=value;return this;}};
  try {await handler({method},res);return res;} finally {globalThis.fetch=original;}
}
const feed=contents=>({code:'000000',success:true,data:{contents}});
test('preserves publication evidence and excludes quoted text',async()=>{
  const result=await call(feed([row()]));
  assert.equal(result.code,200);
  assert.equal(result.body.posts[0].text,'Original author text');
  assert.equal(result.body.posts[0].url,'https://www.binance.com/en/square/post/123');
  assert.equal(result.body.author_id,uid);
});
test('rejects wrong author, empty feed and duplicates',async()=>{
  for(const rows of [[{...row(),squareUid:'wrong'}],[],[row(),row()]]) assert.equal((await call(feed(rows))).code,502);
});
test('blocked reads cannot be reported as successful empty scans',async()=>{
  const result=await call({},403);
  assert.equal(result.code,502);assert.equal(result.body.upstream_status,403);
  assert.equal((await call({},200,'POST')).code,405);
});
