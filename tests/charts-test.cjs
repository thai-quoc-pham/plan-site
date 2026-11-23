const assert=require('node:assert/strict');
const charts=require('../charts.js');
const fmt=n=>String(n);
assert.equal(charts.donut([],{fmt}),'');
assert.equal(charts.donut([{label:'A',value:0}],{fmt}),'');
const html=charts.donut([{label:'Nhà <hàng>',value:75},{label:'Hoa',value:25}],{fmt,centerValue:'100',centerLabel:'Tổng',ariaLabel:'Chi theo danh mục'});
assert.match(html,/role="img"/);assert.match(html,/aria-label="Chi theo danh mục: Nhà &lt;hàng&gt; 75%, Hoa 25%"/);
assert.match(html,/stroke-dasharray="75 25"/);assert.match(html,/stroke-dasharray="25 75"/);
assert.ok(!html.includes('Nhà <hàng>'));            // đã escape
assert.match(html,/75%/);assert.match(html,/>100</);
// quá 7 mục -> gộp phần đuôi thành "Khác"
const many=Array.from({length:10},(_,i)=>({label:'M'+i,value:10-i}));
const merged=charts.donut(many,{fmt});
assert.equal((merged.match(/<circle class="donut-seg"/g)||[]).length,8);assert.match(merged,/Khác/);
const bars=charts.bars([{label:'Nhà hàng',a:100,b:150},{label:'Hoa',a:0,b:0}],{series:[{key:'a',label:'Dự trù'},{key:'b',label:'Thực tế'}],fmt});
assert.match(bars,/width:66\.7%/);assert.match(bars,/width:100%/);assert.match(bars,/Dự trù/);
assert.equal(charts.bars([],{series:[],fmt}),'');
const st=charts.stack([{label:'Sẽ đến',value:3,color:'var(--green)'},{label:'Chưa trả lời',value:1,color:'var(--orange)'}],{fmt});
assert.match(st,/width:75%/);assert.match(st,/Sẽ đến/);assert.equal(charts.stack([{label:'x',value:0}],{fmt}),'');
const prog=charts.progress(120,100,{fmt,label:'Đã dùng'});
assert.match(prog,/chart-progress over/);assert.match(prog,/width:100%/);assert.match(prog,/role="progressbar"/);assert.match(prog,/aria-valuenow="120"/);
assert.match(charts.progress(40,100,{fmt}),/width:40%/);
console.log('PASS: biểu đồ SVG/HTML, escape, gộp mục nhỏ, tỉ lệ');
