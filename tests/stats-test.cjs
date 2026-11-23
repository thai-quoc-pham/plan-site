const assert=require('node:assert/strict');
const stats=require('../stats.js');
const b=(id,category,estimate,actual,paid,due='')=>({id,name:id,category,estimate,actual,paid,vendor:'',due,note:''});
const budget=[b('a','Nhà hàng',100,120,50,'2027-01-10'),b('b','Nhà hàng',50,'','', '2027-03-01'),b('c','Trang phục',30,20,20,'2027-01-12'),b('d','Hoa','','','','')];
const r=stats.budgetStats(budget,{target:300,expectedGuests:40,tableSize:10,today:'2027-01-11'});
assert.equal(r.est,180);assert.equal(r.actual,140);assert.equal(r.paid,70);
// dự kiến chi = thực tế nếu có, không thì dự trù
assert.equal(r.projected,120+50+20);
assert.equal(r.target,300);assert.equal(r.targetUsedPct,Math.round(190/300*100));assert.equal(r.overTarget,false);assert.equal(r.targetRemaining,110);
assert.deepEqual(r.byCategory.map(c=>c.cat),['Nhà hàng','Trang phục']);
assert.deepEqual(r.byCategory[0],{cat:'Nhà hàng',est:150,actual:120,paid:50,projected:170,count:2});
assert.equal(r.byCategory.length,2); // khoản chưa có giá không vào biểu đồ
assert.equal(r.uncosted,1);
// lịch thanh toán: còn nợ = chi phí - đã trả
assert.deepEqual(r.payments.map(p=>[p.id,p.owed,p.state]),[['a',70,'overdue'],['b',50,'later']]);
assert.equal(r.overdueTotal,70);assert.equal(r.soonTotal,0);
assert.equal(r.perGuest,Math.round(190/40));assert.equal(r.perTable,Math.round(190/4));
const soon=stats.budgetStats([b('x','K',10,10,0,'2027-01-20')],{target:0,expectedGuests:0,tableSize:10,today:'2027-01-11'});
assert.equal(soon.payments[0].state,'soon');assert.equal(soon.soonTotal,10);
assert.equal(soon.target,0);assert.equal(soon.targetUsedPct,null);assert.equal(soon.perGuest,null);
const over=stats.budgetStats([b('x','K',500,'','')],{target:300,today:'2027-01-11'});
assert.equal(over.overTarget,true);assert.equal(over.targetRemaining,-200);

const g=(id,name,guests)=>({id,name,guests});
const p=(id,name,rsvp,plus=0,extra={})=>({id,name,rsvp,plus,phone:'',table:'',invited:false,checkedCount:0,...extra});
const groups=[
 g('g1','Nhà trai',[p('1','Nguyễn Văn A','yes',1,{table:'1',invited:true,checkedCount:2}),p('2','Trần B','pending',0,{invited:true}),p('3','Lê C','no',2),p('4','Hà D','maybe',0,{phone:'0901 234 567'})]),
 g('g2','Nhà gái',[p('5','nguyen van a','yes',0,{table:'1'}),p('6','Phạm E','yes',3,{table:'1',phone:'0901234567'}),p('7','Võ F','pending')])
];
const s=stats.guestStats(groups,{tableSize:4});
assert.deepEqual(s.people,{yes:2+1+4,pending:2,maybe:1,no:0}); // người "no" không tính
assert.deepEqual(s.entries,{yes:3,pending:2,maybe:1,no:1});
assert.equal(s.expected,s.people.yes+s.people.pending+s.people.maybe);
assert.equal(s.arrived,2);
assert.deepEqual(s.byGroup.map(x=>[x.name,x.yes,x.pending,x.maybe,x.expected]),[['Nhà trai',2,1,1,4],['Nhà gái',5,1,0,6]]);
assert.equal(s.invited,2);assert.equal(s.notInvited,4);          // chưa gửi thiệp, không tính khách từ chối
assert.equal(s.awaitingReply,1);                                  // đã gửi thiệp nhưng chưa phản hồi
// bàn: A(2)+nguyen van a(1)+E(4)=7 > 4
assert.deepEqual(s.overfullTables,[{table:'1',count:7}]);
assert.equal(s.unassigned,3);                                     // B(1)+D(1)+F(1) người chưa có bàn
assert.deepEqual(s.duplicates.map(d=>[d.type,d.names.length]),[['name',2],['phone',2]]);

// Màu thẻ "Chi phí thực tế" và "Chưa thanh toán"
assert.equal(stats.actualTone(100,80,true,true),'info');      // nhỏ hơn dự trù: cùng màu với dự trù
assert.equal(stats.actualTone(100,100,true,true),'wait');     // bằng: vàng
assert.equal(stats.actualTone(100,120,true,true),'danger');   // lớn hơn: đỏ
assert.equal(stats.actualTone(0,0,false,false),'neutral');    // chưa có số liệu
assert.equal(stats.actualTone(0,50,false,true),'neutral');    // chưa có dự trù để so sánh
assert.equal(stats.owedTone(1,true),'danger');                // còn nợ: đỏ
assert.equal(stats.owedTone(0,true),'good');                  // trả hết: mint
assert.equal(stats.owedTone(0,false),'neutral');
console.log('PASS: màu thẻ ngân sách theo so sánh thực tế/dự trù và công nợ');
