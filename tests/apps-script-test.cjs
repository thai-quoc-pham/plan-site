const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const vm=require('node:vm');
const schema=require('../sheet-schema.js');
const base={version:2,meta:{bride:'Dâu',groom:'Rể',weddingDate:'2027-03-16',venue:'',tableSize:10},schedule:[],todos:[],budget:[],guestGroups:[]};
const data=schema.matrixFor(base);
const sheets=Object.fromEntries(schema.names.map(name=>[name,{
  name,maxRows:1000,
  getLastRow(){return data[name].length},
  getMaxRows(){return this.maxRows},
  insertRowsAfter(_,count){this.maxRows+=count},
  getRange(row,col,height,width){return{
    getValues(){return Array.from({length:height},(_,i)=>Array.from({length:width},(_,j)=>data[name][row-1+i]?.[col-1+j]??''))},
    clearContent(){for(let i=row-1;i<row-1+height;i++){data[name][i]??=[];for(let j=col-1;j<col-1+width;j++)data[name][i][j]=''}return this},
    insertCheckboxes(){return this},
    setValues(rows){for(let i=0;i<rows.length;i++){data[name][row-1+i]??=[];for(let j=0;j<rows[i].length;j++)data[name][row-1+i][col-1+j]=rows[i][j];if(col===2&&data[name][0][0]==='STT')data[name][row-1+i][0]=row-1+i}return this},
    setFormulas(rows){for(let i=0;i<rows.length;i++){data[name][row-1+i]??=[];data[name][row-1+i][col-1]=rows[i][0]}return this}
  }}
}]));
const props={pw:'mat-khau-test'};
const mime={JSON:'json',JAVASCRIPT:'javascript'};
const context={
  SpreadsheetApp:{openById:id=>{assert.equal(id,'1s2dMJTbWsNWWQVhfWqozZsfrl6300EFnG5x1euFo7qw');return{getSheetByName:name=>sheets[name]}},flush:()=>{}},
  Utilities:{sleep:()=>{},DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,value)=>Array.from(crypto.createHash('sha256').update(value).digest()),formatDate:(d,tz,pattern)=>'FMT:'+pattern},
  Session:{getScriptTimeZone:()=> 'Asia/Ho_Chi_Minh'},
  LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
  ContentService:{MimeType:mime,createTextOutput:content=>({content,setMimeType(type){this.type=type;return this}})},
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>k==='WEB_PASSWORD'?props.pw:null})},
  console:{error:()=>{}},JSON,Date,Array,Object,String,Number,Error
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('apps-script/Code.gs','utf8'),context);
const get=()=>JSON.parse(context.doGet({parameter:{key:'mat-khau-test'}}).content);
const post=body=>JSON.parse(context.doPost({postData:{contents:JSON.stringify({key:'mat-khau-test',...body})}}).content);
data['Cài đặt'].push([99,'weddingDate',vm.runInNewContext('new Date(0)')]);   // Date thuộc realm khác
const dateCheck=get();assert.equal(dateCheck.matrices['Cài đặt'].at(-1)[2],'FMT:yyyy-MM-dd');
data['Cài đặt'].pop();
const first=get();assert.equal(first.ok,true);assert.equal(Object.keys(first.matrices).length,7);
const todo=['t1','Đặt thiệp','Thiệp & khách mời','normal','2027-03-01','Cả hai','open','',''];
const budget=['b1','Đặt cọc','Khác',1000,900,100,'','',''];
let result=post({changes:{'Công việc':[todo],'Ngân sách':[budget]},expected:{'Công việc':first.revisions['Công việc'],'Ngân sách':first.revisions['Ngân sách']}});
assert.equal(result.ok,true);
const second=get();assert.equal(second.matrices['Công việc'][1][2],'Đặt thiệp');assert.equal(second.matrices['Ngân sách'][1][4],1000);
assert.equal(second.matrices['Công việc'][1][0],1);
result=post({changes:{'Công việc':[[...todo.slice(0,1),'Bị ghi đè',...todo.slice(2)]]},expected:{'Công việc':first.revisions['Công việc']}});
assert.equal(result.ok,false);assert.match(result.error,/đã thay đổi/);
result=post({changes:{'Công việc':[[...todo.slice(0,1),'=IMPORTXML("x","y")',...todo.slice(2)]]},expected:{'Công việc':second.revisions['Công việc']}});
assert.equal(result.ok,false);assert.match(result.error,/dấu =/);
result=post({changes:{'Tab lạ':[]},expected:{}});assert.equal(result.ok,false);
const jsonp=context.doGet({parameter:{callback:'__sheet_cb_test',key:'mat-khau-test'}}).content;
assert.match(jsonp,/^__sheet_cb_test\(\{"ok":true/);
data['Ngân sách']=[schema.dataColumns['Ngân sách'],budget];
const legacy=get();assert.equal(legacy.matrices['Ngân sách'][0][0],'ID');
result=post({changes:{'Ngân sách':[budget]},expected:{'Ngân sách':legacy.revisions['Ngân sách']}});
assert.equal(result.ok,true);
const bad=JSON.parse(context.doGet({parameter:{key:'sai'}}).content);assert.equal(bad.ok,false);assert.match(bad.error,/^AUTH:/);
assert.equal(JSON.parse(context.doGet({parameter:{}}).content).ok,false);
const badPost=JSON.parse(context.doPost({postData:{contents:JSON.stringify({key:'sai',changes:{'Công việc':[todo]},expected:{}})}}).content);
assert.equal(badPost.ok,false);assert.match(badPost.error,/^AUTH:/);
props.pw='';assert.equal(get().ok,false);props.pw='mat-khau-test';
console.log('PASS: Apps Script đọc/ghi cấu trúc cũ và mới, giữ STT, chặn xung đột và công thức');
