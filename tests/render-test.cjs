/* Chạy toàn bộ mã giao diện trong Node với DOM giả để bắt lỗi dựng giao diện (không thay thế kiểm thử trên trình duyệt thật). */
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function boot(saved){
  const els={},handlers={};
  const mk=()=>({innerHTML:'',textContent:'',inert:false,dataset:{},style:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},append(){},remove(){},setAttribute(){},focus(){},closest(){return null},matches(){return false},querySelector(){return null},querySelectorAll(){return[]}});
  const store=saved?{'wedding-planner-local-v1':JSON.stringify(saved)}:{};
  const ls={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v},removeItem:k=>{delete store[k]}};
  const win={SHEET_CONFIG:{webAppUrl:''},localStorage:ls,addEventListener(){},location:{hash:'',pathname:'/',search:''},history:{replaceState(){}},confirm:()=>true,prompt:()=>null,scrollTo(){}};
  const doc={querySelector:s=>els[s]??=mk(),querySelectorAll:()=>[],addEventListener:(t,f)=>{(handlers[t]??=[]).push(f)},createElement:()=>mk(),head:mk(),body:mk(),documentElement:mk()};
  Object.assign(win,{window:win,document:doc,localStorage:ls,location:win.location,history:win.history,console,Intl,Date,JSON,Math,crypto:require('node:crypto').webcrypto,setTimeout:()=>0,clearTimeout(){},Object,Array,String,Number,Map,Set,Error,Promise,URL,Blob:class{},CSS:{escape:s=>s},FormData:class{},TextEncoder,TextDecoder,navigator:{},requestAnimationFrame:f=>f()});
  vm.createContext(win);
  for(const f of ['sheet-config.js','sheet-schema.js','sheet-sync.js','stats.js','charts.js','xlsx.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),win,{filename:f});
  return {html:()=>els['#app'].innerHTML,modal:()=>els['#modal-root'].innerHTML,store,
    change:(filter,value)=>{for(const h of handlers.change)h({target:{matches:q=>q==='[data-filter]',dataset:{filter},value}})},
    click:(action,dataset={})=>{const el={dataset:{action,...dataset},type:'button'};for(const h of handlers.click)h({target:{closest:()=>el,matches:()=>false}})}};
}
const base=extra=>({version:2,meta:{bride:'A',groom:'B',weddingDate:'',venue:'',tableSize:4,budgetTarget:'',...extra},schedule:[],todos:[],budget:[],guestGroups:[]});

// 1) Ngày cưới trống
let app=boot(base());
assert.match(app.html(),/Đang chọn ngày lành/);assert.doesNotMatch(app.html(),/còn \d+ ngày|đã qua/);
app=boot(base({weddingDate:'2027-03-16'}));
assert.doesNotMatch(app.html(),/Đang chọn ngày lành/);assert.match(app.html(),/16\/03\/2027/);

// 2) Ngân sách: trống, rồi có dữ liệu
app=boot(base());app.click('tab',{key:'budget'});
assert.match(app.html(),/Chưa đặt tổng ngân sách mục tiêu/);assert.match(app.html(),/Lịch thanh toán/);assert.doesNotMatch(app.html(),/class="donut"/);
const b=(id,category,estimate,actual,paid,due='')=>({id,name:'Khoản '+id,category,estimate,actual,paid,vendor:'NCC',due,note:''});
const st=base({budgetTarget:'140000000'});
st.budget=[b('1','Nhà hàng',100000000,120000000,50000000,'2020-01-01'),b('2','Hoa',10000000,'','','2999-01-01'),b('3','Trang phục',30000000,20000000,20000000)];
app=boot(st);app.click('tab',{key:'budget'});
let h=app.html();
assert.match(h,/class="donut"/);assert.match(h,/chart-progress over/);assert.match(h,/Vượt mục tiêu/);
assert.match(h,/Quá hạn/);assert.match(h,/Khoản 1/);assert.match(h,/hbar-row/);
const toneOf=(html,label)=>html.split('class="metric tone-').slice(1).map(part=>[part.split('"')[0],part.slice(0,part.indexOf('metric-value'))]).find(([,head])=>head.includes('</svg>'+label))?.[0];
assert.equal(toneOf(h,'Chi phí thực tế'),'wait');      // 140tr thực tế = 140tr dự trù
assert.equal(toneOf(h,'Chưa thanh toán'),'danger');     // còn nợ
assert.equal(toneOf(h,'Tổng dự trù'),'info');
const over=base({budgetTarget:'1'});over.budget=[b('1','A',100,150,150),b('2','B',50,50,50)];
app=boot(over);app.click('tab',{key:'budget'});h=app.html();
assert.equal(toneOf(h,'Chi phí thực tế'),'danger');     // 200 thực tế > 150 dự trù
assert.equal(toneOf(h,'Chưa thanh toán'),'good');       // đã trả hết
const under=base();under.budget=[b('1','A',100,60,10)];app=boot(under);app.click('tab',{key:'budget'});
assert.equal(toneOf(app.html(),'Chi phí thực tế'),'info');
app=boot(st);app.click('tab',{key:'budget'});
app.click('budget-target');assert.match(app.modal(),/Tổng ngân sách mục tiêu/);

// 2b) Lọc và sắp xếp khoản chi
app.change('budgetSort','cost-desc');
h=app.html();assert.ok(h.indexOf('Khoản 1')<h.indexOf('Khoản 3')&&h.indexOf('Khoản 3')<h.indexOf('Khoản 2</div>'));
app.change('budgetStatus','paid');h=app.html();
const rows=h.slice(h.indexOf('<tbody>'));assert.match(rows,/Khoản 3/);assert.doesNotMatch(rows,/Khoản 1</);
app.change('budgetStatus','all');app.change('budgetSort','default');

// 3) Khách mời: thống kê, cảnh báo, thiệp, bộ lọc
const gp=(id,name,rsvp,plus=0,x={})=>({id,name,rsvp,plus,phone:'',table:'',invited:false,checkedCount:0,note:'',...x});
const gst=base();gst.guestGroups=[{id:'g1',name:'Nhà trai',guests:[gp('1','Nguyễn Văn A','yes',1,{table:'1',invited:true,phone:'0901 234 567'}),gp('2','Trần B','pending',0,{invited:true}),gp('3','Lê C','no')]},{id:'g2',name:'Nhà gái',guests:[gp('4','nguyen van a','yes',4,{table:'1'}),gp('5','Võ D','pending')]}];
app=boot(gst);app.click('tab',{key:'guests'});h=app.html();
assert.match(h,/Cơ cấu xác nhận/);assert.match(h,/stackbar/);assert.match(h,/Trùng tên/);assert.match(h,/Bàn 1 có 7 người, vượt sức chứa 4/);
assert.match(h,/href="tel:09012345\d+"/);assert.match(h,/zalo\.me\/0901234567/);
assert.match(h,/aria-pressed="true"/);assert.match(h,/1 người chưa được xếp bàn|2 người chưa được xếp bàn/);
app.click('toggle-invited',{id:'5',group:'g2'});assert.match(JSON.stringify(JSON.parse(app.store['wedding-planner-local-v1']).guestGroups[1].guests[1].invited),/true/);
app.change('guestInvite','unsent');h=app.html();const list=h.slice(h.indexOf('guest-list'));
assert.doesNotMatch(list,/Trần B/);assert.doesNotMatch(list,/Lê C/);assert.match(list,/nguyen van a/);
app.change('guestInvite','all');app.change('guestSort','name');assert.match(app.html(),/Võ D/);
app.click('invite-group',{id:'g1'});assert.ok(JSON.parse(app.store['wedding-planner-local-v1']).guestGroups[0].guests.filter(x=>x.rsvp!=='no').every(x=>x.invited));
app=boot(base());app.click('tab',{key:'guests'});assert.doesNotMatch(app.html(),/Cơ cấu xác nhận/);
// 4) To-do: nút hoàn thành / hoàn tác thay cho nhân bản
const tst=base();tst.todos=[{id:'t1',title:'Việc một',category:'Khác',priority:'normal',due:'',assignee:'',status:'doing',notes:''}];
app=boot(tst);app.click('tab',{key:'todo'});h=app.html();
assert.doesNotMatch(h,/duplicate-todo|Nhân bản/);
assert.match(h,/data-action="complete-todo" data-id="t1"[^>]*aria-label="Đánh dấu hoàn thành: Việc một"/);
const savedTodos=()=>JSON.parse(app.store['wedding-planner-local-v1']).todos;
app.click('complete-todo',{id:'t1'});h=app.html();
assert.equal(savedTodos()[0].status,'done');assert.equal(savedTodos().length,1);
assert.match(h,/class="icon-btn small is-done" data-action="complete-todo"/);
assert.match(h,/aria-label="Chuyển về chưa hoàn thành: Việc một"/);assert.match(h,/todo-completed/);
app.click('complete-todo',{id:'t1'});h=app.html();
assert.equal(savedTodos()[0].status,'open');assert.match(h,/aria-label="Đánh dấu hoàn thành: Việc một"/);assert.doesNotMatch(h,/is-done|todo-completed/);

// 5) To-do: nút Đang làm và thứ tự Đang làm / Hoàn thành / Sửa / Xóa
const pst=base();pst.todos=[{id:'t1',title:'Việc một',category:'Khác',priority:'normal',due:'',assignee:'',status:'open',notes:''}];
app=boot(pst);app.click('tab',{key:'todo'});
const order=()=>[...app.html().matchAll(/data-action="(progress-todo|complete-todo|edit-todo|delete-todo)"/g)].map(m=>m[1]);
const todo=()=>JSON.parse(app.store['wedding-planner-local-v1']).todos[0].status;
assert.deepEqual(order(),['progress-todo','complete-todo','edit-todo','delete-todo']);
assert.match(app.html(),/class="icon-btn small can-start" data-action="progress-todo" data-id="t1"[^>]*aria-label="Chuyển sang đang làm: Việc một"/);
app.click('progress-todo',{id:'t1'});assert.equal(todo(),'doing');
assert.match(app.html(),/class="icon-btn small is-doing" data-action="progress-todo"[^>]*aria-label="Tạm dừng, chuyển về chưa làm: Việc một"/);
app.click('progress-todo',{id:'t1'});assert.equal(todo(),'open');
app.click('progress-todo',{id:'t1'});app.click('complete-todo',{id:'t1'});assert.equal(todo(),'done');   // đang làm -> hoàn thành
assert.match(app.html(),/class="icon-btn small can-start" data-action="progress-todo"/);
app.click('progress-todo',{id:'t1'});assert.equal(todo(),'doing');                                       // đã xong -> làm lại
assert.doesNotMatch(app.html(),/todo-completed/);

console.log('PASS: dựng giao diện ngày cưới trống, ngân sách, khách mời, nút hoàn thành To-do');
