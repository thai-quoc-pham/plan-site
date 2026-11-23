/* Đồng bộ ẩn danh qua Google Apps Script Web App chạy bằng quyền chủ Sheet. */
(function (root) {
  'use strict';
  const schema = root.SheetSchema;
  const config = root.SHEET_CONFIG;
  const QUEUE_KEY='wedding-planner-sheet-pending-v1',PASS_KEY='wedding-planner-sheet-key-v1';
  const fingerprint = (state, name) => JSON.stringify(schema.rowsFor(state)[name]);
  const endpoint = () => String(config.webAppUrl || '').trim();
  class SheetStore {
    constructor(onStatus, getState) {
      this.onStatus=onStatus;this.getState=getState;this.connected=false;
      let saved={};try{saved=JSON.parse(root.localStorage?.getItem(QUEUE_KEY)||'{}')||{}}catch{}
      this.revisions=saved.revisions||{};this.baseline={};
      this.pending=new Set((saved.pending||[]).filter(name=>schema.names.includes(name)));
      this.dirty=new Set(this.pending);this.busy=false;this.timer=null;this.error='';
    }
    status(message,error=false){this.error=error?message:'';this.onStatus(message,error)}
    saveQueue(){try{root.localStorage?.setItem(QUEUE_KEY,JSON.stringify({pending:[...this.dirty],revisions:this.revisions}))}catch{}}
    key(){try{return root.localStorage?.getItem(PASS_KEY)||''}catch{return ''}}
    setKey(value){try{value?root.localStorage?.setItem(PASS_KEY,value):root.localStorage?.removeItem(PASS_KEY)}catch{}}
    configured(){return /^https:\/\/script\.google\.com\/macros\/s\/[^/?#]+\/exec$/.test(endpoint())}
    async fetchSnapshot(){
      if(!this.configured())throw Error('Chưa cấu hình URL Apps Script trong sheet-config.js.');
      const callback='__sheet_cb_'+Math.random().toString(36).slice(2);
      return new Promise((resolve,reject)=>{
        const script=document.createElement('script');let done=false;
        const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);script.remove();delete root[callback];error?reject(error):resolve(value)};
        root[callback]=value=>finish(null,value);
        script.onerror=()=>finish(Error('Không tải được dữ liệu từ Apps Script. Kiểm tra URL triển khai và quyền truy cập.'));
        script.src=endpoint()+'?callback='+callback+'&key='+encodeURIComponent(this.key())+'&nonce='+Date.now()+'-'+Math.random().toString(36).slice(2);
        const timer=setTimeout(()=>finish(Error('Hết thời gian chờ Apps Script.')),20000);
        document.head.append(script);
      });
    }
    async snapshot(fallback){
      const result=await this.fetchSnapshot();
      if(!result?.ok){
        if(/^AUTH:/.test(result?.error||'')){this.setKey('');const e=Error('Sai mật khẩu. Hãy nhập lại.');e.auth=true;throw e}
        throw Error(result?.error||'Apps Script trả về lỗi.');
      }
      const state=schema.parse(result.matrices,fallback);
      return {state,revisions:result.revisions};
    }
    async connect(fallback){
      this.status('Đang tải Google Sheets…');
      const result=await this.snapshot(fallback);
      this.latestRevisions=result.revisions;
      const known=this.revisions;
      this.revisions={...result.revisions};
      for(const name of this.dirty)if(known[name])this.revisions[name]=known[name];
      this.baseline=Object.fromEntries(schema.names.map(name=>[name,fingerprint(result.state,name)]));
      this.connected=true;this.saveQueue();this.status('✓ Đã tải Google Sheets');
      return result.state;
    }
    async read(fallback){return (await this.snapshot(fallback)).state}
    queue(names){
      for(const name of names){this.pending.add(name);this.dirty.add(name)}
      this.saveQueue();
      if(!this.configured()){this.status('Chỉ lưu trên máy · Chưa triển khai Apps Script',true);return}
      if(!this.connected){this.status('Đang chờ tải Google Sheets…');return}
      clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),450);
      this.status('Chưa đồng bộ lên Google Sheets');
    }
    async postChanges(changes,expected){
      const response=await fetch(endpoint(),{method:'POST',mode:'no-cors',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({changes,expected,key:this.key()})});
      // Apps Script ContentService không trả CORS; xác nhận bằng lần đọc độc lập ngay sau POST.
      if(response.type!=='opaque'&&!response.ok)throw Error('Không gửi được dữ liệu tới Apps Script.');
    }
    async flush(){
      if(!this.connected||this.busy||!this.pending.size)return;
      this.busy=true;const names=[...this.pending];this.pending.clear();
      const local=this.getState(),all=schema.rowsFor(local);
      try{
        this.status('Đang đồng bộ Google Sheets…');
        const before=await this.snapshot(local);
        const toWrite=names.filter(name=>fingerprint(before.state,name)!==fingerprint(local,name));
        for(const name of toWrite)if(before.revisions[name]!==this.revisions[name])throw Error(`Tab ${name} đã thay đổi trên Google Sheets. Hãy tải lại trước khi sửa tiếp.`);
        if(toWrite.length)await this.postChanges(Object.fromEntries(toWrite.map(name=>[name,all[name]])),Object.fromEntries(toWrite.map(name=>[name,this.revisions[name]])));
        const after=toWrite.length?await this.snapshot(local):before;
        for(const name of names)if(fingerprint(after.state,name)!==fingerprint(local,name))throw Error(`Chưa xác nhận được dữ liệu ở tab ${name}. Kiểm tra Apps Script rồi thử đồng bộ lại.`);
        this.revisions=after.revisions;
        for(const name of names){
          this.baseline[name]=fingerprint(local,name);
          if(!this.pending.has(name)&&fingerprint(this.getState(),name)===fingerprint(local,name))this.dirty.delete(name);
        }
        this.saveQueue();
        this.status('✓ Đã đồng bộ Google Sheets');
      }catch(ex){for(const name of names)this.pending.add(name);this.saveQueue();this.status(ex.message||'Đồng bộ thất bại.',true)}
      finally{this.busy=false;if(this.pending.size&&!this.error){clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),450)}}
    }
    async overwrite(state){
      if(!this.connected)throw Error('Chưa tải được Google Sheets.');
      if(this.busy)throw Error('Đang đồng bộ. Vui lòng thử lại sau.');
      const all=schema.rowsFor(state);
      const before=await this.snapshot(state);
      await this.postChanges(all,before.revisions);
      const after=await this.snapshot(state);
      for(const name of schema.names)if(fingerprint(after.state,name)!==fingerprint(state,name))throw Error(`Chưa xác nhận được dữ liệu ở tab ${name}.`);
      this.revisions=after.revisions;
      this.baseline=Object.fromEntries(schema.names.map(name=>[name,fingerprint(state,name)]));
      this.pending.clear();this.dirty.clear();this.saveQueue();this.status('✓ Đã ghi dữ liệu lên Google Sheets');
    }
  }
  root.SheetStore=SheetStore;
})(window);
