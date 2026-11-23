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
  for(const f of ['sheet-config.js','sheet-schema.js','sheet-sync.js','stats.js','charts.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),win,{filename:f});
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
app.click('budget-target');assert.match(app.modal(),/Tổng ngân sách mục tiêu/);

// 2b) Lọc và sắp xếp khoản chi
app.change('budgetSort','cost-desc');
h=app.html();assert.ok(h.indexOf('Khoản 1')<h.indexOf('Khoản 3')&&h.indexOf('Khoản 3')<h.indexOf('Khoản 2</div>'));
app.change('budgetStatus','paid');h=app.html();
const rows=h.slice(h.indexOf('<tbody>'));assert.match(rows,/Khoản 3/);assert.doesNotMatch(rows,/Khoản 1</);
app.change('budgetStatus','all');app.change('budgetSort','default');

// 3) Chuyển qua tab khách mời không lỗi
app.click('tab',{key:'guests'});assert.match(app.html(),/Khách mời/);
console.log('PASS: dựng giao diện ngày cưới trống, ngân sách có/không dữ liệu, tab khách mời');
