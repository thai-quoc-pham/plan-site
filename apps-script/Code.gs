  /**
   * Dán vào Extensions → Apps Script của chính file Google Sheets này.
   * Triển khai Web app: Execute as me; Who has access: Anyone.
   * Endpoint chỉ đọc/ghi bảy tab được khai báo, không dùng DriveApp.
   */
  const SPREADSHEET_ID = '1s2dMJTbWsNWWQVhfWqozZsfrl6300EFnG5x1euFo7qw';
  const COLUMNS = {
    'Cài đặt': ['Khóa', 'Giá trị'],
    'Lịch trình': ['ID', 'Ngày', 'Bắt đầu', 'Kết thúc', 'Sự kiện', 'Loại', 'Địa điểm', 'Phụ trách', 'Trạng thái', 'Ghi chú', 'Mốc chính'],
    'Checklist': ['ID', 'ID sự kiện', 'Việc cần làm', 'Hoàn thành'],
    'Công việc': ['ID', 'Công việc', 'Danh mục', 'Ưu tiên', 'Hạn', 'Phụ trách', 'Trạng thái', 'Ghi chú', 'Nguồn'],
    'Nhóm khách': ['ID', 'Tên nhóm', 'Thứ tự'],
    'Khách mời': ['ID', 'ID nhóm', 'Họ tên', 'Số điện thoại', 'Người đi cùng', 'Xác nhận', 'Đã đến', 'Bàn', 'Đã gửi thiệp', 'Ghi chú'],
    'Ngân sách': ['ID', 'Khoản chi', 'Danh mục', 'Dự trù (VND)', 'Thực tế (VND)', 'Đã thanh toán (VND)', 'Nhà cung cấp', 'Hạn', 'Ghi chú']
  };
  const NAMES = Object.keys(COLUMNS);
const HEADERS = Object.fromEntries(NAMES.map(name => [name, ['STT'].concat(COLUMNS[name])]));
  const BOOLEAN_COLS = {'Lịch trình':11,'Checklist':4,'Khách mời':9};
  // Mọi cột khác được ghi dạng văn bản, để Sheets không đổi "0901234567" thành 901234567 hay tự đổi chuỗi ngày.
  const NUMBER_COLS = {'Nhóm khách':[3],'Khách mời':[5,7],'Ngân sách':[4,5,6]};

  // Mật khẩu nằm trong Project Settings → Script Properties, khóa WEB_PASSWORD (không nằm trong mã).
  function authorize_(key) {
    const expected = String(PropertiesService.getScriptProperties().getProperty('WEB_PASSWORD') || '');
    if (expected.length < 8) throw new Error('Chưa đặt mật khẩu WEB_PASSWORD trong Script Properties (tối thiểu 8 ký tự).');
    const given = String(key || '');
    let diff = given.length ^ expected.length;
    for (let i = 0; i < expected.length; i++) diff |= (given.charCodeAt(i) || 0) ^ expected.charCodeAt(i);
    if (diff !== 0) { Utilities.sleep(1000); throw new Error('AUTH: Sai mật khẩu.'); }
  }

  function output_(value, callback) {
    const json = JSON.stringify(value);
    if (callback) {
      if (!/^__sheet_cb_[a-z0-9]+$/.test(callback)) throw new Error('Callback không hợp lệ.');
      return ContentService.createTextOutput(callback + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  }

  function sheet_(book, name) {
    const sheet = book.getSheetByName(name);
    if (!sheet) throw new Error('Thiếu tab ' + name);
    return sheet;
  }

  function value_(value, name, column) {
    // Không dùng instanceof: Date từ Sheets có thể thuộc realm khác trong Apps Script.
    if (Object.prototype.toString.call(value) === '[object Date]') {
      const pattern = name === 'Lịch trình' && (column === 2 || column === 3) ? 'HH:mm' : 'yyyy-MM-dd';
      return Utilities.formatDate(value, Session.getScriptTimeZone(), pattern);
    }
    return value == null ? '' : value;
  }

  function matrix_(book, name) {
    const sheet = sheet_(book, name);
  const serial = sheet.getRange(1, 1, 1, 1).getValues()[0][0] === 'STT';
  const width = COLUMNS[name].length + (serial ? 1 : 0);
    const values = sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), width).getValues()
    .map(row => row.map((value, column) => value_(value, name, column - (serial ? 1 : 0))));
  const expected = serial ? HEADERS[name] : COLUMNS[name];
  if (expected.some((heading, index) => values[0][index] !== heading)) throw new Error('Sai tiêu đề tab ' + name);
    while (values.length > 1 && values[values.length - 1].every(value => value === '')) values.pop();
    return values;
  }

function dataRows_(matrix) {
  return matrix.slice(1).map(row => matrix[0][0] === 'STT' ? row.slice(1) : row);
}

  function revision_(rows) {
    const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(rows));
    return bytes.map(byte => ('0' + ((byte + 256) % 256).toString(16)).slice(-2)).join('');
  }

  function snapshot_() {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) throw new Error('Sheet đang được cập nhật, vui lòng thử lại.');
    try {
      const book = SpreadsheetApp.openById(SPREADSHEET_ID);
      const matrices = {}, revisions = {};
      NAMES.forEach(name => {
        const matrix = matrix_(book, name);
        matrices[name] = matrix;
      revisions[name] = revision_(dataRows_(matrix));
      });
      return {ok:true, matrices, revisions};
    } finally { lock.releaseLock(); }
  }

  function doGet(e) {
    const callback = String((e && e.parameter && e.parameter.callback) || '');
    try { authorize_(e && e.parameter && e.parameter.key); return output_(snapshot_(), callback); }
    catch (error) { return output_({ok:false,error:String(error.message || error)}, callback); }
  }

  function validateRows_(name, rows) {
    if (!Array.isArray(rows) || rows.length > 5000) throw new Error('Quá nhiều dòng ở tab ' + name);
    const width = COLUMNS[name].length;
    return rows.map((row, index) => {
      if (!Array.isArray(row) || row.length !== width) throw new Error('Sai số cột ở tab ' + name + ', dòng ' + (index + 2));
      return row.map(value => {
        if (typeof value === 'string') {
          if (value.length > 10000) throw new Error('Một ô có quá nhiều ký tự.');
          if (value.startsWith('=')) throw new Error('Nội dung bắt đầu bằng dấu = không được chấp nhận.');
          return value;
        }
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'boolean') return value;
        if (value === null) return '';
        throw new Error('Kiểu dữ liệu không hợp lệ.');
      });
    });
  }

  function doPost(e) {
    const lock = LockService.getScriptLock();
    try {
      const body = String((e && e.postData && e.postData.contents) || '');
      if (body.length > 600000) throw new Error('Yêu cầu quá lớn.');
      const request = JSON.parse(body);
      authorize_(request.key);
      const changes = request.changes || {};
      const names = Object.keys(changes);
      if (!names.length || names.some(name => !NAMES.includes(name))) throw new Error('Tên tab không hợp lệ.');
      const rowsByName = Object.fromEntries(names.map(name => [name, validateRows_(name, changes[name])]));
      if (!lock.tryLock(30000)) throw new Error('Sheet đang được cập nhật, vui lòng thử lại.');
      const book = SpreadsheetApp.openById(SPREADSHEET_ID);
      const currentByName = {};
      names.forEach(name => {
        const current = matrix_(book, name);
        currentByName[name] = current;
        if (revision_(dataRows_(current)) !== request.expected[name]) throw new Error('Tab ' + name + ' đã thay đổi.');
      });
      names.forEach(name => {
        const sheet = sheet_(book, name);
        const rows = rowsByName[name], width = COLUMNS[name].length;
        const serial = currentByName[name][0][0] === 'STT';
        const firstDataColumn = serial ? 2 : 1;
        const previousMax = sheet.getMaxRows();
        if (rows.length + 1 > previousMax) {
          sheet.insertRowsAfter(previousMax, rows.length + 1 - previousMax);
          if (serial) {
            const formulas = Array.from({length:rows.length + 1 - previousMax}, (_, index) => {
              const row = previousMax + 1 + index;
              return [`=IFERROR(COUNTA($B$2:B${row})/(B${row}<>""))`];
            });
            sheet.getRange(previousMax + 1, 1, formulas.length, 1).setFormulas(formulas);
          }
        }
        const oldRows = currentByName[name].length - 1;
        if (oldRows) sheet.getRange(2, firstDataColumn, oldRows, width).clearContent();
        if (BOOLEAN_COLS[name] && rows.length > oldRows) {
          sheet.getRange(oldRows + 2, BOOLEAN_COLS[name] + (serial ? 1 : 0), rows.length - oldRows, 1).insertCheckboxes();
        }
        if (rows.length) {
          for (let column = 1; column <= width; column++) {
            if (column === BOOLEAN_COLS[name] || (NUMBER_COLS[name] || []).includes(column)) continue;
            sheet.getRange(2, firstDataColumn + column - 1, rows.length, 1).setNumberFormat('@');
          }
          sheet.getRange(2, firstDataColumn, rows.length, width).setValues(rows);
        }
      });
      SpreadsheetApp.flush();
      return output_({ok:true});
    } catch (error) {
      console.error(error);
      return output_({ok:false,error:String(error.message || error)});
    } finally {
      try { lock.releaseLock(); } catch (_) {}
    }
  }
