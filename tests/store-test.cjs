const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const schema=require('../sheet-schema.js');
const memory=new Map();
const root={SheetSchema:schema,SHEET_CONFIG:{webAppUrl:'https://script.google.com/macros/s/test/exec'},localStorage:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)}};
vm.runInNewContext(fs.readFileSync('sheet-sync.js','utf8'),{window:root,setTimeout,clearTimeout,Date,JSON,String,Number,Error,Map,Set,fetch:()=>{}});
const base={version:2,meta:{bride:'A',groom:'B',weddingDate:'2027-03-16',venue:'',tableSize:10},schedule:[],todos:[],budget:[],guestGroups:[]};
const revisions=state=>Object.fromEntries(schema.names.map(name=>[name,JSON.stringify(schema.rowsFor(state)[name])]));
let local=structuredClone(base),remote=structuredClone(base),sent=[];
const notices=[];
const store=new root.SheetStore((message,error)=>notices.push([message,error]),()=>local);
store.snapshot=async()=>({state:structuredClone(remote),revisions:revisions(remote)});
store.postChanges=async(changes,expected)=>{
  sent.push(Object.keys(changes));
  for(const name of Object.keys(changes))assert.equal(expected[name],revisions(remote)[name]);
  const matrices=schema.matrixFor(remote);
  for(const [name,rows] of Object.entries(changes))matrices[name]=[schema.columns[name],...rows.map((row,index)=>[index+1,...row])];
  remote=schema.parse(matrices,remote);
};
(async()=>{
  // Mật khẩu từ link riêng: #k=...
  const keyStore=new root.SheetStore(()=>{},()=>local);
  assert.equal(keyStore.key(),'');
  assert.equal(keyStore.adoptKeyFromHash(''),false);
  assert.equal(keyStore.adoptKeyFromHash('#foo=bar'),false);
  assert.equal(keyStore.key(),'');
  assert.equal(keyStore.adoptKeyFromHash('#k=m%E1%BA%ADt%26kh%E1%BA%A9u+1'),true);
  assert.equal(keyStore.key(),'mật&khẩu+1');
  assert.equal(new root.SheetStore(()=>{},()=>local).key(),'mật&khẩu+1');
  assert.equal(keyStore.adoptKeyFromHash('#k='),false);
  assert.equal(keyStore.key(),'mật&khẩu+1');
  keyStore.setKey('');
  await store.connect(local);
  local.budget.push({id:'b1',name:'Chi thử',category:'Khác',estimate:1000,actual:900,paid:100,vendor:'',due:'',note:''});
  local.todos.push({id:'t1',title:'Việc thử',category:'Khác',priority:'normal',due:'',assignee:'',status:'open',notes:''});
  store.queue(['Ngân sách','Công việc']);clearTimeout(store.timer);
  await store.flush();
  assert.equal(sent.length,1);assert.equal(sent[0].length,2);
  assert.equal(remote.budget[0].name,'Chi thử');assert.equal(remote.todos[0].title,'Việc thử');
  assert.equal(store.pending.size,0);assert.match(notices.at(-1)[0],/Đã đồng bộ/);
  remote.todos[0].title='Sửa trên Sheet';local.todos[0].title='Sửa trên web';
  store.queue(['Công việc']);clearTimeout(store.timer);await store.flush();
  assert.equal(sent.length,1);assert.equal(store.pending.has('Công việc'),true);
  assert.match(notices.at(-1)[0],/đã thay đổi/);
  const restarted=new root.SheetStore(()=>{},()=>local);
  assert.equal(restarted.pending.has('Công việc'),true);
  await store.overwrite(local);
  assert.equal(remote.todos[0].title,'Sửa trên web');
  assert.equal(store.pending.size,0);
  assert.equal(new root.SheetStore(()=>{},()=>local).pending.size,0);
  // Bấm tiếp trong lúc đang đồng bộ: không được báo xung đột giả
  const basePost=store.postChanges,baseSnapshot=store.snapshot;
  const task=()=>({id:'t1',title:'Việc thử',category:'Khác',priority:'normal',due:'',assignee:'',status:'open',notes:''});
  local.todos=[task()];await store.overwrite(local);
  const lastNotice=()=>notices.at(-1);
  const run=async()=>{clearTimeout(store.timer);await store.flush();clearTimeout(store.timer)};
  store.postChanges=async(changes,expected)=>{await basePost(changes,expected);local.todos[0].status='done';store.queue(['Công việc']);clearTimeout(store.timer)};
  local.todos[0].status='doing';store.queue(['Công việc']);await run();
  assert.equal(lastNotice()[1],false,'bấm tiếp khi đang đồng bộ không phải là lỗi: '+lastNotice()[0]);
  assert.equal(remote.todos[0].status,'doing');assert.equal(store.pending.has('Công việc'),true);
  store.postChanges=basePost;await run();
  assert.equal(remote.todos[0].status,'done');assert.equal(store.pending.size,0);assert.equal(store.dirty.size,0);

  // Đã ghi được nhưng đọc lại thất bại (mạng chập chờn): lần sau tự nhận ra dữ liệu của chính mình
  let failNext=false;
  store.postChanges=async(changes,expected)=>{await basePost(changes,expected);failNext=true};
  store.snapshot=async state=>{if(failNext){failNext=false;throw Error('Hết thời gian chờ Apps Script.')}return baseSnapshot(state)};
  local.todos[0].status='open';store.queue(['Công việc']);await run();
  assert.equal(lastNotice()[1],true);assert.equal(remote.todos[0].status,'open');
  store.postChanges=basePost;local.todos[0].status='doing';store.queue(['Công việc']);await run();
  assert.equal(lastNotice()[1],false,lastNotice()[0]);assert.equal(remote.todos[0].status,'doing');

  // Tải lại trang sau lần đọc lại thất bại cũng phải tự phục hồi
  store.postChanges=async(changes,expected)=>{await basePost(changes,expected);failNext=true};
  local.todos[0].status='done';store.queue(['Công việc']);await run();
  store.postChanges=basePost;
  const again=new root.SheetStore((m,e)=>notices.push([m,e]),()=>local);
  again.snapshot=baseSnapshot;again.postChanges=basePost;
  local.todos[0].status='open';await again.connect(local);await again.flush();clearTimeout(again.timer);
  assert.equal(lastNotice()[1],false,lastNotice()[0]);assert.equal(remote.todos[0].status,'open');

  // Người khác sửa thật trên Sheet vẫn phải báo xung đột, và không ghi đè
  store.snapshot=baseSnapshot;await store.connect(local);store.pending.clear();store.dirty.clear();store.error='';
  remote.todos[0].title='Người khác sửa';local.todos[0].status='doing';store.queue(['Công việc']);await run();
  assert.match(lastNotice()[0],/đã thay đổi/);assert.match(lastNotice()[0],/Tải từ Sheet/);assert.equal(remote.todos[0].title,'Người khác sửa');

  console.log('PASS: không xung đột giả khi bấm liên tục hoặc mất mạng; mật khẩu từ link riêng; tự ghi hai tab, giữ thay đổi lỗi qua tải lại trang, phát hiện xung đột');
})().catch(error=>{console.error(error);process.exitCode=1});
