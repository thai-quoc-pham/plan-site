/* Xuất/nhập Excel XLSX và CSV chạy offline, không thư viện. Dùng chung cho website và kiểm thử Node.js. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WeddingXlsx = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
/* ZIP store (không nén), xuất Excel XLSX chạy offline */
function crc32(arr){let c=0xffffffff;for(const b of arr){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0}
function encodeZip(files){const encoder=new TextEncoder(),parts=[],centers=[];let offset=0;const w16=(dv,i,v)=>dv.setUint16(i,v,true),w32=(dv,i,v)=>dv.setUint32(i,v,true);
 for(const [path,body] of files){const name=encoder.encode(path),data=typeof body==='string'?encoder.encode(body):body,checksum=crc32(data),header=new Uint8Array(30+name.length),dv=new DataView(header.buffer);w32(dv,0,0x04034b50);w16(dv,4,20);w16(dv,6,0x800);w16(dv,8,0);w32(dv,14,checksum);w32(dv,18,data.length);w32(dv,22,data.length);w16(dv,26,name.length);header.set(name,30);parts.push(header,data);
 const center=new Uint8Array(46+name.length),cdv=new DataView(center.buffer);w32(cdv,0,0x02014b50);w16(cdv,4,20);w16(cdv,6,20);w16(cdv,8,0x800);w16(cdv,10,0);w32(cdv,16,checksum);w32(cdv,20,data.length);w32(cdv,24,data.length);w16(cdv,28,name.length);w32(cdv,42,offset);center.set(name,46);centers.push(center);offset+=header.length+data.length;
 }
 const centerSize=centers.reduce((s,a)=>s+a.length,0),end=new Uint8Array(22),edv=new DataView(end.buffer);w32(edv,0,0x06054b50);w16(edv,8,files.length);w16(edv,10,files.length);w32(edv,12,centerSize);w32(edv,16,offset);
 return new Blob([...parts,...centers,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function xml(s){return String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch])).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'')}
function colName(n){let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s}
function excelBlob(rows){
 const sheet=`<?xml version="1.0" encoding="utf-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row,r)=>`<row r="${r+1}">${row.map((v,c)=>{const ref=colName(c)+(r+1);return typeof v==='number'&&Number.isFinite(v)?`<c r="${ref}"><v>${v}</v></c>`:`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`}).join('')}</row>`).join('')}</sheetData></worksheet>`;
 const files=[
 ['[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`],
 ['_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
 ['xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Danh sach" sheetId="1" r:id="rId1"/></sheets></workbook>`],
 ['xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`],
 ['xl/worksheets/sheet1.xml',sheet]
 ];return encodeZip(files);
}
/* đọc ZIP theo central directory, hỗ trợ store / deflate */
async function unzip(buffer){
 const bytes=new Uint8Array(buffer),dv=new DataView(buffer);let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(dv.getUint32(i,true)===0x06054b50){end=i;break}}if(end<0)throw Error('Không tìm thấy cấu trúc Excel XLSX.');
 const count=dv.getUint16(end+10,true),offset=dv.getUint32(end+16,true),decoder=new TextDecoder();let p=offset;const output={};
 for(let i=0;i<count;i++){
  if(dv.getUint32(p,true)!==0x02014b50)throw Error('Tệp Excel bị lỗi cấu trúc ZIP.');
  const method=dv.getUint16(p+10,true),size=dv.getUint32(p+20,true),len=dv.getUint16(p+28,true),extra=dv.getUint16(p+30,true),comment=dv.getUint16(p+32,true),local=dv.getUint32(p+42,true),name=decoder.decode(bytes.slice(p+46,p+46+len));p+=46+len+extra+comment;
  const localNameLen=dv.getUint16(local+26,true),localExtraLen=dv.getUint16(local+28,true),start=local+30+localNameLen+localExtraLen,raw=bytes.slice(start,start+size);
  if(!name.endsWith('.xml')&&!name.endsWith('.rels'))continue;
  if(method===0)output[name]=decoder.decode(raw);
  else if(method===8){if(typeof DecompressionStream==='undefined')throw Error('Trình duyệt không hỗ trợ giải nén XLSX. Dùng Chrome/Edge mới hoặc CSV.');const ds=new DecompressionStream('deflate-raw');output[name]=decoder.decode(await new Response(new Blob([raw]).stream().pipeThrough(ds)).arrayBuffer());}
  else throw Error('Định dạng nén Excel chưa được hỗ trợ.');
 }
 return output;
}
async function parseXLSX(buffer){
 const zip=await unzip(buffer),parser=new DOMParser(),str=zip['xl/sharedStrings.xml'];let shared=[];
 if(str){const doc=parser.parseFromString(str,'application/xml');shared=Array.from(doc.getElementsByTagName('si')).map(si=>Array.from(si.getElementsByTagName('t')).map(t=>t.textContent).join(''))}
 const target=Object.keys(zip).filter(k=>/^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()[0];if(!target)throw Error('Không tìm thấy trang tính Excel.');
 const doc=parser.parseFromString(zip[target],'application/xml');if(doc.getElementsByTagName('parsererror').length)throw Error('Không thể đọc XML trang tính.');
 return Array.from(doc.getElementsByTagName('row')).map(row=>{const arr=[];for(const cell of Array.from(row.getElementsByTagName('c'))){const m=cell.getAttribute('r')?.match(/^[A-Z]+/);let ci=arr.length;if(m){ci=0;for(const ch of m[0])ci=ci*26+ch.charCodeAt(0)-64;ci--}
  const ty=cell.getAttribute('t'),v=cell.getElementsByTagName('v')[0]?.textContent??'';
  arr[ci]=ty==='s'?(shared[Number(v)]??''):ty==='inlineStr'?Array.from(cell.getElementsByTagName('t')).map(n=>n.textContent).join(''):v;
 }return arr.map(x=>String(x??''))}).filter(r=>r.some(c=>c.trim()));
}
function readCSV(text){
 text=String(text||'').replace(/^\ufeff/,'');const first=text.split(/\r?\n/,1)[0],delimiter=['\t',';',','].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
  else if(c===delimiter&&!quoted){row.push(cell);cell=''}else if((c==='\r'||c==='\n')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell=''}else cell+=c;
 }row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
  return { crc32, encodeZip, xml, colName, excelBlob, unzip, parseXLSX, readCSV };
});
