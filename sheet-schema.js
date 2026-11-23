/* Cùng một sơ đồ dữ liệu dùng cho website và kiểm thử Node.js. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SheetSchema = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const dataColumns = {
    'Cài đặt': ['Khóa', 'Giá trị'],
    'Lịch trình': ['ID', 'Ngày', 'Bắt đầu', 'Kết thúc', 'Sự kiện', 'Loại', 'Địa điểm', 'Phụ trách', 'Trạng thái', 'Ghi chú', 'Mốc chính'],
    'Checklist': ['ID', 'ID sự kiện', 'Việc cần làm', 'Hoàn thành'],
    'Công việc': ['ID', 'Công việc', 'Danh mục', 'Ưu tiên', 'Hạn', 'Phụ trách', 'Trạng thái', 'Ghi chú', 'Nguồn'],
    'Nhóm khách': ['ID', 'Tên nhóm', 'Thứ tự'],
    'Khách mời': ['ID', 'ID nhóm', 'Họ tên', 'Số điện thoại', 'Người đi cùng', 'Xác nhận', 'Đã đến', 'Bàn', 'Đã gửi thiệp', 'Ghi chú'],
    'Ngân sách': ['ID', 'Khoản chi', 'Danh mục', 'Dự trù (VND)', 'Thực tế (VND)', 'Đã thanh toán (VND)', 'Nhà cung cấp', 'Hạn', 'Ghi chú']
  };
  const names = Object.keys(dataColumns);
  const columns = Object.fromEntries(names.map(name => [name, ['STT', ...dataColumns[name]]]));
  const str = value => value == null ? '' : String(value);
  const number = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  const optionalMoney = value => value == null || str(value).trim() === '' ? '' : number(value);
  const bool = value => value === true || /^(true|1|yes|có|da|đã)$/i.test(str(value).trim());
  const rowsFor = (state) => ({
    'Cài đặt': Object.entries(state.meta).map(([key, value]) => [key, value]),
    'Lịch trình': state.schedule.map(x => [x.id, x.date, x.start, x.end, x.title, x.kind, x.venue, x.owner, x.status, x.notes, !!x.major]),
    'Checklist': state.schedule.flatMap(x => (x.tasks || []).map(t => [t.id, x.id, t.title, !!t.done])),
    'Công việc': state.todos.map(x => [x.id, x.title, x.category, x.priority, x.due, x.assignee, x.status, x.notes, x.origin || '']),
    'Nhóm khách': state.guestGroups.map((g, i) => [g.id, g.name, i + 1]),
    'Khách mời': state.guestGroups.flatMap(g => g.guests.map(p => [p.id, g.id, p.name, p.phone || '', number(p.plus), p.rsvp || 'pending', number(p.checkedCount), p.table || '', !!p.invited, p.note || ''])),
    'Ngân sách': state.budget.map(x => [x.id, x.name, x.category, optionalMoney(x.estimate), optionalMoney(x.actual), optionalMoney(x.paid), x.vendor || '', x.due || '', x.note || ''])
  });
  const matrixFor = state => Object.fromEntries(names.map(name => [name, [columns[name], ...rowsFor(state)[name].map((row, index) => [index + 1, ...row])]]));
  function parse(matrices, fallback) {
    const body = name => {
      const rows = matrices[name];
      if (!Array.isArray(rows) || !rows.length) throw Error(`Thiếu tab ${name}.`);
      const hasSerial = str(rows[0][0]) === 'STT';
      const expected = hasSerial ? columns[name] : dataColumns[name];
      if (expected.some((h, i) => str(rows[0][i]) !== h)) throw Error(`Sai tên cột trong tab ${name}.`);
      return rows.slice(1).map(row => hasSerial ? row.slice(1) : row).filter((row, index) => {
        if (str(row[0]).trim()) return true;
        if (row.slice(1).some(v => v !== false && str(v).trim() !== '')) throw Error(`Tab ${name}, dòng ${index+2}: thiếu ID/khóa ở cột A.`);
        return false;
      });
    };
    const meta = {...fallback.meta};
    for (const [key, value] of body('Cài đặt')) if (Object.hasOwn(meta, key)) meta[key] = key === 'tableSize' ? Math.max(1, Math.floor(number(value) || 10)) : str(value);
    const schedule = body('Lịch trình').map(r => ({id:str(r[0]), date:str(r[1]), start:str(r[2]), end:str(r[3]), title:str(r[4]), kind:str(r[5]), venue:str(r[6]), owner:str(r[7]), status:str(r[8]) || 'planned', notes:str(r[9]), major:bool(r[10]), tasks:[]}));
    const events = new Map(schedule.map(x => [x.id, x]));
    for (const r of body('Checklist')) { const event = events.get(str(r[1])); if (!event) throw Error(`Checklist có ID sự kiện không tồn tại: ${str(r[1])}`); event.tasks.push({id:str(r[0]), title:str(r[2]), done:bool(r[3])}); }
    const todos = body('Công việc').map(r => ({id:str(r[0]), title:str(r[1]), category:str(r[2]), priority:str(r[3]), due:str(r[4]), assignee:str(r[5]), status:str(r[6]), notes:str(r[7]), origin:str(r[8])}));
    const guestGroups = body('Nhóm khách').map(r => ({id:str(r[0]), name:str(r[1]), order:number(r[2]), guests:[]})).sort((a,b) => a.order - b.order).map(({order, ...g}) => g);
    const groups = new Map(guestGroups.map(g => [g.id, g]));
    for (const r of body('Khách mời')) { const group = groups.get(str(r[1])); if (!group) throw Error(`Khách mời có ID nhóm không tồn tại: ${str(r[1])}`); group.guests.push({id:str(r[0]), name:str(r[2]), phone:str(r[3]), plus:number(r[4]), rsvp:str(r[5]) || 'pending', checkedCount:number(r[6]), table:str(r[7]), invited:bool(r[8]), note:str(r[9])}); }
    const budget = body('Ngân sách').map(r => ({id:str(r[0]), name:str(r[1]), category:str(r[2]), estimate:optionalMoney(r[3]), actual:optionalMoney(r[4]), paid:optionalMoney(r[5]), vendor:str(r[6]), due:str(r[7]), note:str(r[8])}));
    return {version:2, meta, schedule, todos, budget, guestGroups};
  }
  return {columns, dataColumns, names, rowsFor, matrixFor, parse};
});
