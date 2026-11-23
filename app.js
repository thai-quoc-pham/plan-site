/* Kế hoạch đám cưới — lưu trên máy và tự đồng bộ Google Sheets qua Apps Script.
 * Các chức năng được xây dựng lại từ phần giao diện tham khảo truy cập được
 * và bản đặc tả độc lập; không phải mã nguồn của website gốc.
 */
(() => {
'use strict';
const KEY='wedding-planner-local-v1', MIGRATION_KEY='wedding-planner-anonymous-sync-v1', CURRENT_VERSION=2;
const Stats=window.WeddingStats,Charts=window.WeddingCharts;
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>Array.from(root.querySelectorAll(s));
const id=()=>('id-'+(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)));
const e=v=>String(v==null?'':v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const val=(v,f='')=>(v==null?f:String(v));
const num=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
const nonneg=v=>Math.max(0,num(v));
const optionalMoney=v=>v==null||String(v).trim()===''?'':nonneg(v);
const currency=n=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(num(n));
const budgetMoney=n=>n==null||String(n).trim()===''?'—':currency(n);
const miniMoney=n=>Math.abs(n)>=1000000000?(num(n)/1000000000).toLocaleString('vi-VN',{maximumFractionDigits:2})+' tỷ':Math.abs(n)>=1000000?(num(n)/1000000).toLocaleString('vi-VN',{maximumFractionDigits:1})+' tr':currency(n);
const dateVN=d=>{if(!d)return 'Chưa đặt';const t=new Date(d+'T12:00:00');return Number.isNaN(t.getTime())?'Chưa đặt':new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(t)};
const dayVN=d=>{const t=new Date(d+'T12:00:00');return Number.isNaN(t.getTime())?d:new Intl.DateTimeFormat('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(t)};
const WEDDING_PENDING='Đang chọn ngày lành';
const weddingText=d=>d?dateVN(d):WEDDING_PENDING;
const dateShort=d=>d?dateVN(d).slice(0,5):'—';
const today=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`};
const incDate=(d,n)=>{const t=new Date((d||today())+'T12:00:00');t.setDate(t.getDate()+n);return [t.getFullYear(),String(t.getMonth()+1).padStart(2,'0'),String(t.getDate()).padStart(2,'0')].join('-')};
const iconPaths={
calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
check:'<path d="m5 12 4 4L19 6"/>',checkCircle:'<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 6-6"/>',
clipboard:'<rect x="5" y="4" width="14" height="18" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h6"/>',
users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.2a4 4 0 0 1 0 7.6M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
wallet:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M16 15h2"/>',
plus:'<path d="M12 5v14M5 12h14"/>',search:'<circle cx="10.8" cy="10.8" r="7"/><path d="m16 16 5 5"/>',
chevron:'<path d="m9 18 6-6-6-6"/>',down:'<path d="m6 9 6 6 6-6"/>',up:'<path d="m6 15 6-6 6 6"/>',
trash:'<path d="M3 6h18M8 6V4h8v2M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',edit:'<path d="m15 5 4 4M4 20l5-1 11-11a3 3 0 0 0-4-4L5 15z"/>',
more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"/>',
briefcase:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12h18"/>',
arrowDown:'<path d="M12 3v17m-7-7 7 7 7-7"/>',arrowUp:'<path d="M12 21V4m-7 7 7-7 7 7"/>',
settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M4 4l2 2m12 12 2 2M2 12h2m16 0h2M4 20l2-2M18 6l2-2"/>',
file:'<path d="M6 2h8l5 5v15H6zM14 2v6h5M9 13h7M9 17h7"/>',
share:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',
mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/>',
heart:'<path d="M20.6 4.6a5.6 5.6 0 0 0-7.9 0L12 5.3l-.7-.7a5.6 5.6 0 0 0-7.9 7.9L12 21l8.6-8.5a5.6 5.6 0 0 0 0-7.9z"/>',
list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
table:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
filter:'<path d="M3 5h18l-7 8v5l-4 3v-8z"/>',
cloudOff:'<path d="m3 3 18 18M7 7A6 6 0 0 1 18 9a5 5 0 0 1 2 8M5 11a5 5 0 0 0 0 9h12"/>',
alert:'<path d="m12 3 10 18H2zM12 9v5M12 17h.01"/>',
people:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M21 20v-2a6 6 0 0 0-4-5.7"/>',
listCheck:'<path d="m3 7 2 2 3-4M12 7h9m-18 9 2 2 3-4m4 2h9"/>',
maximize:'<path d="M3 9V3h6M21 15v6h-6M3 3l7 7M21 21l-7-7"/>',
undo:'<path d="M3 9V3m0 6h6M3 9a9 9 0 1 1 1.3 7"/>',
star:'<path d="m12 2 3 6 7 .9-5 5 .9 7.1-5.9-3.4-5.9 3.4.9-7.1-5-5L9 8z"/>',
};
const ico=(name)=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75">${iconPaths[name]||iconPaths.info}</svg>`;
const btn=(txt,act,cls='btn',attrs='')=>`<button type="button" class="${cls}" data-action="${act}" ${attrs}>${txt}</button>`;
const initialGroups=['Họ hàng nhà trai','Bạn bè chú rể','Đồng nghiệp chú rể','Họ hàng nhà gái','Bạn bè cô dâu','Đồng nghiệp cô dâu'];
const SCHEDULE_TYPES=['Lễ gia tiên','Tiệc cưới','Chuẩn bị','Di chuyển','Chụp ảnh','Khác'];
const TODO_CATS=['Địa điểm & nhà hàng','Trang phục & làm đẹp','Chụp ảnh & quay phim','Thiệp & khách mời','Nghi lễ','Trang trí & hoa','Âm thanh & MC','Hậu cần','Khác'];
const BUDGET_CATS=['Nhà hàng & tiệc cưới','Trang phục','Nhẫn cưới & lễ vật','Chụp ảnh & quay phim','Trang trí & hoa','Thiệp & quà tặng','MC & âm thanh','Di chuyển','Khác'];
const PRIORITIES={low:'Thấp',normal:'Bình thường',high:'Quan trọng',urgent:'Khẩn cấp'};
const RSVP={pending:'Chưa phản hồi',yes:'Sẽ đến',maybe:'Đang cân nhắc',no:'Không đến'};
const TASK_STATES={open:'Chưa làm',doing:'Đang làm',done:'Hoàn thành'};
const EVENT_STATES={planned:'Dự kiến',ready:'Đã chuẩn bị',done:'Hoàn thành'};
/* Lịch ngày cưới dưới đây đối chiếu được từ website tham khảo (16/03/2027).
 * Hai ngày Dạm ngõ, Ăn hỏi và bộ To-do là phương án tham khảo do chúng ta biên soạn,
 * không phải dữ liệu đã xác minh từ các tab tương ứng trên website gốc. */
function scheduleTemplate(d){
 if(!d)return [];
 const day1=incDate(d,-31),day2=incDate(d,-2);
 const make=(date,start,end,title,kind,venue,owner,notes,tasks=[],major=false)=>({id:id(),date,start,end,title,kind,venue,owner,notes,status:'planned',major,tasks:tasks.map(title=>({id:id(),title,done:false}))});
 return [
  make(day1,'07:30','08:30','Chuẩn bị lễ dạm ngõ','Chuẩn bị','Nhà trai & nhà gái','Hai gia đình','Kiểm tra lễ vật, trang phục, thành phần tham dự và giờ di chuyển.',['Chuẩn bị trầu cau, lễ vật','Xác nhận người đại diện hai họ','Kiểm tra xe và lộ trình']),
  make(day1,'09:00','10:00','Nghi thức dạm ngõ','Lễ gia tiên','Nhà gái','Đại diện hai gia đình','1. Nhà trai chào hỏi và giới thiệu thành phần.\n2. Đại diện hai họ trao đổi dự định tổ chức hôn lễ.\n3. Thống nhất các mốc chuẩn bị tiếp theo.',['Sắp chỗ ngồi và trà nước','Thống nhất lịch ăn hỏi, đón dâu'],true),
  make(day1,'10:00','11:00','Gặp mặt, dùng trà và chụp ảnh','Khác','Nhà gái','Hai gia đình','Chụp ảnh lưu niệm, thống nhất các đầu mối liên hệ.',['Chụp ảnh hai gia đình']),
  make(day2,'06:30','07:30','Chuẩn bị mâm quả, trang phục','Chuẩn bị','Nhà trai','Đội bưng quả','Đếm số mâm quả, phân công người bê lễ, kiểm tra trang phục và phương tiện.',['Kiểm tra mâm quả đủ số lượng','Tập trung đội bưng quả','Kiểm tra phong bì, lễ vật']),
  make(day2,'08:00','09:00','Di chuyển đến nhà gái','Di chuyển','Từ nhà trai đến nhà gái','Người điều phối','Đi sớm để dự phòng tắc đường, xác nhận giờ đến với nhà gái.',['Báo giờ xuất phát cho nhà gái']),
  make(day2,'09:00','10:00','Lễ ăn hỏi','Lễ gia tiên','Nhà gái','Hai gia đình','1. Đón đoàn nhà trai và trao mâm quả.\n2. Giới thiệu đại diện hai họ.\n3. Phát biểu, trao lễ, thắp hương gia tiên.\n4. Cô dâu chú rể ra mắt và chụp ảnh.',['Nhận và sắp lễ vật','Chuẩn bị trà mời hai họ','Kiểm tra máy ảnh / quay phim'],true),
  make(day2,'10:00','11:30','Dùng tiệc, lại quả và kết thúc','Khác','Nhà gái','Đại diện hai gia đình','Nhắc đội bưng quả nhận lại mâm; kiểm kê lễ vật và đồ đạc.',['Lại quả cho nhà trai','Chụp hình hai gia đình']),
  make(d,'06:00','08:00','Trang điểm, chuẩn bị','Chuẩn bị','Nhà riêng','Cô dâu / chú rể','Chuẩn bị trang phục, phụ kiện và vật dụng mang theo.',['Cô dâu trang điểm','Chú rể chuẩn bị','Bố mẹ hai bên trang điểm']),
  make(d,'09:00','10:30','Lễ rước dâu','Lễ gia tiên','Nhà gái → nhà trai','Hai gia đình','1. Nhà trai đến, đại diện xin rước dâu\n2. Chú rể trao hoa cưới, cô dâu chú rể thắp hương\n3. Rót trà mời bố mẹ, nhận lời dặn dò\n4. Rước dâu về nhà trai',[],true),
  make(d,'10:30','11:00','Đón khách','Tiệc cưới','Sảnh tiệc','Đội lễ tân','Người hỗ trợ đứng đón khách, hướng dẫn chỗ ngồi.',[]),
  make(d,'11:00','12:00','Lễ thành hôn','Tiệc cưới','Sân khấu / sảnh cưới','MC / hai gia đình','1. MC khai mạc, giới thiệu hai gia đình\n2. Cô dâu chú rể tiến vào lễ đường\n3. Trao nhẫn, đọc lời hứa\n4. Đại diện gia đình phát biểu\n5. Rót rượu, cắt bánh, nâng ly',[],true),
  make(d,'12:00','14:00','Tiệc cưới','Tiệc cưới','Sảnh tiệc','Nhà hàng / điều phối','Phối hợp nhà hàng phục vụ đúng thực đơn, ghi nhận các tình huống phát sinh.',['Cô dâu chú rể đi chào bàn'],true)
 ];
}
function todoTemplate(d,includeExtended=false){
 const reference=[
  ['Nghi lễ','Chốt ngày cưới và xem ngày',181,'high','Cả hai','Thống nhất ngày cưới với hai gia đình.'],
  ['Địa điểm & nhà hàng','Đặt nhà hàng, địa điểm',151,'urgent','Cả hai','So sánh sảnh, thực đơn, số bàn; lưu hợp đồng và phiếu cọc.'],
  ['Thiệp & khách mời','Lên danh sách khách mời',121,'high','Cả hai','Tách nhóm nhà trai, nhà gái; thêm số người đi cùng.'],
  ['Chụp ảnh & quay phim','Chọn ảnh viện, chụp ảnh cưới',91,'normal','Cả hai','Chọn studio, lịch chụp, gói chỉnh ảnh và video.'],
  ['Trang phục & làm đẹp','Đặt váy cưới, vest',76,'high','Cả hai','Kiểm tra size, phụ kiện, ngày nhận và ngày trả.'],
  ['Nghi lễ','Mua nhẫn cưới',46,'high','Chú rể','Kiểm tra kích cỡ, khắc nhẫn và hóa đơn.'],
  ['Thiệp & khách mời','In thiệp cưới',36,'normal','Cả hai','Duyệt tên, ngày giờ và địa chỉ trước khi in.'],
  ['Thiệp & khách mời','Gửi thiệp cưới',22,'high','Cả hai','Theo dõi trạng thái đã gửi và khách cần nhắc.'],
  ['Nghi lễ','Đặt tráp ăn hỏi',21,'high','Nhà trai','Chốt số tráp, nội dung, thời gian giao và phí vận chuyển.'],
  ['Trang phục & làm đẹp','Thử trang điểm',15,'normal','Cô dâu','Lưu ảnh mẫu, hẹn lịch với makeup artist.'],
  ['Địa điểm & nhà hàng','Chốt số khách với nhà hàng',8,'urgent','Cả hai','Dựa trên RSVP, số người đi cùng và số bàn dự phòng.'],
  ['Hậu cần','Chuẩn bị phong bì cảm ơn',4,'normal','Cả hai','Lập số lượng và phân công người giữ.']
 ];
 const rows=[ 
 ['Nghi lễ','Thống nhất ngày cưới và phong tục hai bên',120,'urgent','Hai gia đình','Chốt ngày dạm ngõ, ăn hỏi, ngày cưới và thứ tự nghi lễ; xác nhận với người lớn.'],
 ['Nghi lễ','Phân công người đại diện phát biểu hai họ',45,'high','Hai gia đình','Lưu thông tin liên hệ và thời lượng phát biểu dự kiến.'],
 ['Nghi lễ','Lên danh sách lễ vật dạm ngõ',45,'high','Nhà trai','Thống nhất lễ vật, số lượng và người mang.'],
 ['Nghi lễ','Chốt số mâm quả ăn hỏi, người bưng quả',45,'high','Hai gia đình','Xác nhận số mâm, số người bê lễ và trang phục đồng bộ.'],
 ['Nghi lễ','Đặt trầu cau, mâm quả và lễ vật ăn hỏi',30,'high','Nhà trai','Làm rõ giờ giao, địa chỉ và phương án nếu giao trễ.'],
 ['Nghi lễ','Kiểm tra lễ vật, phong bì và nhẫn cưới',3,'urgent','Người phụ trách lễ','Đối chiếu đủ số lượng; để đúng người cầm.'],
 ['Địa điểm & nhà hàng','Khảo sát, so sánh nhà hàng và địa điểm tiệc',110,'urgent','Cô dâu & chú rể','Sức chứa, gói bàn, menu, vị trí, bãi xe, phí phát sinh.'],
 ['Địa điểm & nhà hàng','Đặt cọc nhà hàng và ký hợp đồng',100,'urgent','Cô dâu & chú rể','Chụp hợp đồng và biên nhận; kiểm tra điều khoản đổi bàn/hủy.'],
 ['Địa điểm & nhà hàng','Chốt thời gian sử dụng sảnh và thứ tự chương trình',35,'high','Điều phối / nhà hàng','Làm việc với MC, bàn lễ tân và bộ phận kỹ thuật.'],
 ['Địa điểm & nhà hàng','Thử món và chốt thực đơn, suất ăn đặc biệt',21,'high','Hai gia đình','Xác nhận món chay, trẻ em, người ăn kiêng và đồ uống.'],
 ['Địa điểm & nhà hàng','Chốt số bàn dự kiến và bàn dự phòng',10,'urgent','Hai gia đình','Đối chiếu dữ liệu khách xác nhận và điều khoản tính bàn.'],
 ['Địa điểm & nhà hàng','Xác nhận số bàn cuối cùng với nhà hàng',3,'urgent','Đầu mối nhà hàng','Ghi lại số bàn đặt, bàn dự phòng, giờ nhận sảnh và chi phí.'],
 ['Trang phục & làm đẹp','Chọn concept trang phục cưới',90,'normal','Cô dâu & chú rể','Tone màu, hình thức lễ và tiệc, ngân sách thuê/mua.'],
 ['Trang phục & làm đẹp','Đặt váy cưới, áo dài, vest và phụ kiện',70,'high','Cô dâu & chú rể','Lưu hợp đồng thuê, ngày nhận và ngày trả.'],
 ['Trang phục & làm đẹp','Thử, chỉnh sửa váy cưới và vest',20,'high','Cô dâu & chú rể','Kiểm tra chiều dài, size, khả năng đi lại và phụ kiện.'],
 ['Trang phục & làm đẹp','Đặt lịch makeup, hair và lịch thử makeup',60,'high','Cô dâu','Gửi giờ bắt đầu, địa chỉ, số người cần trang điểm.'],
 ['Trang phục & làm đẹp','Nhận và kiểm tra toàn bộ trang phục',2,'urgent','Cô dâu & chú rể','Giày, hoa cài, khăn voan, kẹp tóc, đồ thay sau tiệc.'],
 ['Chụp ảnh & quay phim','Chọn studio và gói ảnh cưới',90,'high','Cô dâu & chú rể','Kiểm tra số ảnh chỉnh, video, album, phí phát sinh.'],
 ['Chụp ảnh & quay phim','Thống nhất lịch chụp, bối cảnh và trang phục',75,'normal','Cô dâu & chú rể','Chuẩn bị trang phục, đạo cụ và phương án thời tiết xấu.'],
 ['Chụp ảnh & quay phim','Chọn ảnh, duyệt album và slide chiếu tiệc',30,'high','Cô dâu & chú rể','Gửi định dạng file cho nhà hàng, kiểm tra lỗi font/âm thanh.'],
 ['Chụp ảnh & quay phim','Đặt ekip quay phim, chụp phóng sự ngày cưới',60,'high','Người điều phối','Chốt số người, giờ có mặt, danh sách khoảnh khắc bắt buộc.'],
 ['Chụp ảnh & quay phim','Gửi timeline và địa chỉ cho ekip media',7,'urgent','Người điều phối','Gửi số điện thoại liên hệ của hai nhà và nhà hàng.'],
 ['Thiệp & khách mời','Tạo danh sách khách mời hai bên theo nhóm',80,'high','Hai gia đình','Tách nhóm họ hàng, bạn bè và đồng nghiệp; kiểm tra trùng.'],
 ['Thiệp & khách mời','Xác định mẫu thiệp, nội dung và cách gửi',65,'normal','Cô dâu & chú rể','Kiểm tra chính tả ngày, giờ, địa chỉ và bản đồ.'],
 ['Thiệp & khách mời','In và gửi thiệp mời chính thức',45,'high','Hai gia đình','Ưu tiên khách ở xa; theo dõi đã gửi/chưa gửi.'],
 ['Thiệp & khách mời','Nhắc khách RSVP lần một',21,'high','Hai gia đình','Nhắn những khách chưa phản hồi, cập nhật số người đi cùng.'],
 ['Thiệp & khách mời','Chốt RSVP và số lượng khách thực tế',7,'urgent','Hai gia đình','Đối chiếu khách từ chối, dự kiến và khách đi kèm.'],
 ['Thiệp & khách mời','Xếp bàn theo nhóm và nhu cầu đặc biệt',5,'high','Người phụ trách khách','Ưu tiên người lớn tuổi, khách có trẻ em và lối di chuyển.'],
 ['Thiệp & khách mời','In sơ đồ bàn và phân công lễ tân',2,'urgent','Đội lễ tân','Chuẩn bị 1 bản giấy dự phòng khi mất Internet.'],
 ['Thiệp & khách mời','Chuẩn bị bàn nhận quà và sổ ghi phong bì',2,'high','Hai gia đình','Phân công hai người ký nhận và kiểm đếm sau tiệc.'],
 ['Trang trí & hoa','Chọn bảng màu, mẫu hoa và backdrop',65,'normal','Cô dâu & chú rể','Thống nhất hình ảnh mẫu trước khi đặt cọc.'],
 ['Trang trí & hoa','Đặt dịch vụ trang trí nhà, gia tiên và sảnh tiệc',55,'high','Người phụ trách trang trí','Chốt danh sách hạng mục có và chưa bao gồm.'],
 ['Trang trí & hoa','Xác nhận hoa cầm tay, hoa cài áo và xe hoa',14,'high','Cô dâu','Xác nhận giờ lấy/giao, màu sắc, phương án thay hoa.'],
 ['Trang trí & hoa','Kiểm tra lắp đặt cổng hoa và backdrop',1,'urgent','Người điều phối','Chụp ảnh đối chiếu với mẫu thiết kế và kiểm tra an toàn.'],
 ['Âm thanh & MC','Đặt MC, ban nhạc hoặc DJ',60,'high','Người điều phối','Xác nhận thù lao, thời gian tập và kịch bản chương trình.'],
 ['Âm thanh & MC','Soạn kịch bản MC chi tiết từng phút',25,'high','MC / người điều phối','Họ tên chuẩn, cách xưng hô, bài phát biểu, người lên sân khấu.'],
 ['Âm thanh & MC','Chọn nhạc mở màn, trao nhẫn và tiễn khách',14,'normal','Cô dâu & chú rể','Tải file offline, kiểm tra phát thử trong sảnh.'],
 ['Âm thanh & MC','Kiểm thử micro, màn hình LED và file trình chiếu',1,'urgent','MC / kỹ thuật','Test âm lượng, pin micro, video và dự phòng USB.'],
 ['Hậu cần','Dự trù ngân sách và lập quỹ dự phòng phát sinh',100,'high','Cô dâu & chú rể','Theo dõi dự kiến, đã cọc và khoản còn phải thanh toán.'],
 ['Hậu cần','Lưu hợp đồng, hóa đơn và thông tin nhà cung cấp',60,'high','Người quản lý ngân sách','Lưu bản scan và số điện thoại trong một nơi.'],
 ['Hậu cần','Lên danh sách người phụ trách mỗi đầu việc',30,'high','Hai gia đình','Mỗi việc một người phụ trách chính và một người dự phòng.'],
 ['Hậu cần','Đặt xe cưới và phương tiện đi lại',40,'high','Người điều phối','Kiểm tra biển số, giờ có mặt, đường đi và phí chờ.'],
 ['Hậu cần','Lập bản timeline cho nhà trai, nhà gái và nhà hàng',14,'urgent','Điều phối','Thống nhất thời gian di chuyển, đệm trễ 15–30 phút.'],
 ['Hậu cần','Họp điều phối và xác nhận các đầu mối',7,'urgent','Hai gia đình','Có danh bạ MC, nhà hàng, trang trí, media, xe cưới.'],
 ['Hậu cần','Kiểm tra dự báo thời tiết và chuẩn bị phương án mưa',3,'high','Người điều phối','Ô dù, mái che, thay đổi đường di chuyển nếu cần.'],
 ['Hậu cần','Chuẩn bị bộ đồ khẩn cấp ngày cưới',2,'normal','Cô dâu / người hỗ trợ','Kim chỉ, băng dán, sạc dự phòng, thuốc cá nhân.'],
 ['Hậu cần','Nhắc giờ tập trung tất cả ekip và gia đình',1,'urgent','Người điều phối','Nhắn lại địa điểm, giờ có mặt, số liên lạc chính.'],
 ['Hậu cần','Đối soát chi phí nhà hàng và các bên sau tiệc',-1,'high','Người quản lý ngân sách','Kiểm tra hóa đơn cuối, cọc đã trừ, bàn sử dụng thực tế.'],
 ['Hậu cần','Trả váy/vest thuê và nhận ảnh/video theo hợp đồng',-7,'normal','Cô dâu & chú rể','Chốt thời hạn nhận bàn giao và kiểm tra đủ file.']
 ];
 return (includeExtended?[...reference,...rows]:reference).map(([category,title,days,priority,assignee,notes])=>({id:id(),title,category,priority,due:d?incDate(d,-days):'',assignee,status:'open',notes,origin:includeExtended&&rows.some(r=>r[1]===title)?'extra':'reference'}));
}
const defaultState=()=>{const meta={bride:'Dâu',groom:'Rể',weddingDate:'',venue:'',tableSize:10,budgetTarget:''};return{version:CURRENT_VERSION,meta,schedule:scheduleTemplate(meta.weddingDate),todos:todoTemplate(meta.weddingDate),budget:[],guestGroups:initialGroups.map(name=>({id:id(),name,guests:[]}))}};
function normalizeState(o){
 if(!o||typeof o!=='object')throw Error('Tệp dữ liệu không hợp lệ.');
 const meta={bride:'Dâu',groom:'Rể',weddingDate:'',venue:'',tableSize:10,budgetTarget:'',...(o.meta||{})};
 const isOld=(Number(o.version)||1)<2;
 const x={version:CURRENT_VERSION,meta,schedule:Array.isArray(o.schedule)?o.schedule:[],todos:Array.isArray(o.todos)?o.todos:[],budget:Array.isArray(o.budget)?o.budget:[],guestGroups:Array.isArray(o.guestGroups)?o.guestGroups:initialGroups.map(name=>({id:id(),name,guests:[]}))};
 if(isOld&&x.schedule.length===0)x.schedule=scheduleTemplate(meta.weddingDate);
 if(isOld&&x.todos.length===0)x.todos=todoTemplate(meta.weddingDate);
 x.guestGroups=x.guestGroups.map(g=>({id:g.id||id(),name:String(g.name||'Nhóm mới'),guests:Array.isArray(g.guests)?g.guests.map(p=>({...p,id:p.id||id()})):[]}));
 x.schedule=x.schedule.map(i=>({...i,id:i.id||id(),tasks:Array.isArray(i.tasks)?i.tasks.map(t=>typeof t==='string'?{id:id(),title:t,done:false}:{...t,id:t.id||id()}):[]}));
 x.todos=x.todos.map(i=>({...i,id:i.id||id()}));x.budget=x.budget.map(i=>({...i,id:i.id||id()}));
 x.meta.tableSize=Math.max(1,Math.floor(num(x.meta.tableSize)||10));return x;
}
let state=(()=>{try{const v=localStorage.getItem(KEY);return v?normalizeState(JSON.parse(v)):defaultState()}catch(ex){return defaultState()}})();
const hadLocalData=!!localStorage.getItem(KEY);
let localChangedSinceBoot=false;
let view={tab:'schedule',scheduleSearch:'',scheduleDate:'all',todoSearch:'',todoStatus:'all',todoCategory:'all',budgetSearch:'',budgetCategory:'all',budgetStatus:'all',budgetSort:'default',guestSearch:'',guestStatus:'all',guestInvite:'all',guestSort:'default',guestMode:'list',menu:false};
let modal=null;let toastTimer=null;
let syncStatus='✓ Đã lưu trên máy';
const setSyncStatus=(message,error=false)=>{syncStatus=message;$$('[data-sync-status]').forEach(el=>{el.textContent=message;el.title=error?message:'';el.classList.toggle('sync-error',error)})};
const sheetStore=new SheetStore(setSyncStatus,()=>state);
let previousRows=SheetSchema.rowsFor(state);
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));if(!sheetStore.connected)setSyncStatus(sheetStore.configured()?'✓ Đã lưu trên máy · Chờ tải Sheets':'Chỉ lưu trên máy · Chưa triển khai Apps Script',!sheetStore.configured())}catch(err){toast('Không lưu được dữ liệu: bộ nhớ trình duyệt đã đầy hoặc bị chặn.',true)}};
const update=(sync=true)=>{const rows=SheetSchema.rowsFor(state),changed=SheetSchema.names.filter(name=>JSON.stringify(rows[name])!==JSON.stringify(previousRows[name]));previousRows=rows;if(sync&&changed.length)localChangedSinceBoot=true;persist();render();if(sync&&changed.length)sheetStore.queue(changed)};
const findById=(list,target)=>list.find(i=>i.id===target);
const flatGuests=()=>state.guestGroups.flatMap(g=>g.guests.map(p=>({...p,groupId:g.id,groupName:g.name})));
const party=p=>1+Math.max(0,Math.floor(num(p.plus)));
const checked=p=>p.rsvp==='no'?0:Math.min(party(p),Math.max(0,Math.floor(num(p.checkedCount))));
const metricsGuest=()=>{const all=flatGuests(),expected=all.filter(p=>p.rsvp!=='no').reduce((s,p)=>s+party(p),0),yes=all.filter(p=>p.rsvp==='yes').reduce((s,p)=>s+party(p),0),arrived=all.reduce((s,p)=>s+checked(p),0);return{all,expected,yes,arrived,tables:Math.ceil(expected/state.meta.tableSize)}};
const sumBudget=()=>{const b=state.budget,est=b.reduce((s,r)=>s+nonneg(r.estimate),0),actual=b.reduce((s,r)=>s+nonneg(r.actual),0),paid=b.reduce((s,r)=>s+nonneg(r.paid),0);return{est,actual,paid,pending:Math.max(0,actual-paid),remain:est-actual}};
const escOpt=(options,sel,allLabel)=>`${allLabel===undefined?'':`<option value="all">${e(allLabel)}</option>`}${options.map(([v,t])=>`<option value="${e(v)}" ${String(sel)===String(v)?'selected':''}>${e(t)}</option>`).join('')}`;
const select=(options,current,attrs='')=>`<select class="field" ${attrs}>${escOpt(options,current)}</select>`;
function toast(message,error=false){const el=$('#toast-root');el.innerHTML=`<div class="toast ${error?'error':''}">${e(message)}</div>`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.innerHTML='',3500)}
function tabTitle(){return{schedule:'Lịch trình',todo:'To-do',budget:'Ngân sách',guests:'Khách mời'}[view.tab]||'Lịch trình'}
function tabDescription(){return{schedule:'Sắp xếp từng mốc thời gian để ngày trọng đại diễn ra thật suôn sẻ.',todo:'Theo dõi tiến độ chuẩn bị, người phụ trách và thời hạn công việc.',budget:'Quản lý dự trù, chi phí thực tế và những khoản tiền đã thanh toán.',guests:'Quản lý nhóm khách, xác nhận tham dự và sắp xếp bàn tiệc.'}[view.tab]}
function nav(){return[['schedule','Lịch trình','calendar'],['todo','To-do','listCheck'],['guests','Khách mời','users'],['budget','Ngân sách','wallet']].map(([key,label,ic])=>`<button class="nav-btn ${view.tab===key?'active':''}" data-action="tab" data-key="${key}" aria-current="${view.tab===key?'page':'false'}">${ico(ic)} ${label}</button>`).join('')}
function headAction(){return{schedule:`${btn(ico('plus')+' Thêm sự kiện','new-schedule','btn primary')}`,todo:btn(ico('plus')+' Thêm công việc','new-todo','btn primary'),budget:btn(ico('plus')+' Thêm khoản chi','new-budget','btn primary'),guests:btn(ico('plus')+' Thêm nhiều khách','bulk-guests','btn primary')}[view.tab]}
function layout(body){
 const days=state.meta.weddingDate?Math.round((new Date(state.meta.weddingDate+'T12:00:00')-new Date(today()+'T12:00:00'))/86400000):NaN;
 const syncError=sheetStore.error||syncStatus.startsWith('Không tải được');
 $('#app').innerHTML=`<div class="shell">
 <header class="topbar"><div class="brand"><div class="brand-mark">${ico('heart')}</div><div class="brand-text"><div class="brand-title">Kế hoạch đám cưới</div><div class="brand-sub">${e(state.meta.groom)} &amp; ${e(state.meta.bride)}</div></div></div>
 <nav class="nav" aria-label="Điều hướng chính">${nav()}</nav>
 <div class="top-actions"><span id="save-status" data-sync-status class="save-caption ${syncError?'sync-error':''}">${e(syncStatus)}</span>${btn(ico('edit')+`<span class="quick-profile-copy">Sửa tên và ngày cưới</span>`,'wedding-info','btn quick-profile',`aria-label="Sửa tên cô dâu, chú rể và ngày cưới" title="Sửa tên và ngày cưới"`)}${btn(ico('settings'),'settings','icon-btn','aria-label="Cài đặt" title="Cài đặt và sao lưu"')}</div></header>
 <nav class="mobile-nav" aria-label="Điều hướng điện thoại">${nav()}</nav>
 <section class="masthead"><div><h1>${tabTitle()}</h1><p>${tabDescription()}</p></div><div class="head-actions"><span class="date-pill">${ico('calendar')} ${e(weddingText(state.meta.weddingDate))} ${Number.isFinite(days)?`· ${days>=0?`còn ${days} ngày`:`đã qua ${-days} ngày`}`:''}</span>${headAction()}</div></section><div data-sync-status class="mobile-sync-status ${syncError?'sync-error':''}">${e(syncStatus)}</div>
 ${body}<footer class="footer">${sheetStore.connected?'Tự đồng bộ Google Sheets · Dữ liệu máy được lưu để dự phòng':sheetStore.configured()?'Đang lưu trên trình duyệt · Chờ Google Sheets hoạt động trở lại':'Đang lưu trên trình duyệt · Cần triển khai Apps Script để đồng bộ'} · Có thể xuất bản sao lưu JSON</footer></div>`;
}
function empty(icon,title,description,action,label){return `<div class="empty">${ico(icon)}<h3>${title}</h3><p>${description}</p>${action?btn(ico('plus')+' '+label,action,'btn soft'):''}</div>`}
function metric(label,number,sub,ic,accent=false){return `<div class="metric ${accent?'accent':''}"><div class="metric-label">${ico(ic)}${label}</div><div class="metric-value">${number}</div><div class="metric-sub">${sub}</div></div>`}
function render(){let html;switch(view.tab){case 'schedule':html=renderSchedule();break;case 'todo':html=renderTodos();break;case 'budget':html=renderBudget();break;case 'guests':html=renderGuests();break;default:html=renderSchedule()};layout(html)}
/* ---------------- Lịch trình ---------------- */
function scheduleMetrics(){const all=state.schedule,done=all.filter(x=>x.status==='done').length,dates=new Set(all.map(x=>x.date).filter(Boolean));return {all,done,dates,upcoming:all.filter(x=>x.date>=today()&&x.status!=='done').length}}
function renderSchedule(){
 const {all,done,dates,upcoming}=scheduleMetrics();const q=view.scheduleSearch.toLocaleLowerCase('vi');
 const filtered=all.filter(x=>(view.scheduleDate==='all'||x.date===view.scheduleDate)&&(!q||[x.title,x.venue,x.owner,x.notes,x.kind].some(t=>String(t||'').toLocaleLowerCase('vi').includes(q))));
 const byDate=Object.groupBy?Object.groupBy(filtered,x=>x.date||'Chưa có ngày'):filtered.reduce((m,x)=>((m[x.date||'Chưa có ngày']??=[]).push(x),m),{});
 const ordered=Object.entries(byDate).sort((a,b)=>a[0].localeCompare(b[0]));
 const labelFor=d=>{if(d===state.meta.weddingDate)return 'Ngày cưới';const items=all.filter(x=>x.date===d);return items.some(x=>/dạm ngõ/i.test(x.title))?'Dạm ngõ':items.some(x=>/ăn hỏi/i.test(x.title))?'Ăn hỏi':'Sự kiện khác'};
 const hasWeddingEvents=!!state.meta.weddingDate&&all.some(x=>x.date===state.meta.weddingDate);
 const dayNavigation=`<div class="day-nav" style="margin:0;padding:15px 20px 0">${[['all','Tất cả'],...[...dates].sort().map(d=>[d,`${dateShort(d)} · ${labelFor(d)}`])].map(([k,t])=>`<button type="button" class="day-chip ${view.scheduleDate===k?'active':''}" data-action="select-schedule-day" data-date="${e(k)}" aria-pressed="${view.scheduleDate===k}">${e(t)}</button>`).join('')}</div>`;
 const taskCount=all.reduce((n,x)=>n+(x.tasks||[]).length,0),taskDone=all.reduce((n,x)=>n+(x.tasks||[]).filter(y=>y.done).length,0);
 return `<div class="metrics">${metric('Tổng mốc chương trình',all.length,'trên '+dates.size+' ngày','calendar',true)}${metric('Checklist theo mốc',`${taskDone}/${taskCount}`,'việc tại từng khung giờ','listCheck')}${metric('Sắp diễn ra',upcoming,'mốc chưa hoàn thành','clock')}${metric('Hoàn thành',all.length?Math.round(done/all.length*100)+'%':'0%','đã xong '+done+'/'+all.length+' mốc','checkCircle')}</div>
 <div class="two-col"><div><section class="panel"><div class="panel-head"><div><h2>Lịch trình theo từng ngày</h2><p>Các mốc đã nhập, khung giờ, quy trình và checklist theo từng ngày.</p></div>${btn(ico('plus')+' Thêm mốc','new-schedule','btn small')}</div>
 ${dayNavigation}
 <div class="panel-toolbar"><label class="search">${ico('search')}<input type="search" aria-label="Tìm sự kiện, địa điểm" placeholder="Tìm sự kiện, địa điểm..." data-filter="scheduleSearch" value="${e(view.scheduleSearch)}"/></label><select class="field xs" aria-label="Lọc theo ngày" data-filter="scheduleDate">${escOpt([...dates].sort().map(v=>[v,dateVN(v)]),view.scheduleDate,'Tất cả các ngày')}</select><div class="toolbar-space"></div>${btn(ico('copy')+' Bổ sung lịch mẫu','seed-schedule','btn small')}</div>
 ${filtered.length?`<div class="day-list">${ordered.map(([date,items])=>{const list=items.sort((a,b)=>(a.start||'').localeCompare(b.start||'')),nTasks=list.reduce((n,x)=>n+(x.tasks||[]).length,0),doneTasks=list.reduce((n,x)=>n+(x.tasks||[]).filter(t=>t.done).length,0);return `<div class="day-head"><div><div class="day-title">${e(labelFor(date))} · ${date==='Chưa có ngày'?date:dayVN(date)}</div><div class="day-sub">${list.length} mốc giờ · ${list.filter(x=>x.major).length} mốc chính · việc ${doneTasks}/${nTasks}</div></div><span class="status neutral">${list.filter(i=>i.status==='done').length}/${list.length} hoàn thành</span></div>
 <div class="timeline">${list.map(x=>`<div class="time-item"><div class="time-label">${e(x.start||'--:--')}${x.end?`<div class="fine" style="font-weight:400">đến ${e(x.end)}</div>`:''}</div><div class="time-card"><div class="time-main"><h3>${e(x.title)}${x.major?' <span class="status orange">Mốc chính</span>':''}</h3>${x.notes?`<div class="time-notes"><strong>Ghi chú · quy trình</strong><p>${e(x.notes)}</p></div>`:''}${x.tasks?.length?`<div class="time-checklist"><div class="time-checklist-title">Việc cần làm ${(x.tasks||[]).filter(y=>y.done).length}/${x.tasks.length}</div>${x.tasks.map(y=>`<label class="check-label"><input type="checkbox" data-action="toggle-schedule-task" data-event="${e(x.id)}" data-id="${e(y.id)}" ${y.done?'checked':''}/><span class="${y.done?'checklist-done':''}">${e(y.title)}</span></label>`).join('')}</div>`:''}<div class="meta"><span class="tag">${e(x.kind||'Sự kiện')}</span>${x.venue?`<span>${ico('map')} ${e(x.venue)}</span>`:''}${x.owner?`<span>${ico('users')} ${e(x.owner)}</span>`:''}<span class="status ${x.status==='done'?'green':x.status==='ready'?'blue':'neutral'}">${e(EVENT_STATES[x.status]||'Dự kiến')}</span></div></div><div class="time-actions">${btn(ico('edit'),'edit-schedule','icon-btn small',`data-id="${e(x.id)}" title="Sửa sự kiện" aria-label="Sửa sự kiện"`)}${btn(ico('check'),'complete-schedule','icon-btn small',`data-id="${e(x.id)}" title="Đổi trạng thái hoàn thành" aria-label="Đổi trạng thái hoàn thành"`)}${btn(ico('trash'),'delete-schedule','icon-btn small danger',`data-id="${e(x.id)}" title="Xóa" aria-label="Xóa sự kiện"`)}</div></div></div>`).join('')}</div>`}).join('')}</div>`:empty('calendar','Chưa có mốc lịch trình phù hợp','Thay đổi bộ lọc hoặc bổ sung các mốc mẫu.','seed-schedule','Bổ sung lịch mẫu')}</section></div>
 <aside><section class="panel sidebox"><h3>Tổng quan lịch trình</h3><div class="summary-bar"><span>Tiến độ chương trình</span><strong>${done}/${all.length}</strong></div><div class="progress"><span style="width:${all.length?done/all.length*100:0}%"></span></div><div class="divider"></div><div class="small-text" style="margin-bottom:10px">${hasWeddingEvents?'Các mốc mẫu là gợi ý; hãy kiểm tra lại ngày giờ theo kế hoạch thực tế.':'Ngày cưới mới chưa có sự kiện trong lịch trình. Hãy sửa ngày của những mốc cần chuyển sang ngày này.'}</div></section>
 <section class="panel sidebox"><h3>Nhắc nhanh</h3><div class="notice compact">${ico('info')}Hãy xác nhận ngày giờ, phong tục và địa điểm với hai gia đình, nhà hàng và MC trước khi dùng lịch cho lễ cưới.</div><div style="margin-top:12px">${btn(ico('arrowDown')+' Xuất Excel','export-schedule-csv','btn small')}</div></section></aside></div>`;
}
/* ---------------- To-do ---------------- */
function renderTodos(){
 const arr=state.todos,done=arr.filter(x=>x.status==='done').length,doing=arr.filter(x=>x.status==='doing').length,late=arr.filter(x=>x.due&&x.due<today()&&x.status!=='done').sort((a,b)=>(a.due||'').localeCompare(b.due||'')),q=view.todoSearch.toLocaleLowerCase('vi');
 const f=arr.filter(x=>(view.todoStatus==='all'||x.status===view.todoStatus)&&(view.todoCategory==='all'||x.category===view.todoCategory)&&(!q||[x.title,x.category,x.assignee,x.notes].some(t=>String(t||'').toLocaleLowerCase('vi').includes(q))));
 f.sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')||Number(a.status==='done')-Number(b.status==='done'));
 const cats=[...new Set(arr.map(x=>x.category))].filter(Boolean).sort();
 return `<div class="metrics">${metric('Tổng công việc',arr.length,'danh sách chuẩn bị','clipboard',true)}${metric('Đã hoàn thành',done,`${arr.length?Math.round(done/arr.length*100):0}% tổng công việc`,'checkCircle')}${metric('Đang thực hiện',doing,'cần tiếp tục theo dõi','clock')}${metric('Quá hạn',late.length,'việc chưa hoàn thành','alert')}</div>
 ${late.length?`<div class="notice" style="margin-bottom:15px">${ico('alert')}<div><strong>${late.length} việc quá hạn</strong><div style="font-size:12px;margin-top:5px">${e(late.slice(0,4).map(x=>x.title+' ('+dateShort(x.due)+')').join(' · '))}${late.length>4?' · ...':''}</div></div></div>`:''}
 <div class="panel"><div class="panel-head"><div><h2>Danh sách To-do</h2><p>Sắp theo hạn hoàn thành · danh sách 12 việc gốc và công việc bổ sung (nếu có).</p></div><div class="stack">${btn(ico('copy')+' Bổ sung 12 việc gốc','seed-todo','btn small')}${btn(ico('plus')+' Thêm việc chi tiết','seed-todo-extended','btn small')}${btn(ico('plus')+' Thêm','new-todo','btn primary small')}</div></div>
 <div class="panel-body"><div class="summary-bar"><span>Tiến độ chuẩn bị</span><strong>${done}/${arr.length} việc đã xong</strong></div><div class="progress green"><span style="width:${arr.length?done/arr.length*100:0}%"></span></div></div>
 <div class="panel-toolbar"><label class="search">${ico('search')}<input type="search" aria-label="Tìm công việc hoặc người thực hiện" data-filter="todoSearch" value="${e(view.todoSearch)}" placeholder="Tìm tên việc, người thực hiện..." /></label><select class="field xs" aria-label="Lọc trạng thái công việc" data-filter="todoStatus">${escOpt([['open','Chưa làm'],['doing','Đang làm'],['done','Hoàn thành']],view.todoStatus,'Tất cả trạng thái')}</select><select class="field xs" aria-label="Lọc nhóm công việc" data-filter="todoCategory">${escOpt(cats.map(x=>[x,x]),view.todoCategory,'Tất cả nhóm')}</select><div class="toolbar-space"></div>${btn(ico('arrowDown')+' Excel','export-todo-csv','btn small')}</div>
 ${f.length?`<div class="table-wrap"><table class="data-table todo-table"><thead><tr><th style="width:44%">Tên việc</th><th>Người thực hiện</th><th>Hạn hoàn thành</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${f.map(x=>`<tr class="${x.status==='done'?'todo-completed':''}"><td><div class="todo-title-wrap"><input type="checkbox" class="todo-check" data-action="toggle-todo" data-id="${e(x.id)}" ${x.status==='done'?'checked':''} aria-label="Đánh dấu ${e(x.title)} hoàn thành"/><div><div class="todo-title ${x.status==='done'?'done':''}">${e(x.title)}</div><span class="fine">${e(x.category||'Khác')}${x.origin==='extra'?' · Bổ sung':''}</span>${x.notes?`<div class="todo-detail" title="${e(x.notes)}">${e(x.notes)}</div>`:''}</div></div></td><td>${e(x.assignee||'Chưa phân công')}</td><td><div class="nowrap"><strong>${e(x.due?dateVN(x.due):'Chưa đặt')}</strong></div>${x.due&&x.due<today()&&x.status!=='done'?'<span class="status red">Quá hạn</span>':''}</td><td><span class="status ${x.status==='done'?'green':x.status==='doing'?'blue':'neutral'}">${TASK_STATES[x.status]||'Chưa làm'}</span></td><td><div class="table-actions">${btn(ico('edit'),'edit-todo','icon-btn small',`data-id="${e(x.id)}" title="Chỉnh sửa" aria-label="Sửa công việc"`)}${btn(ico('copy'),'duplicate-todo','icon-btn small',`data-id="${e(x.id)}" title="Nhân bản" aria-label="Nhân bản công việc"`)}${btn(ico('trash'),'delete-todo','icon-btn small danger',`data-id="${e(x.id)}" title="Xóa" aria-label="Xóa công việc"`)}</div></td></tr>`).join('')}</tbody></table></div>`:empty('listCheck','Không có công việc phù hợp','Thay đổi bộ lọc hoặc bổ sung danh sách 12 việc gốc.','seed-todo','Bổ sung việc mẫu')}
 </div>`;
}
/* ---------------- Ngân sách ---------------- */
function budgetInsights(bs){
 const m=n=>miniMoney(n);
 const target=bs.target?`<div class="big-figure">${e(currency(bs.projected))} <small>/ ${e(currency(bs.target))}</small></div>${Charts.progress(bs.projected,bs.target,{fmt:currency,label:'Mức dùng ngân sách mục tiêu'})}<p class="${bs.overTarget?'negative':'positive'}" style="margin:0;font-weight:700">${bs.overTarget?`Vượt mục tiêu ${e(currency(-bs.targetRemaining))} (${bs.targetUsedPct}%)`:`Đã dùng ${bs.targetUsedPct}% · còn ${e(currency(bs.targetRemaining))}`}</p>`
  :`<p class="insight-sub">Chưa đặt tổng ngân sách mục tiêu. Đặt một con số để theo dõi mức đã dùng và nhận cảnh báo khi vượt.</p><div class="big-figure">${e(currency(bs.projected))} <small>dự kiến chi</small></div>`;
 const stats=`<div class="mini-stats"><div>Bình quân mỗi khách<strong>${bs.perGuest==null?'—':e(currency(bs.perGuest))}</strong></div><div>Bình quân mỗi mâm<strong>${bs.perTable==null?'—':e(currency(bs.perTable))}</strong></div></div>`;
 const card1=`<section class="panel sidebox"><h3>Ngân sách mục tiêu</h3><p class="insight-sub">Dự kiến chi = giá thực tế nếu đã chốt, chưa chốt thì lấy dự trù.</p>${target}${stats}<div class="stack" style="margin-top:14px">${btn(ico('edit')+(bs.target?' Đổi mục tiêu':' Đặt ngân sách mục tiêu'),'budget-target','btn small')}</div></section>`;
 const donut=Charts.donut(bs.byCategory.map(c=>({label:c.cat,value:c.projected})),{fmt:m,centerValue:m(bs.projected),centerLabel:'dự kiến chi',ariaLabel:'Cơ cấu chi theo danh mục'});
 const card2=`<section class="panel sidebox"><h3>Cơ cấu chi theo danh mục</h3><p class="insight-sub">Tỷ trọng từng danh mục trong tổng chi dự kiến.</p>${donut||'<p class="small-text">Nhập dự trù hoặc chi phí thực tế để xem biểu đồ.</p>'}${bs.uncosted?`<p class="small-text" style="margin-top:10px">${bs.uncosted} khoản chưa có giá nên chưa nằm trong biểu đồ.</p>`:''}</section>`;
 const bars=Charts.bars(bs.byCategory.slice(0,8).map(c=>({label:c.cat,est:c.est,actual:c.actual})),{series:[{key:'est',label:'Dự trù'},{key:'actual',label:'Thực tế'}],fmt:m,ariaLabel:'So sánh dự trù và thực tế theo danh mục'});
 const card3=`<section class="panel sidebox"><h3>Dự trù và thực tế</h3><p class="insight-sub">So sánh từng danh mục (tối đa 8 danh mục lớn nhất).</p>${bars||'<p class="small-text">Chưa có số liệu để so sánh.</p>'}</section>`;
 const stateLabel={overdue:['red','Quá hạn'],soon:['orange','Sắp đến hạn'],later:['neutral','Sau này']};
 const pay=bs.payments.slice(0,6).map(p=>`<li><span class="status ${stateLabel[p.state][0]}">${stateLabel[p.state][1]}</span><span class="pay-main"><strong>${e(p.name)}</strong><span class="fine">${e(dateVN(p.due))}${p.vendor?' · '+e(p.vendor):''}</span></span><span class="pay-amt">${e(currency(p.owed))}</span></li>`).join('');
 const card4=`<section class="panel sidebox"><h3>Lịch thanh toán</h3><p class="insight-sub">${bs.overdueTotal?`<b class="negative">${e(currency(bs.overdueTotal))} đã quá hạn</b>`:'Không có khoản quá hạn'}${bs.soonTotal?` · ${e(currency(bs.soonTotal))} đến hạn trong 14 ngày`:''}.</p>${pay?`<ul class="pay-list">${pay}</ul>${bs.payments.length>6?`<p class="small-text">Và ${bs.payments.length-6} khoản khác.</p>`:''}`:'<p class="small-text">Chưa có khoản nào còn nợ kèm hạn thanh toán. Nhập “Hạn” khi thêm khoản chi để được nhắc.</p>'}</section>`;
 return `<div class="insight-grid">${card1}${card4}${card2}${card3}</div>`;
}
function renderBudget(){
 const {est,actual,paid,pending,remain}=sumBudget(),arr=state.budget,q=view.budgetSearch.toLocaleLowerCase('vi');
 const payState=x=>{const hasA=x.actual!==''&&x.actual!=null,hasE=x.estimate!==''&&x.estimate!=null;return hasA&&x.actual>0&&Math.max(0,nonneg(x.actual)-nonneg(x.paid))===0?'paid':nonneg(x.paid)>0?'partial':hasA?'unpaid':hasE?'plan':'nocost'};
 const sorters={default:null,'cost-desc':(a,b)=>Stats.cost(b)-Stats.cost(a),'cost-asc':(a,b)=>Stats.cost(a)-Stats.cost(b),due:(a,b)=>(a.due||'9999').localeCompare(b.due||'9999'),name:(a,b)=>String(a.name).localeCompare(String(b.name),'vi')};
 const filtered=arr.filter(x=>(view.budgetCategory==='all'||x.category===view.budgetCategory)&&(view.budgetStatus==='all'||payState(x)===view.budgetStatus)&&(!q||[x.name,x.category,x.vendor,x.note].some(t=>String(t||'').toLocaleLowerCase('vi').includes(q))));
 if(sorters[view.budgetSort])filtered.sort(sorters[view.budgetSort]);
 const cats=[...new Set(arr.map(x=>x.category))].filter(Boolean);
 const topCats=Object.entries(arr.reduce((a,x)=>{if(x.actual==null||String(x.actual).trim()==='')return a;const k=x.category||'Khác';a[k]=(a[k]||0)+nonneg(x.actual);return a},{})).sort((a,b)=>b[1]-a[1]);
 const hasEstimate=arr.some(x=>x.estimate!==''&&x.estimate!=null),hasActual=arr.some(x=>x.actual!==''&&x.actual!=null),hasPaid=arr.some(x=>x.paid!==''&&x.paid!=null);
 const bs=Stats.budgetStats(arr,{target:nonneg(state.meta.budgetTarget),expectedGuests:metricsGuest().expected,tableSize:state.meta.tableSize,today:today()});
 const insights=budgetInsights(bs);
 return `<div class="metrics">${metric('Tổng dự trù',hasEstimate?miniMoney(est):'—',hasEstimate?currency(est):'Chưa có số liệu','wallet',true)}${metric('Chi phí thực tế',hasActual?miniMoney(actual):'—',hasActual?currency(actual):'Chưa có số liệu','briefcase')}${metric('Đã thanh toán',hasPaid?miniMoney(paid):'—',hasPaid?currency(paid):'Chưa có số liệu','checkCircle')}${metric('Chưa thanh toán',hasActual?miniMoney(pending):'—',hasActual?currency(pending):'Chưa có số liệu','clock')}</div>
 ${insights}
 <div class="two-col"><div><section class="panel"><div class="panel-head"><div><h2>Chi tiết ngân sách</h2><p>Quản lý chi phí dự kiến, phát sinh, số tiền đã trả và nhà cung cấp.</p></div>${btn(ico('plus')+' Thêm khoản chi','new-budget','btn primary small')}</div>
 <div class="panel-toolbar"><label class="search">${ico('search')}<input type="search" aria-label="Tìm khoản chi hoặc nhà cung cấp" data-filter="budgetSearch" value="${e(view.budgetSearch)}" placeholder="Tìm khoản chi hoặc nhà cung cấp..." /></label><select class="field xs" aria-label="Lọc danh mục ngân sách" data-filter="budgetCategory">${escOpt(cats.map(c=>[c,c]),view.budgetCategory,'Tất cả danh mục')}</select><select class="field xs" aria-label="Lọc theo thanh toán" data-filter="budgetStatus">${escOpt([['paid','Đã thanh toán'],['partial','Trả một phần'],['unpaid','Chưa thanh toán'],['plan','Mới có dự trù'],['nocost','Chưa có giá']],view.budgetStatus,'Mọi trạng thái')}</select><select class="field xs" aria-label="Sắp xếp khoản chi" data-filter="budgetSort">${escOpt([['default','Thứ tự nhập'],['cost-desc','Chi phí giảm dần'],['cost-asc','Chi phí tăng dần'],['due','Hạn gần nhất'],['name','Tên A-Z']],view.budgetSort)}</select><div class="toolbar-space"></div>${btn(ico('copy')+' Mẫu ngân sách','seed-budget','btn small')}${btn(ico('arrowDown')+' Excel','export-budget-csv','btn small')}</div>
 ${filtered.length?`<div class="table-wrap"><table class="data-table budget-table"><thead><tr><th>Khoản chi</th><th>Dự trù</th><th>Thực tế</th><th>Đã trả</th><th>Trạng thái</th><th></th></tr></thead><tbody>${filtered.map(x=>{const remaining=Math.max(0,nonneg(x.actual)-nonneg(x.paid));const hasEstimate=x.estimate!==''&&x.estimate!=null,hasActual=x.actual!==''&&x.actual!=null;return `<tr><td><div class="title-cell">${e(x.name)}</div><span class="fine">${e(x.category||'Khác')}${x.vendor?' · '+e(x.vendor):''}</span></td><td class="money">${budgetMoney(x.estimate)}</td><td class="money bold">${budgetMoney(x.actual)}</td><td class="money">${budgetMoney(x.paid)}</td><td><span class="status ${hasActual&&x.actual>0&&remaining===0?'green':x.paid>0?'blue':'orange'}">${hasActual&&x.actual>0&&remaining===0?'Đã thanh toán':x.paid>0?'Trả một phần':hasActual?'Chưa thanh toán':hasEstimate?'Dự trù':'Chưa có giá'}</span></td><td><div class="table-actions">${btn(ico('edit'),'edit-budget','icon-btn small',`data-id="${e(x.id)}" aria-label="Sửa"`)}${btn(ico('trash'),'delete-budget','icon-btn small danger',`data-id="${e(x.id)}" aria-label="Xóa"`)}</div></td></tr>`}).join('')}</tbody><tfoot><tr style="background:var(--beige-50);font-weight:800"><td style="padding:15px 17px">Tổng (${filtered.length} khoản)</td><td class="money">${filtered.some(x=>x.estimate!==''&&x.estimate!=null)?currency(filtered.reduce((s,x)=>s+nonneg(x.estimate),0)):'—'}</td><td class="money">${filtered.some(x=>x.actual!==''&&x.actual!=null)?currency(filtered.reduce((s,x)=>s+nonneg(x.actual),0)):'—'}</td><td class="money">${filtered.some(x=>x.paid!==''&&x.paid!=null)?currency(filtered.reduce((s,x)=>s+nonneg(x.paid),0)):'—'}</td><td></td><td></td></tr></tfoot></table></div>`:empty('wallet','Chưa có khoản chi nào','Bạn có thể tạo từng khoản hoặc sử dụng mẫu dự trù ngân sách cưới.','new-budget','Thêm khoản chi')}</section></div>
 <aside><section class="panel sidebox"><h3>Phân tích ngân sách</h3><div class="summary-bar"><span>Chênh lệch dự trù</span><strong class="${remain<0?'negative':'positive'}">${hasEstimate&&hasActual?(remain<0?'+':'')+currency(Math.abs(remain)):'—'}</strong></div><p class="small-text">${hasEstimate&&hasActual?(remain<0?'Chi phí thực tế đang vượt ngân sách dự trù.':'Số tiền dự trù chưa sử dụng.'):'Cần nhập dự trù và chi phí thực tế để tính chênh lệch.'}</p><div class="bar-chart"><span class="paid" style="width:${actual?Math.min(paid/Math.max(est,actual),1)*100:0}%"></span><span class="spent" style="width:${Math.max(0,Math.min(actual-paid,Math.max(est,actual)))/Math.max(est,actual,1)*100}%"></span></div><div class="stack"><span class="status green">● Đã trả</span><span class="status orange">● Chưa trả</span></div><div class="divider"></div><h3 style="margin-top:18px">Chi theo danh mục</h3>${topCats.length?topCats.slice(0,8).map(([cat,sum])=>`<div style="margin:13px 0"><div class="summary-bar"><span>${e(cat)}</span><strong>${miniMoney(sum)}</strong></div><div class="progress"><span style="width:${actual?sum/actual*100:0}%"></span></div></div>`).join(''):'<p class="small-text">Chưa có số liệu thực tế.</p>'}</section>
 <section class="panel sidebox"><h3>Lưu ý thanh toán</h3><p class="small-text">Nhập <b>thực tế</b> sau khi chốt giá với nhà cung cấp; nhập <b>đã trả</b> khi thanh toán. Hệ thống tự tính số còn nợ.</p><div class="notice compact">${ico('info')}Đơn vị mặc định: VND. Không có giao dịch tiền thật trong website này.</div></section></aside></div>`;
}
/* ---------------- Khách mời ---------------- */
function guestGroupHtml(g){
 const total=g.guests.filter(p=>p.rsvp!=='no').reduce((s,p)=>s+party(p),0),q=view.guestSearch.toLocaleLowerCase('vi');
 const inviteOk=p=>view.guestInvite==='all'||(view.guestInvite==='sent'&&p.invited)||(view.guestInvite==='unsent'&&!p.invited&&p.rsvp!=='no')||(view.guestInvite==='awaiting'&&p.invited&&(p.rsvp||'pending')==='pending');
 const matches=g.guests.filter(p=>inviteOk(p)&&(view.guestStatus==='all'||p.rsvp===view.guestStatus)&&(!q||[p.name,p.phone,p.note,p.table].some(t=>String(t||'').toLocaleLowerCase('vi').includes(q))));
 if(view.guestSort==='name')matches.sort((a,b)=>String(a.name).localeCompare(String(b.name),'vi'));
 if((q||view.guestStatus!=='all'||view.guestInvite!=='all')&&matches.length===0&&!g.name.toLocaleLowerCase('vi').includes(q))return '';
 return `<div class="guest-group" data-group="${e(g.id)}"><div class="group-head"><span class="drag-handle" draggable="true" title="Kéo để đổi thứ tự; cũng có thể dùng mũi tên">⋮⋮</span><div class="group-main"><input class="field inline" data-action="rename-group" data-id="${e(g.id)}" aria-label="Tên nhóm" value="${e(g.name)}"/><div class="group-sub">${g.guests.length} khách · ${total} dự kiến</div></div><div class="group-tools">${btn(ico('up'),'move-group','icon-btn small',`data-id="${e(g.id)}" data-dir="-1" title="Dịch nhóm lên" aria-label="Đưa nhóm lên"`)}${btn(ico('down'),'move-group','icon-btn small',`data-id="${e(g.id)}" data-dir="1" title="Dịch nhóm xuống" aria-label="Đưa nhóm xuống"`)}${btn(ico('mail'),'invite-group','icon-btn small',`data-id="${e(g.id)}" title="Đánh dấu cả nhóm đã gửi thiệp" aria-label="Đánh dấu cả nhóm đã gửi thiệp"`)}${btn(ico('trash'),'delete-group','icon-btn small danger',`data-id="${e(g.id)}" title="Xóa nhóm" aria-label="Xóa nhóm"`)}</div></div>
 ${matches.length?`<div class="guest-col-label"><span>Khách mời</span><span>Xác nhận</span><span>Số người</span><span>Bàn</span><span>Thao tác</span></div><div class="guest-list">${matches.map(p=>`<div class="guest-row"><div><div class="guest-name">${e(p.name)}</div><div class="guest-second">${p.phone?phoneLinks(p.phone):'Chưa có SĐT'}${p.note?' · '+e(p.note):''}</div></div><select class="field" data-action="rsvp-change" data-id="${e(p.id)}" data-group="${e(g.id)}" aria-label="Xác nhận ${e(p.name)}">${escOpt(Object.entries(RSVP),p.rsvp||'pending')}</select><span class="nowrap">${party(p)} người</span><div class="guest-table"><span class="status ${checked(p)?'green':'neutral'}">${p.table?'Bàn '+e(p.table):'Chưa xếp'}</span></div><div class="guest-acts">${btn(ico('mail'),'toggle-invited','icon-btn small',`data-id="${e(p.id)}" data-group="${e(g.id)}" aria-pressed="${p.invited?'true':'false'}" title="${p.invited?'Đã gửi thiệp (bấm để bỏ)':'Đánh dấu đã gửi thiệp'}" aria-label="Đã gửi thiệp cho ${e(p.name)}"`)}${btn(ico('checkCircle'),'checkin-guest','icon-btn small',`data-id="${e(p.id)}" data-group="${e(g.id)}" title="${checked(p)?'Hủy check-in':'Điểm danh'}" aria-label="Điểm danh"`)}${btn(ico('edit'),'edit-guest','icon-btn small',`data-id="${e(p.id)}" data-group="${e(g.id)}" title="Xem / sửa" aria-label="Sửa khách"`)}${btn(ico('trash'),'delete-guest','icon-btn small danger',`data-id="${e(p.id)}" data-group="${e(g.id)}" title="Xóa khách" aria-label="Xóa khách"`)}</div></div>`).join('')}</div>`:''}
 <div class="quick-add"><input class="field" data-action="quick-guest" data-group="${e(g.id)}" placeholder="Nhập tên khách, ví dụ: Minh Anh +2, bạn đại học" aria-label="Thêm khách nhanh vào ${e(g.name)}"/>${btn('Enter ↵','quick-guest-button','btn small',`data-group="${e(g.id)}"`)}</div><div class="quick-help">Gõ tên rồi Enter để thêm, con trỏ ở lại cho khách tiếp theo. Viết “+2” để tính người đi cùng; sau dấu phẩy là ghi chú.</div></div>`;
}
function guestInsights(){
 const gs=Stats.guestStats(state.guestGroups,{tableSize:state.meta.tableSize}),n=v=>String(v);
 if(!gs.entries.yes&&!gs.entries.pending&&!gs.entries.maybe&&!gs.entries.no)return '';
 const rsvp=Charts.stack([{label:'Sẽ đến',value:gs.people.yes,color:'var(--chart-3)'},{label:'Đang cân nhắc',value:gs.people.maybe,color:'var(--chart-1)'},{label:'Chưa phản hồi',value:gs.people.pending,color:'var(--butter-500)'}],{fmt:n,ariaLabel:'Cơ cấu xác nhận (số người)'});
 const card1=`<section class="panel sidebox"><h3>Cơ cấu xác nhận</h3><p class="insight-sub">Tính theo số người (gồm người đi cùng). ${gs.entries.no?`${gs.entries.no} khách đã từ chối, không tính vào dự kiến.`:'Chưa có khách từ chối.'}</p>${rsvp||'<p class="small-text">Chưa có khách dự kiến tham dự.</p>'}</section>`;
 const bars=Charts.bars(gs.byGroup.filter(x=>x.expected).map(x=>({label:x.name,yes:x.yes,uncertain:x.pending+x.maybe})),{series:[{key:'yes',label:'Sẽ đến'},{key:'uncertain',label:'Chưa chắc'}],fmt:n,ariaLabel:'Số người theo nhóm khách'});
 const card2=`<section class="panel sidebox"><h3>Theo nhóm khách</h3><p class="insight-sub">So sánh số người sẽ đến và chưa chắc ở từng nhóm.</p>${bars||'<p class="small-text">Chưa có số liệu theo nhóm.</p>'}</section>`;
 const sendable=gs.invited+gs.notInvited;
 const card3=`<section class="panel sidebox"><h3>Thiệp mời và điểm danh</h3><p class="insight-sub">Số khách (không tính người đi cùng); không tính khách từ chối.</p>
 <div class="big-figure">${gs.invited}<small> / ${sendable} khách đã gửi thiệp</small></div>${Charts.progress(gs.invited,sendable,{fmt:n,label:'Tiến độ gửi thiệp'})}
 <div class="mini-stats"><div>Chưa gửi thiệp<strong>${gs.notInvited}</strong></div><div>Đã gửi, chờ phản hồi<strong>${gs.awaitingReply}</strong></div><div>Đã đến / dự kiến<strong>${gs.arrived} / ${gs.expected}</strong></div></div></section>`;
 const warns=[];
 for(const d of gs.duplicates)warns.push(`<li>${d.type==='name'?'Trùng tên':'Trùng số điện thoại'}: ${d.names.map(e).join(', ')}</li>`);
 for(const t of gs.overfullTables)warns.push(`<li class="bad">Bàn ${e(t.table)} có ${t.count} người, vượt sức chứa ${gs.tableSize}.</li>`);
 if(gs.unassigned&&gs.tableCounts.length)warns.push(`<li>${gs.unassigned} người chưa được xếp bàn.</li>`);
 const card4=`<section class="panel sidebox"><h3>Cần kiểm tra</h3>${warns.length?`<ul class="warn-list">${warns.join('')}</ul>`:'<p class="small-text">Không có khách trùng và không có bàn vượt sức chứa.</p>'}</section>`;
 return `<div class="insight-grid">${card1}${card2}${card3}${card4}</div>`;
}
function renderGuests(){
 const {expected,yes,arrived,tables}=metricsGuest();
 return `<div class="metrics">${metric('Dự kiến',expected,'người (không tính từ chối)','users',true)}${metric('Sẽ đến',yes,'đã xác nhận','checkCircle')}${metric('Thực tế',arrived,'người đã đến','people')}${metric('Số mâm',tables,`${state.meta.tableSize} người/mâm`,'table')}</div>
 ${guestInsights()}
 <div class="panel"><div class="panel-head"><div><h2>Khách mời</h2><p>Chia nhóm khách và quản lý tình trạng tham dự.</p></div><div class="seg"><button data-action="guest-mode" data-mode="list" class="${view.guestMode==='list'?'active':''}" aria-pressed="${view.guestMode==='list'}">Danh sách khách</button><button data-action="guest-mode" data-mode="tables" class="${view.guestMode==='tables'?'active':''}" aria-pressed="${view.guestMode==='tables'}">Xếp bàn</button></div></div>
 ${view.guestMode==='list'?`<div class="panel-toolbar"><label class="search">${ico('search')}<input type="search" aria-label="Tìm khách mời, số điện thoại hoặc ghi chú" data-filter="guestSearch" value="${e(view.guestSearch)}" placeholder="Tìm khách, số điện thoại, ghi chú..."/></label><select class="field xs" aria-label="Lọc phản hồi khách mời" data-filter="guestStatus">${escOpt(Object.entries(RSVP),view.guestStatus,'Tất cả phản hồi')}</select><select class="field xs" aria-label="Lọc theo thiệp mời" data-filter="guestInvite">${escOpt([['sent','Đã gửi thiệp'],['unsent','Chưa gửi thiệp'],['awaiting','Đã gửi, chờ phản hồi']],view.guestInvite,'Mọi thiệp mời')}</select><select class="field xs" aria-label="Sắp xếp khách" data-filter="guestSort">${escOpt([['default','Thứ tự nhập'],['name','Tên A-Z']],view.guestSort)}</select><div class="toolbar-space"></div>${btn(ico('users')+' Thêm nhiều khách','bulk-guests','btn small')}${btn(ico('arrowUp')+' Nhập Excel','import-excel','btn small')}${btn(ico('arrowDown')+' Xuất Excel','export-guests-xlsx','btn small')}</div>
 <div class="group-wrap">${state.guestGroups.map(guestGroupHtml).join('')||empty('search','Không tìm thấy khách mời','Hãy thử bộ lọc khác.','new-group','Tạo nhóm')}${btn('+ Thêm nhóm khách mời','new-group','add-group')}</div>`:renderTableSeating()}
 </div>`;
}
function renderTableSeating(){
 const guests=flatGuests().filter(p=>p.rsvp!=='no'),tableGroups=Object.groupBy?Object.groupBy(guests,p=>p.table||'Chưa xếp bàn'):guests.reduce((a,p)=>((a[p.table||'Chưa xếp bàn']??=[]).push(p),a),{});
 return `<div class="panel-toolbar"><span class="small-text">Sức chứa mỗi bàn: <b>${state.meta.tableSize} người</b> · Dùng “Sửa khách” để gán số bàn</span><div class="toolbar-space"></div>${btn(ico('settings')+' Sửa số người/mâm','settings','btn small')}${btn(ico('arrowDown')+' Xuất sơ đồ bàn CSV','export-tables-csv','btn small')}</div>
 <div class="panel-body"><div class="notice" style="margin-bottom:18px">${ico('info')}Bản local mở đầy đủ tính năng xếp bàn, không yêu cầu nâng cấp Premium. Tình trạng xác nhận và số người đi cùng được tính khi xếp chỗ.</div>
 ${guests.length?`<div class="budget-insights">${Object.entries(tableGroups).sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true})).map(([table,items])=>{const count=items.reduce((s,p)=>s+party(p),0);return `<section class="panel sidebox"><div style="display:flex;justify-content:space-between;gap:6px;align-items:center"><h3>${table==='Chưa xếp bàn'?'Chưa xếp bàn':'Bàn '+e(table)}</h3><span class="status ${count>state.meta.tableSize&&table!=='Chưa xếp bàn'?'red':'neutral'}">${count} người${table==='Chưa xếp bàn'?'':' / '+state.meta.tableSize}</span></div><div class="progress"><span style="width:${Math.min(count/state.meta.tableSize*100,100)}%"></span></div><ul class="list-plain">${items.map(p=>`<li><span>${e(p.name)}</span><span>+${Math.max(0,party(p)-1)} · ${e(RSVP[p.rsvp]||'Chưa phản hồi')}</span></li>`).join('')}</ul></section>`}).join('')}</div>`:empty('table','Chưa có khách để xếp bàn','Thêm khách mời ở tab Danh sách khách, sau đó gán số bàn trong thông tin khách.','','')}
 </div>`;
}
/* ---------------- Biểu mẫu và modal ---------------- */
const inp=(name,label,value='',type='text',options={})=>`<div class="field-wrap ${options.wide?'wide':''}"><label class="label" for="f-${e(name)}">${e(label)}${options.required?' *':''}</label><input id="f-${e(name)}" class="field" name="${e(name)}" type="${e(type)}" value="${e(value)}" ${options.required?'required':''} ${options.min!=null?`min="${options.min}"`:''} ${options.max!=null?`max="${options.max}"`:''} ${options.step?`step="${e(options.step)}"`:''} ${options.placeholder?`placeholder="${e(options.placeholder)}"`:''}/>${options.help?`<div class="help">${e(options.help)}</div>`:''}</div>`;
const sel=(name,label,value,opts,wide=false)=>`<div class="field-wrap ${wide?'wide':''}"><label for="f-${e(name)}" class="label">${e(label)}</label><select id="f-${e(name)}" name="${e(name)}" class="field">${escOpt(opts,value)}</select></div>`;
const txt=(name,label,value='',placeholder='')=>`<div class="field-wrap wide"><label class="label" for="f-${e(name)}">${e(label)}</label><textarea id="f-${e(name)}" class="field" name="${e(name)}" rows="4" placeholder="${e(placeholder)}">${e(value)}</textarea></div>`;
const phoneLinks=phone=>{const d=String(phone||'').replace(/\D/g,'');if(d.length<8)return e(phone||'');return `${e(phone)}<span class="guest-links"><a href="tel:${d}" aria-label="Gọi ${e(phone)}">Gọi</a><a href="https://zalo.me/${d}" target="_blank" rel="noopener noreferrer" aria-label="Nhắn Zalo ${e(phone)}">Zalo</a></span>`};
const groupOptions=()=>state.guestGroups.map(g=>[g.id,g.name]);
function showModal(title,subtitle,fields,formType,editId='',large=false,submitLabel='Lưu thay đổi'){
 modal={formType,editId};$('#modal-root').innerHTML=`<div class="modal-backdrop" data-action="backdrop"><div role="dialog" aria-modal="true" aria-label="${e(title)}" class="modal ${large?'large':''}"><div class="modal-header"><div><h2>${e(title)}</h2><p>${e(subtitle||'')}</p></div><button type="button" class="modal-close" data-action="close-modal" aria-label="Đóng">×</button></div><form id="editor-form" data-form="${e(formType)}" data-id="${e(editId)}"><div class="modal-body"><div class="form-grid">${fields}</div></div><div class="modal-footer">${btn('Hủy','close-modal','btn')}${formType==='settings'?btn(ico('arrowDown')+' Sao lưu JSON','export-json','btn') : ''}<button type="submit" class="btn primary">${ico('check')} ${e(submitLabel)}</button></div></form></div></div>`;
 setTimeout(()=>{$('.modal input:not([type=file]), .modal textarea, .modal select')?.focus()},10);
}
const closeModal=()=>{modal=null;$('#modal-root').innerHTML=''};
function openSchedule(id0){
 const x=findById(state.schedule,id0)||{date:state.meta.weddingDate,start:'08:00',end:'',title:'',kind:'Lễ gia tiên',venue:'',owner:'',status:'planned',notes:'',tasks:[],major:false};
 showModal(id0?'Chỉnh sửa lịch trình':'Thêm sự kiện','Mỗi mốc nên có thời gian, quy trình và việc cần làm cụ thể.',
 inp('title','Tên sự kiện',x.title,'text',{required:true,wide:true,placeholder:'VD: Đón khách tại nhà hàng'})+inp('date','Ngày tổ chức',x.date,'date',{required:true})+sel('kind','Loại sự kiện',x.kind,SCHEDULE_TYPES.map(t=>[t,t]))+inp('start','Bắt đầu',x.start,'time',{required:true})+inp('end','Kết thúc',x.end,'time')+inp('venue','Địa điểm',x.venue,'text',{wide:true,placeholder:'Nhà hàng, địa chỉ hoặc phòng tiệc'})+inp('owner','Người phụ trách',x.owner,'text',{placeholder:'VD: Anh A / MC / Wedding planner'})+sel('status','Trạng thái',x.status,Object.entries(EVENT_STATES))+sel('major','Mốc chính',x.major?'yes':'no',[['no','Không'],['yes','Có']])+txt('notes','Ghi chú / trình tự nghi lễ',x.notes,'VD: 1. MC khai mạc\n2. Trao nhẫn...')+txt('taskLines','Việc cần làm trong mốc (mỗi dòng một việc)',(x.tasks||[]).map(t=>t.title).join('\n'),'VD: Kiểm tra hoa cưới\nĐón ekip makeup'),
 'schedule',id0||'',true);
}
function openTodo(id0){
 const x=findById(state.todos,id0)||{title:'',category:TODO_CATS[0],priority:'normal',due:'',assignee:'',status:'open',notes:''};
 showModal(id0?'Chỉnh sửa công việc':'Thêm công việc','Theo dõi tiến độ, thời hạn và người phụ trách.',
 inp('title','Tên công việc',x.title,'text',{required:true,wide:true,placeholder:'VD: Chốt thực đơn nhà hàng'})+sel('category','Danh mục',x.category,TODO_CATS.map(t=>[t,t]))+sel('priority','Mức độ ưu tiên',x.priority,Object.entries(PRIORITIES))+inp('due','Hạn hoàn thành',x.due,'date')+inp('assignee','Người phụ trách',x.assignee,'text')+sel('status','Trạng thái',x.status,Object.entries(TASK_STATES),true)+txt('notes','Ghi chú chi tiết',x.notes,'Các đầu việc cần làm, thông tin liên hệ, phương án dự phòng...'),
 'todo',id0||'');
}
function openBudget(id0){
 const x=findById(state.budget,id0)||{name:'',category:BUDGET_CATS[0],estimate:'',actual:'',paid:'',vendor:'',due:'',note:''};
 showModal(id0?'Chỉnh sửa khoản chi':'Thêm khoản chi','Giá trị nhập theo VND; số còn phải trả = thực tế − đã thanh toán.',
 inp('name','Tên khoản chi',x.name,'text',{required:true,wide:true,placeholder:'VD: Đặt cọc nhà hàng'})+sel('category','Danh mục',x.category,BUDGET_CATS.map(t=>[t,t]))+inp('vendor','Nhà cung cấp',x.vendor,'text',{placeholder:'Tên / SĐT nhà cung cấp'})+inp('estimate','Dự trù (VND)',x.estimate,'number',{min:0,step:1})+inp('actual','Thực tế (VND)',x.actual,'number',{min:0,step:1})+inp('paid','Đã thanh toán (VND)',x.paid,'number',{min:0,step:1,help:'Có thể bao gồm tiền cọc.'})+inp('due','Hạn thanh toán',x.due,'date')+txt('note','Ghi chú / hợp đồng',x.note,'VD: Đã đặt cọc, thanh toán phần còn lại sau tiệc.'),
 'budget',id0||'');
}
function findGuest(groupId,guestId){const group=state.guestGroups.find(g=>g.id===groupId);return{group,guest:group?.guests.find(p=>p.id===guestId)}}
function openGuest(groupId,guestId){
 const {guest}=findGuest(groupId,guestId);const x=guest||{name:'',phone:'',plus:0,rsvp:'pending',checkedCount:0,invited:false,table:'',note:''};
 showModal(guest?'Chỉnh sửa khách mời':'Thêm khách mời','Tổng số người = khách chính + số người đi cùng. Có thể chọn nhóm khác để chuyển khách.',
 inp('name','Họ tên khách mời',x.name,'text',{required:true,wide:true})+sel('groupId','Nhóm khách',groupId,groupOptions())+inp('phone','Số điện thoại',x.phone,'tel')+inp('plus','Số người đi cùng',x.plus,'number',{min:0,step:1})+sel('rsvp','Xác nhận tham dự',x.rsvp,Object.entries(RSVP))+inp('checkedCount','Số người đã đến thực tế',x.checkedCount,'number',{min:0,step:1,help:'Có thể nhỏ hơn số đã xác nhận.'})+inp('table','Số bàn / mã bàn',x.table,'text',{placeholder:'VD: 1, 2, VIP1'})+sel('invited','Đã gửi thiệp',x.invited?'yes':'no',[['no','Chưa gửi'],['yes','Đã gửi']])+txt('note','Ghi chú',x.note,'VD: Ăn chay, trẻ em, tên người đi cùng...'),
 'guest',(groupId||'')+'|'+(guestId||''));
}
function openBulkGuests(){
 showModal('Thêm nhiều khách','Dán danh sách: mỗi dòng một khách. Hỗ trợ tên +2, ghi chú.',sel('groupId','Thêm vào nhóm',state.guestGroups[0]?.id||'',groupOptions(),true)+txt('lines','Danh sách tên (mỗi dòng một khách)','','Nguyễn Văn A +2, bạn đại học\nTrần Thị B\nLê Văn C +1, ăn chay'),'bulk','','', 'Thêm khách');
}
function openSettings(){
 showModal('Cài đặt & dữ liệu','Mỗi thay đổi được lưu trên máy và tự ghi lên Google Sheets khi Apps Script đã triển khai.',
 inp('groom','Tên chú rể',state.meta.groom,'text')+inp('bride','Tên cô dâu',state.meta.bride,'text')+inp('weddingDate','Ngày cưới (để trống nếu chưa chọn)',state.meta.weddingDate,'date')+inp('tableSize','Số người mỗi mâm',state.meta.tableSize,'number',{min:1,step:1})+inp('budgetTarget','Ngân sách mục tiêu (VND)',state.meta.budgetTarget,'number',{min:0,step:100000,placeholder:'VD: 300000000'})+inp('venue','Địa điểm chính',state.meta.venue,'text',{wide:true})+`<div class="wide"><div class="notice">${ico('info')}${sheetStore.connected?'Đã tải Google Sheets. Mọi thay đổi trên web tự đồng bộ. Nếu sửa trực tiếp trên Sheet, hãy tải lại dữ liệu trước khi tiếp tục.':'Chưa tải được Google Sheets. Dữ liệu hiện chỉ lưu trên trình duyệt; kiểm tra URL Apps Script trong sheet-config.js và thử lại.'}</div><div class="stack" style="margin-top:12px">${btn(ico('undo')+' Thử đồng bộ lại','retry-sheet','btn small')}${btn(ico('arrowDown')+' Tải từ Sheets','reload-sheet','btn small')}${btn(ico('arrowUp')+' Ghi dữ liệu máy lên Sheets','upload-sheet','btn small')}${btn(ico('arrowUp')+' Khôi phục JSON','import-json','btn small')}${btn(ico('trash')+' Xóa tất cả dữ liệu','reset-data','btn small danger')}</div></div>`,
 'settings','','', 'Lưu cài đặt');
}
function openBudgetTarget(){
 showModal('Ngân sách mục tiêu','Tổng số tiền bạn dự định chi. Để trống nếu chưa muốn đặt mục tiêu.',
 inp('budgetTarget','Tổng ngân sách mục tiêu (VND)',state.meta.budgetTarget,'number',{min:0,step:100000,wide:true,placeholder:'VD: 300000000'}),
 'budget-target','','','Lưu mục tiêu');
}
function openWeddingInfo(){
 showModal('Tên và ngày cưới','Chỉnh nhanh thông tin hiển thị trên toàn bộ website.',
 inp('groom','Tên chú rể',state.meta.groom,'text',{required:true})+inp('bride','Tên cô dâu',state.meta.bride,'text',{required:true})+inp('weddingDate','Ngày cưới (để trống nếu chưa chọn)',state.meta.weddingDate,'date')+`<div class="wide small-text">Ngày của từng sự kiện và hạn công việc giữ nguyên để bạn điều chỉnh theo kế hoạch thực tế.</div>`,
 'wedding-info','','','Lưu thông tin');
}
function applyWeddingInfo(data){
 const weddingDate=String(data.weddingDate||'').trim();
 const date=new Date(weddingDate+'T12:00:00');
 if(weddingDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(weddingDate)||Number.isNaN(date.getTime())||[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-')!==weddingDate))throw Error('Ngày cưới không hợp lệ.');
 if(weddingDate!==state.meta.weddingDate)view.scheduleDate='all';
 state.meta={...state.meta,groom:String(data.groom||'').trim()||'Rể',bride:String(data.bride||'').trim()||'Dâu',weddingDate};
}
function openImportExcel(){
 showModal('Nhập danh sách Excel / CSV','Hỗ trợ .xlsx, .csv và .tsv. Nhập thêm vào danh sách hiện tại; không xóa dữ liệu cũ.',
 `<div class="wide"><div class="upload-drop"><div>Chọn một tệp Excel hoặc CSV từ máy</div><input id="import-file" type="file" name="upload" accept=".xlsx,.csv,.tsv" required /></div><p class="small-text" style="margin-top:12px">Các cột nhận diện: Nhóm, Họ tên, SĐT, Người đi cùng, Xác nhận, Số người đã đến, Bàn, Ghi chú. Các cột không có sẽ dùng giá trị mặc định.</p></div>`+sel('groupId','Nhóm mặc định (nếu tệp không có cột Nhóm)',state.guestGroups[0]?.id||'',groupOptions(),true),
 'import-excel','',false,'Nhập dữ liệu');
}
function openImportJSON(){
 showModal('Khôi phục dữ liệu JSON','Chọn tệp sao lưu tạo bởi ứng dụng. Thao tác này sẽ THAY THẾ toàn bộ dữ liệu hiện tại.',
 `<div class="wide"><input class="field" type="file" name="upload" accept=".json" required/></div>`,'import-json','',false,'Khôi phục');
}
function openNewGroup(){showModal('Thêm nhóm khách mời','Bạn có thể tạo nhóm theo mối quan hệ hoặc khu vực.',inp('name','Tên nhóm mới','','text',{required:true,wide:true,placeholder:'VD: Bạn bè gia đình'}),'new-group');}
function parseGuestLine(line){
 const raw=String(line||'').trim();if(!raw)return null;
 const i=raw.indexOf(','),left=(i<0?raw:raw.slice(0,i)).trim(),note=i<0?'':raw.slice(i+1).trim();
 const m=left.match(/^(.*?)(?:\s*\+(\d+))?$/),name=(m?.[1]||left).trim(),plus=Math.min(1000,Math.max(0,parseInt(m?.[2]||'0',10)));
 return name?{id:id(),name,plus,phone:'',rsvp:'pending',checkedCount:0,invited:false,table:'',note}:null;
}
const readForm=form=>Object.fromEntries(new FormData(form).entries());
async function submitForm(ev){
 ev.preventDefault();const f=ev.target,kind=f.dataset.form,oldId=f.dataset.id||'',data=readForm(f);
 try{
  if(kind==='schedule'){
   if(data.end&&data.end<data.start){toast('Giờ kết thúc phải sau giờ bắt đầu.',true);return}
   const prev=findById(state.schedule,oldId),tasks=(data.taskLines||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(title=>{const old=(prev?.tasks||[]).find(t=>t.title===title);return old?{...old}:{id:id(),title,done:false}});const {taskLines,...fields}=data;const next={...fields,id:oldId||id(),tasks,major:data.major==='yes'};if(oldId){const idx=state.schedule.findIndex(x=>x.id===oldId);if(idx>=0)state.schedule[idx]=next}else state.schedule.push(next);
  }else if(kind==='todo'){
   const next={...data,id:oldId||id()};if(oldId){const idx=state.todos.findIndex(x=>x.id===oldId);if(idx>=0)state.todos[idx]=next}else state.todos.push(next);
  }else if(kind==='budget'){
   const next={...data,id:oldId||id(),estimate:optionalMoney(data.estimate),actual:optionalMoney(data.actual),paid:optionalMoney(data.paid)};
   if(next.actual!==''&&next.paid!==''&&next.paid>next.actual){toast('Đã thanh toán lớn hơn chi phí thực tế. Vui lòng kiểm tra.',true);return}
   if(oldId){const idx=state.budget.findIndex(x=>x.id===oldId);if(idx>=0)state.budget[idx]=next}else state.budget.push(next);
  }else if(kind==='guest'){
   const [oldGroupId,guestId]=oldId.split('|');const {group,guest}=findGuest(oldGroupId,guestId);
   const target=state.guestGroups.find(g=>g.id===data.groupId);if(!target)throw Error('Không tìm thấy nhóm khách.');
   const plus=Math.min(999,Math.floor(nonneg(data.plus))),count=Math.min(1+plus,nonneg(data.checkedCount));
   const next={id:guestId||id(),name:data.name.trim(),phone:data.phone,plus,rsvp:data.rsvp,checkedCount:data.rsvp==='no'?0:count,table:data.table.trim(),invited:data.invited==='yes',note:data.note};
   if(guest){group.guests=group.guests.filter(x=>x.id!==guestId)}target.guests.push(next);
  }else if(kind==='bulk'){
   const g=state.guestGroups.find(x=>x.id===data.groupId);if(!g)throw Error('Chưa có nhóm khách.');
   const people=data.lines.split(/\r?\n/).map(parseGuestLine).filter(Boolean);if(!people.length)throw Error('Hãy nhập ít nhất một khách.');g.guests.push(...people);toast(`Đã thêm ${people.length} khách vào ${g.name}.`);
  }else if(kind==='new-group'){
   state.guestGroups.push({id:id(),name:data.name.trim(),guests:[]});
  }else if(kind==='wedding-info'){
   applyWeddingInfo(data);
  }else if(kind==='budget-target'){
   const target=nonneg(data.budgetTarget);state.meta={...state.meta,budgetTarget:target?String(Math.round(target)):''};
  }else if(kind==='settings'){
   applyWeddingInfo(data);
   const target=nonneg(data.budgetTarget);state.meta={...state.meta,tableSize:Math.max(1,Math.floor(nonneg(data.tableSize)||10)),venue:data.venue,budgetTarget:target?String(Math.round(target)):''};
  }else if(kind==='import-json'){
   const file=data.upload;if(!file)throw Error('Chưa chọn tệp JSON.');const obj=JSON.parse(await file.text());
   if(!window.confirm('Khôi phục sẽ thay thế toàn bộ dữ liệu hiện có. Bạn chắc chắn muốn tiếp tục?'))return;
   state=normalizeState(obj);toast('Đã khôi phục dữ liệu JSON.');
  }else if(kind==='import-excel'){
   const file=data.upload;if(!file)throw Error('Chưa chọn file.');let rows;
   if(/\.xlsx$/i.test(file.name))rows=await parseXLSX(await file.arrayBuffer());
   else rows=readCSV(await file.text());
   const count=importGuestRows(rows,data.groupId);toast(`Đã nhập ${count} khách từ ${file.name}.`);
  }
  closeModal();update();
 }catch(ex){toast(ex.message||'Không thể xử lý biểu mẫu.',true);console.error(ex)}
}
/* ---------------- Ghi/đọc dữ liệu và Excel ---------------- */
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
const stamp=()=>today().replaceAll('-','');
function exportJSON(){download(new Blob([JSON.stringify(state,null,2)],{type:'application/json;charset=utf-8'}),`wedding-backup-${stamp()}.json`);toast('Đã xuất bản sao lưu JSON.');}
function csvCell(v){const s=String(v??'');return /[";,\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s}
function exportCSV(rows,name){const csv='\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');download(new Blob([csv],{type:'text/csv;charset=utf-8'}),name);toast('Đã xuất tệp CSV (mở được bằng Excel).')}
function guestRows(){return[['Nhóm','Họ tên','Số điện thoại','Người đi cùng','Xác nhận','Đã đến','Bàn','Đã gửi thiệp','Ghi chú'],...state.guestGroups.flatMap(g=>g.guests.map(p=>[g.name,p.name,p.phone||'',Math.max(0,num(p.plus)),RSVP[p.rsvp]||RSVP.pending,checked(p),p.table||'',p.invited?'Đã gửi':'Chưa gửi',p.note||'']))]}
function scheduleRows(){return [['Ngày','Bắt đầu','Kết thúc','Sự kiện','Loại','Địa điểm','Phụ trách','Trạng thái','Ghi chú','Việc cần làm','Việc đã xong'],...state.schedule.map(x=>[x.date,x.start,x.end,x.title,x.kind,x.venue,x.owner,EVENT_STATES[x.status],x.notes,(x.tasks||[]).map(t=>t.title).join('; '),(x.tasks||[]).filter(t=>t.done).map(t=>t.title).join('; ')])]}
function todoRows(){return [['Công việc','Nhóm','Ưu tiên','Trạng thái','Hạn','Phụ trách','Ghi chú'],...state.todos.map(x=>[x.title,x.category,PRIORITIES[x.priority],TASK_STATES[x.status],x.due,x.assignee,x.notes])]}
function budgetRows(){return [['Khoản chi','Danh mục','Dự trù (VND)','Thực tế (VND)','Đã thanh toán (VND)','Còn nợ (VND)','Nhà cung cấp','Hạn','Ghi chú'],...state.budget.map(x=>[x.name,x.category,x.estimate,x.actual,x.paid,x.actual===''?'':Math.max(0,nonneg(x.actual)-nonneg(x.paid)),x.vendor,x.due,x.note])]}
function tableRows(){return [['Số bàn','Nhóm','Họ tên','Số người','Xác nhận','Đã đến'],...state.guestGroups.flatMap(g=>g.guests.filter(p=>p.rsvp!=='no').map(p=>[p.table||'Chưa xếp',g.name,p.name,party(p),RSVP[p.rsvp]||RSVP.pending,checked(p)]))]}
const {excelBlob,parseXLSX,readCSV}=window.WeddingXlsx;
function exportXLSX(rows,name){download(excelBlob(rows),name);toast('Đã xuất Excel XLSX.');}
function importGuestRows(rows,defaultGroupId){
 if(!Array.isArray(rows)||!rows.length)throw Error('File không có dòng dữ liệu.');
 const normalize=v=>String(v||'').toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]/g,'');
 const keys=['nhom','hoten','sodienthoai','nguo dicung','nguoidicung','xacnhan','daden','ban','daguithiep','ghichu'];
 const heads=rows[0].map(normalize);const header=heads.some(x=>['nhom','hoten','ten','hotenkhach','khachmoi','sodienthoai','sdt'].includes(x));const data=header?rows.slice(1):rows;
 const idx=(...variants)=>heads.findIndex(h=>variants.includes(h));
 const at=(r,k,defaultV='')=>k<0?defaultV:String(r[k]??defaultV).trim();
 const nameIdx=idx('hoten','hotenkhach','khachmoi','ten','tenkhach');const groupIdx=idx('nhom','nhomkhach','nhomkhachmoi');const phoneIdx=idx('sodienthoai','sdt','dienthoai','phone');const plusIdx=idx('nguoidicung','songuoidicung','dikem','plus');const rsvpIdx=idx('xacnhan','trangthai','phanhoi','rsvp');const arrivedIdx=idx('daden','sodaden','checkin');const tableIdx=idx('ban','soban','banan');const invitedIdx=idx('daguithiep','guithiep');const notesIdx=idx('ghichu','note','notes');
 let count=0;for(const r of data){const name=at(r,header?(nameIdx>=0?nameIdx:0):0);if(!name)continue;
  let group=state.guestGroups.find(g=>g.id===defaultGroupId)||state.guestGroups[0];const groupName=at(r,groupIdx);if(groupName){group=state.guestGroups.find(g=>normalize(g.name)===normalize(groupName));if(!group){group={id:id(),name:groupName,guests:[]};state.guestGroups.push(group)}}
  const raw=at(r,rsvpIdx);const s=normalize(raw);const rsvp=['yes','se den','seden','dongy','xacnhan','co','yesconfirmed'].includes(s)?'yes':['no','khongden','tuchoi','khong'].includes(s)?'no':['maybe','dangcannhac','chac'].includes(s)?'maybe':['pending','yes','no','maybe'].includes(raw)?raw:'pending';
  const p={id:id(),name,phone:at(r,phoneIdx),plus:Math.max(0,Math.floor(nonneg(at(r,plusIdx)))),rsvp,checkedCount:Math.max(0,Math.floor(nonneg(at(r,arrivedIdx)))),table:at(r,tableIdx),invited:/^(da|yes|true|1)/.test(normalize(at(r,invitedIdx))),note:at(r,notesIdx)};p.checkedCount=Math.min(p.checkedCount,party(p));group.guests.push(p);count++;
 }
 if(!count)throw Error('Không tìm thấy dòng tên khách hợp lệ.');return count;
}
/* ---------------- Mẫu ban đầu (chỉ nạp khi người dùng chọn) ---------------- */
function seedSchedule(){
 if(!state.meta.weddingDate){toast('Hãy chọn ngày cưới trước khi dùng lịch trình mẫu.',true);return}
 const templates=scheduleTemplate(state.meta.weddingDate);
 const existing=new Set(state.schedule.map(x=>`${x.date}|${x.title}`));
 const additions=templates.filter(x=>!existing.has(`${x.date}|${x.title}`));
 if(!additions.length){toast('Lịch trình đã có đủ mốc mẫu.');return;}
 if(state.schedule.length&&!window.confirm(`Bổ sung ${additions.length} mốc chưa có vào lịch hiện tại?`))return;
 state.schedule.push(...additions);view.scheduleDate='all';update();toast(`Đã bổ sung ${additions.length} mốc (không trùng lịch hiện có).`);
}
function seedTodo(){
 const templates=todoTemplate(state.meta.weddingDate);
 const existing=new Set(state.todos.map(x=>x.title));
 const additions=templates.filter(x=>!existing.has(x.title));
 if(!additions.length){toast('To-do đã có đủ các mục công việc mẫu.');return;}
 if(state.todos.length&&!window.confirm(`Bổ sung ${additions.length} công việc còn thiếu?`))return;
 state.todos.push(...additions);update();toast(`Đã bổ sung ${additions.length} công việc mẫu.`);
}
function seedTodoExtended(){
 const templates=todoTemplate(state.meta.weddingDate,true),existing=new Set(state.todos.map(x=>x.title));
 const additions=templates.filter(x=>!existing.has(x.title));
 if(!additions.length){toast('Danh sách đã có đủ công việc chi tiết.');return;}
 if(!window.confirm(`Thêm ${additions.length} đầu việc chi tiết tham khảo? Các việc gốc được giữ nguyên.`))return;
 state.todos.push(...additions);update();toast(`Đã bổ sung ${additions.length} đầu việc.`);
}
function seedBudget(){
 if(state.budget.length&&!window.confirm('Thêm các khoản ngân sách mẫu vào danh sách hiện có?'))return;
 const rows=[['Tiệc cưới (dự tính 20 mâm)','Nhà hàng & tiệc cưới',80000000],['Trang trí sân khấu & backdrop','Trang trí & hoa',12000000],['Ảnh cưới / phim cưới','Chụp ảnh & quay phim',18000000],['Váy cưới, áo dài, vest','Trang phục',16000000],['Nhẫn cưới','Nhẫn cưới & lễ vật',20000000],['Lễ vật / mâm quả','Nhẫn cưới & lễ vật',10000000],['Thiệp cưới','Thiệp & quà tặng',3000000],['Quà cảm ơn','Thiệp & quà tặng',5000000],['MC & âm thanh','MC & âm thanh',7000000],['Xe cưới và đi lại','Di chuyển',5000000],['Dự phòng phát sinh','Khác',10000000]];
 state.budget.push(...rows.map(([name,category,estimate])=>({id:id(),name,category,estimate,actual:0,paid:0,vendor:'',due:'',note:'Giá minh họa, không phải báo giá hiện hành.'})));update();toast('Đã nạp ngân sách mẫu. Đơn giá chỉ mang tính minh họa.');
}
/* ---------------- Event delegation ---------------- */
function getActElement(ev){return ev.target.closest('[data-action]')}
function doQuick(groupId){
 const input=$(`input[data-action="quick-guest"][data-group="${CSS.escape(groupId)}"]`),person=parseGuestLine(input?.value);
 if(!person){toast('Nhập tên khách trước khi thêm.',true);input?.focus();return}
 const g=state.guestGroups.find(x=>x.id===groupId);if(!g)return;
 g.guests.push(person);update();const again=$(`input[data-action="quick-guest"][data-group="${CSS.escape(groupId)}"]`);again?.focus();toast(`Đã thêm ${person.name}.`);
}
function removePrompt(thing){return window.confirm(`Bạn chắc chắn muốn xóa ${thing}? Hành động không thể hoàn tác (trừ khi đã sao lưu JSON).`)}
function adoptLinkKey(){
 if(!location.hash.includes('k='))return;
 const ok=sheetStore.adoptKeyFromHash(location.hash);
 try{history.replaceState(null,'',location.pathname+location.search)}catch{}
 return ok;
}
async function startSheet(){
 if(!sheetStore.configured()){setSyncStatus('Chỉ lưu trên máy · Chưa triển khai Apps Script',true);return}
 const app=$('#app');app.inert=true;
 try{
  if(!sheetStore.key()){setSyncStatus('Chưa đồng bộ · hãy mở link riêng có mật khẩu',true);return}
  const remote=await sheetStore.connect(state);
  if(localStorage.getItem(MIGRATION_KEY)&&sheetStore.dirty.size){
   const matrices=SheetSchema.matrixFor(remote),localRows=SheetSchema.rowsFor(state);
   for(const name of sheetStore.dirty)matrices[name]=[SheetSchema.columns[name],...localRows[name]];
   state=normalizeState(SheetSchema.parse(matrices,remote));view.scheduleDate=state.meta.weddingDate||'all';update(false);
   await sheetStore.flush();return;
  }
  const differs=SheetSchema.names.some(name=>JSON.stringify(SheetSchema.rowsFor(state)[name])!==JSON.stringify(SheetSchema.rowsFor(remote)[name]));
  if(!localStorage.getItem(MIGRATION_KEY)&&hadLocalData&&differs&&window.confirm('Trình duyệt có dữ liệu cũ khác Google Sheets. Ghi dữ liệu trên máy lên Sheet? Chọn Hủy để lấy dữ liệu từ Sheet.')){
   await sheetStore.overwrite(state);localStorage.setItem(MIGRATION_KEY,'1');render();toast('Đã chuyển dữ liệu máy lên Google Sheets.');return;
  }
  sheetStore.pending.clear();sheetStore.dirty.clear();sheetStore.revisions=sheetStore.latestRevisions;sheetStore.saveQueue();
  state=normalizeState(remote);view.scheduleDate=state.meta.weddingDate||'all';update(false);
  localChangedSinceBoot=false;localStorage.setItem(MIGRATION_KEY,'1');toast('Đã tải dữ liệu từ Google Sheets.');
 }catch(ex){setSyncStatus(ex.message||'Không thể tải Google Sheets.',true);toast(ex.message||'Không thể tải Google Sheets.',true)}
 finally{$('#app').inert=false}
}
async function reloadSheet(){
 try{
  if(!sheetStore.connected){await startSheet();return}
  if(sheetStore.busy){toast('Đang đồng bộ. Vui lòng thử lại sau.',true);return}
  if(!window.confirm('Tải dữ liệu mới nhất từ Google Sheets và thay thế dữ liệu trên web?'))return;
  const result=await sheetStore.snapshot(state),remote=result.state;
  sheetStore.revisions=result.revisions;sheetStore.baseline=Object.fromEntries(SheetSchema.names.map(name=>[name,JSON.stringify(SheetSchema.rowsFor(remote)[name])]));sheetStore.pending.clear();sheetStore.dirty.clear();sheetStore.saveQueue();
  state=normalizeState(remote);view.scheduleDate=state.meta.weddingDate||'all';update(false);localChangedSinceBoot=false;setSyncStatus('✓ Đã tải Google Sheets');closeModal();toast('Đã tải dữ liệu mới nhất.');
 }catch(ex){setSyncStatus(ex.message||'Không thể tải dữ liệu.',true);toast(ex.message||'Không thể tải dữ liệu.',true)}
}
async function uploadSheet(){
 try{
  if(!sheetStore.connected){toast('Chưa tải được Google Sheets. Hãy kiểm tra Apps Script và thử lại.',true);return}
  if(!window.confirm('Ghi toàn bộ dữ liệu trên máy lên Google Sheets? Thao tác này sẽ thay thế dữ liệu hiện có trong tất cả tab.'))return;
  await sheetStore.overwrite(state);toast('Đã ghi dữ liệu máy lên Google Sheets.');closeModal();
 }catch(ex){setSyncStatus(ex.message||'Không thể ghi dữ liệu.',true);toast(ex.message||'Không thể ghi dữ liệu.',true)}
}
function handleAction(act,el){
 const targetId=el.dataset.id,groupId=el.dataset.group;
 switch(act){
  case 'tab':view.tab=el.dataset.key;view.menu=false;render();window.scrollTo({top:0,behavior:'smooth'});break;
  case 'wedding-info':openWeddingInfo();break;
  case 'retry-sheet':if(sheetStore.connected&&sheetStore.key())sheetStore.flush();else startSheet();break;
  case 'reload-sheet':reloadSheet();break;
  case 'upload-sheet':uploadSheet();break;
  case 'settings':openSettings();break;
  case 'budget-target':openBudgetTarget();break;
  case 'close-modal':closeModal();break;
  case 'new-schedule':openSchedule();break;
  case 'edit-schedule':openSchedule(targetId);break;
  case 'delete-schedule':if(removePrompt('mốc lịch trình này')){state.schedule=state.schedule.filter(x=>x.id!==targetId);update()}break;
  case 'select-schedule-day':view.scheduleDate=el.dataset.date;render();break;
  case 'complete-schedule':{const x=findById(state.schedule,targetId);if(x){x.status=x.status==='done'?'planned':'done';update()}break;}
  case 'new-todo':openTodo();break;
  case 'edit-todo':openTodo(targetId);break;
  case 'toggle-todo':{const x=findById(state.todos,targetId);if(x){x.status=el.checked?'done':'open';update()}break;}
  case 'delete-todo':if(removePrompt('công việc này')){state.todos=state.todos.filter(x=>x.id!==targetId);update()}break;
  case 'duplicate-todo':{const x=findById(state.todos,targetId);if(x){state.todos.push({...x,id:id(),title:x.title+' (bản sao)',status:'open'});update();toast('Đã tạo bản sao công việc.')}break;}
  case 'new-budget':openBudget();break;
  case 'edit-budget':openBudget(targetId);break;
  case 'delete-budget':if(removePrompt('khoản chi này')){state.budget=state.budget.filter(x=>x.id!==targetId);update()}break;
  case 'new-group':openNewGroup();break;
  case 'delete-group':{const g=findById(state.guestGroups,targetId);if(g&&removePrompt(`nhóm "${g.name}" cùng ${g.guests.length} khách`)){state.guestGroups=state.guestGroups.filter(x=>x.id!==targetId);update()}break;}
  case 'move-group':{const idx=state.guestGroups.findIndex(g=>g.id===targetId),next=idx+Number(el.dataset.dir);if(idx>=0&&next>=0&&next<state.guestGroups.length){[state.guestGroups[idx],state.guestGroups[next]]=[state.guestGroups[next],state.guestGroups[idx]];update()}break;}
  case 'quick-guest-button':doQuick(groupId);break;
  case 'edit-guest':openGuest(groupId,targetId);break;
  case 'delete-guest':if(removePrompt('khách mời này')){const g=findById(state.guestGroups,groupId);if(g){g.guests=g.guests.filter(p=>p.id!==targetId);update()}}break;
  case 'checkin-guest':{const {guest}=findGuest(groupId,targetId);if(guest){if(guest.rsvp==='no'){toast('Hãy đổi xác nhận tham dự trước khi điểm danh.',true);break}guest.checkedCount=checked(guest)?0:party(guest);update();toast(guest.checkedCount?'Đã ghi nhận khách đến.':'Đã hủy điểm danh.')}break;}
  case 'bulk-guests':if(!state.guestGroups.length){openNewGroup()}else openBulkGuests();break;
  case 'toggle-invited':{const {guest}=findGuest(groupId,targetId);if(guest){guest.invited=!guest.invited;update()}break}
  case 'invite-group':{const g=findById(state.guestGroups,targetId);if(g){const todo=g.guests.filter(p=>!p.invited&&p.rsvp!=='no');if(!todo.length){toast('Cả nhóm đã được đánh dấu gửi thiệp.');break}if(!window.confirm(`Đánh dấu ${todo.length} khách trong “${g.name}” là đã gửi thiệp?`))break;todo.forEach(p=>p.invited=true);update();toast(`Đã đánh dấu ${todo.length} khách đã gửi thiệp.`)}break}
  case 'guest-mode':view.guestMode=el.dataset.mode;render();break;
  case 'seed-schedule':seedSchedule();break;
  case 'seed-todo':seedTodo();break;
  case 'seed-todo-extended':seedTodoExtended();break;
  case 'seed-budget':seedBudget();break;
  case 'export-json':exportJSON();break;
  case 'import-json':openImportJSON();break;
  case 'export-guests-xlsx':exportXLSX(guestRows(),`danh-sach-khach-moi-${stamp()}.xlsx`);break;
  case 'import-excel':if(!state.guestGroups.length){openNewGroup()}else openImportExcel();break;
  case 'export-schedule-csv':exportXLSX(scheduleRows(),`lich-trinh-${stamp()}.xlsx`);break;
  case 'export-todo-csv':exportXLSX(todoRows(),`cong-viec-${stamp()}.xlsx`);break;
  case 'export-budget-csv':exportXLSX(budgetRows(),`ngan-sach-${stamp()}.xlsx`);break;
  case 'export-tables-csv':exportCSV(tableRows(),`so-do-ban-${stamp()}.csv`);break;
  case 'reset-data':if(window.confirm('Đặt lại toàn bộ lịch trình, công việc, ngân sách và khách mời? Thay đổi sẽ tự ghi lên Google Sheets khi dịch vụ hoạt động.')){state=defaultState();view.tab='schedule';closeModal();update();toast('Đã đặt lại dữ liệu.')}break;
 }
}
function restoreFocus(el,filterName,pos){const next=$(`[data-filter="${filterName}"]`);if(!next)return;next.focus();if(next.setSelectionRange&&typeof pos==='number'){next.setSelectionRange(pos,pos)}}
document.addEventListener('click',ev=>{
 const el=getActElement(ev);
 if(el){if(el.type==='checkbox')return;handleAction(el.dataset.action,el);return}
 if(ev.target.matches('.modal-backdrop'))closeModal();
});
document.addEventListener('change',ev=>{
 const t=ev.target;
 if(t.matches('[data-filter]')){view[t.dataset.filter]=t.value;render();return}
 if(t.dataset.action==='rsvp-change'){const {guest}=findGuest(t.dataset.group,t.dataset.id);if(guest){guest.rsvp=t.value;if(t.value==='no')guest.checkedCount=0;update()}return}
 if(t.dataset.action==='toggle-todo'){handleAction('toggle-todo',t);return}
 if(t.dataset.action==='toggle-schedule-task'){const event=findById(state.schedule,t.dataset.event),task=event?.tasks?.find(x=>x.id===t.dataset.id);if(task){task.done=t.checked;update()}return}
 if(t.dataset.action==='rename-group'){const g=findById(state.guestGroups,t.dataset.id);if(g&&t.value.trim()){g.name=t.value.trim();update()}return}
});
document.addEventListener('input',ev=>{
 const t=ev.target;if(t.dataset.filter&&t.type==='search'){const pos=t.selectionStart;view[t.dataset.filter]=t.value;render();restoreFocus(t,t.dataset.filter,pos)}
});
document.addEventListener('keydown',ev=>{
 if(ev.key==='Escape'&&modal){closeModal();return}
 if(ev.key==='Enter'&&ev.target.dataset.action==='quick-guest'){ev.preventDefault();doQuick(ev.target.dataset.group)}
 if(ev.key==='Enter'&&ev.target.dataset.action==='rename-group'){ev.preventDefault();ev.target.blur()}
});
document.addEventListener('submit',ev=>{if(ev.target.id==='editor-form')submitForm(ev)});
/* Drag-and-drop nhóm khách, bên cạnh nút lên / xuống có sẵn */
let dragging=null;
document.addEventListener('dragstart',ev=>{const h=ev.target.closest('.drag-handle');if(!h)return;dragging=h.closest('.guest-group')?.dataset.group;ev.dataTransfer?.setData('text/plain',dragging||'');ev.dataTransfer&&(ev.dataTransfer.effectAllowed='move')});
document.addEventListener('dragover',ev=>{if(dragging&&ev.target.closest('.guest-group'))ev.preventDefault()});
document.addEventListener('drop',ev=>{const target=ev.target.closest('.guest-group')?.dataset.group;if(!target||!dragging||target===dragging)return;ev.preventDefault();const old=state.guestGroups.findIndex(g=>g.id===dragging),to=state.guestGroups.findIndex(g=>g.id===target);if(old<0||to<0)return;state.guestGroups.splice(to,0,...state.guestGroups.splice(old,1));dragging=null;update()});
document.addEventListener('dragend',()=>dragging=null);
/* Khởi động, ghi v2 để không nạp lại dữ liệu mẫu đã xóa khi tải lại. */
adoptLinkKey();render();persist();startSheet();
window.addEventListener('hashchange',()=>{if(adoptLinkKey())startSheet()});
})();
