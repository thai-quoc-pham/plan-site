const assert=require('node:assert/strict');
const x=require('../xlsx.js');
assert.equal(x.crc32(new TextEncoder().encode('123456789')),0xCBF43926);
assert.equal(x.colName(0),'A');assert.equal(x.colName(25),'Z');assert.equal(x.colName(26),'AA');
assert.equal(x.xml('a<b>&"\'\u0001'),'a&lt;b&gt;&amp;&quot;&apos;');
(async()=>{
  const rows=[['Họ tên','Số tiền'],['Nguyễn <A> & B',1500000],['',0]];
  const buf=await x.excelBlob(rows).arrayBuffer();
  assert.equal(new Uint8Array(buf)[0],0x50);                                // "PK"
  const files=await x.unzip(buf);
  assert.deepEqual(Object.keys(files).sort(),['[Content_Types].xml','_rels/.rels','xl/_rels/workbook.xml.rels','xl/workbook.xml','xl/worksheets/sheet1.xml']);
  const sheet=files['xl/worksheets/sheet1.xml'];
  assert.match(sheet,/Nguyễn &lt;A&gt; &amp; B/);assert.match(sheet,/<c r="B2"><v>1500000<\/v><\/c>/);
  assert.deepEqual(x.readCSV('﻿Tên;SĐT\r\n"A; B";0901\r\nC;"1""2"\r\n'),[['Tên','SĐT'],['A; B','0901'],['C','1"2']]);
  assert.deepEqual(x.readCSV('a,b\n1,2'),[['a','b'],['1','2']]);
  await assert.rejects(()=>x.unzip(new ArrayBuffer(10)));
  console.log('PASS: xlsx: CRC32, ZIP/XLSX ghi-đọc, escape XML, CSV có dấu ngoặc và dấu chấm phẩy');
})().catch(e=>{console.error(e);process.exitCode=1});
