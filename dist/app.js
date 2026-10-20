'use strict';
const icons = {
  building:'<path d="M4 21V3h16v18M2 21h20M8 7h2m4 0h2M8 11h2m4 0h2M10 21v-6h4v6"/>',
  home:'<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7"/>',
  dashboard:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  door:'<path d="M4 21V3h13v18M2 21h20M17 6h3v15M13 12h.01"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.9"/><circle cx="9" cy="7" r="4"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
  user:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2"/>',
  receipt:'<path d="M4 3v18l4-2 4 2 4-2 4 2V3l-4 2-4-2-4 2-4-2ZM8 9h8M8 13h5"/>',
  wallet:'<path d="M20 7V4H4a2 2 0 0 0 0 4h17v12H4a2 2 0 0 1-2-2V6m19 6h-6v4h6M17 14h.01"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2m4 0h2"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  chevron:'<path d="m9 5 7 7-7 7"/>',
  shield:'<path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Z"/><path d="m8 12 3 3 5-6"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  alert:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 17h.01"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  wrench:'<path d="m14 6 4 4m-8 2-7 7 2 2 7-7a6 6 0 0 0 8-8l-4 4-2-2 4-4a6 6 0 0 0-8 8Z"/>',
  edit:'<path d="m16 3 5 5-11 11-6 1 1-6L16 3ZM13 6l5 5"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  light:'<path d="M9 18h6M9 21h6M8 14a6 6 0 1 1 8 0l-1 2H9l-1-2ZM12 1v1M3 5l1 1m16 0 1-1M1 12h2m18 0h2"/>'
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.home}</svg>`;
const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const baht = (value) => new Intl.NumberFormat('th-TH').format(value);
const currentMonth = '2026-10';
const previewDate = '2026-10-09';
const monthLabels = { '2026-10': 'ตุลาคม 2569', '2026-09': 'กันยายน 2569', '2026-08': 'สิงหาคม 2569' };
const storageKey = 'baanprom-dorm-preview-v1';
let data = {version:1,rooms:[],tenants:[],invoices:[]};
let loaded = false;
let saving = false;
let selectedMonth = currentMonth;
let view = ['overview','rooms','tenants','payments'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
let filters = { search:'', status:'all', floor:'all', payment:'all' };
const tenantFor = (roomId) => data.tenants.find(tenant => tenant.room === roomId);
const total = (invoice) => invoice.rent + invoice.water + invoice.electric;
const monthlyInvoices = () => data.invoices.filter(invoice => invoice.month === selectedMonth);
const unpaidInvoices = () => monthlyInvoices().filter(invoice => !invoice.paid);
const dueDate = (invoice) => invoice.dueAt || `${invoice.month}-05`;
const isOverdue = (invoice) => !invoice.paid && dueDate(invoice) < previewDate;
function roomStatus(room) {
  if(room.status === 'repair') return 'repair';
  const tenant = tenantFor(room.id);
  if(!tenant) return 'vacant';
  return monthlyInvoices().some(invoice => invoice.tenantId === tenant.id && isOverdue(invoice)) ? 'late' : 'occupied';
}
const statusLabels = {occupied:'มีผู้เช่า',vacant:'ห้องว่าง',late:'ค้างชำระ',repair:'ปรับปรุง'};
function dateLabel(date) { return date ? new Date(`${date}T12:00:00`).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'}) : '—'; }
function statsHTML() {
  const invoices = monthlyInvoices();
  const received = invoices.filter(item => item.paid).reduce((sum,item) => sum + total(item),0);
  const late = unpaidInvoices().filter(isOverdue);
  const lateAmount = late.reduce((sum,item) => sum + total(item),0);
  const vacant = data.rooms.filter(room => roomStatus(room) === 'vacant').length;
  return `<section class="stats" aria-label="สรุปหอพัก">
    <article class="stat"><div class="stat-top">รับชำระแล้วเดือนนี้<span class="stat-icon">${icon('wallet')}</span></div><div class="stat-value">฿${baht(received)}</div><div class="stat-bottom"><span class="positive">${icon('check').replace('<svg ', '<svg style="width:12px;height:12px" ')}</span>จาก ${invoices.filter(item => item.paid).length} รายการที่ชำระแล้ว</div></article>
    <article class="stat"><div class="stat-top">ห้องที่มีผู้เช่า<span class="stat-icon blue">${icon('door')}</span></div><div class="stat-value">${data.tenants.length}<small>/ ${data.rooms.length} ห้อง</small></div><div class="stat-bottom">อัตราการเข้าพัก ${Math.round(data.tenants.length / data.rooms.length * 100)}%</div></article>
    <article class="stat"><div class="stat-top">ห้องว่างพร้อมเข้าพัก<span class="stat-icon amber">${icon('home')}</span></div><div class="stat-value">${vacant}<small>ห้อง</small></div><div class="stat-bottom">${data.rooms.filter(room => room.status === 'repair').length} ห้องอยู่ระหว่างปรับปรุง</div></article>
    <article class="stat"><div class="stat-top">ค่าเช่าค้างชำระ<span class="stat-icon red">${icon('receipt')}</span></div><div class="stat-value">฿${baht(lateAmount)}</div><div class="stat-bottom"><span class="warn">${late.length} ห้อง</span> · ครบกำหนดวันที่ 5 ของเดือน</div></article>
  </section>`;
}
function overviewHTML() {
  const late = unpaidInvoices();
  const vacant = data.rooms.filter(room => roomStatus(room) === 'vacant');
  return `${statsHTML()}<div class="dashboard-columns"><section class="panel"><div class="panel-header"><div><h2>สถานะห้องพัก</h2><div class="panel-subtitle">มองเห็นทุกห้อง ในภาพเดียว</div></div><button class="text-button" data-go="rooms">จัดการห้องพัก</button></div><div class="legend"><span><i></i>มีผู้เช่า</span><span><i class="vacant"></i>ห้องว่าง</span><span><i class="late"></i>ค้างชำระ</span><span><i class="repair"></i>ปรับปรุง</span></div><div class="floors">${[3,2,1].map(floor=>`<div class="floor"><span class="floor-label">ชั้น ${floor}</span><div class="room-row">${data.rooms.filter(room=>room.floor===floor).map(room=>{const status=roomStatus(room);return `<button class="room-tile ${status}" data-room="${room.id}" aria-label="ห้อง ${room.id} ${statusLabels[status]}">${icon(status==='vacant'?'door':status==='repair'?'wrench':'user')}<strong>${room.id}</strong><small>${statusLabels[status]}</small></button>`;}).join('')}</div></div>`).join('')}</div><div class="panel-summary"><span>${icon('building')}ทั้งหมด ${data.rooms.length} ห้อง · 3 ชั้น</span><strong>${vacant.length} ห้องพร้อมรับผู้เช่าใหม่</strong></div></section><div class="dashboard-side"><section class="panel"><div class="panel-header"><div class="overdue-header"><h2>รอชำระค่าเช่า</h2><span class="count-pill">${late.length}</span></div></div><div class="overdue-list">${late.length?late.slice(0,3).map(invoice=>`<button class="overdue-item" data-invoice="${escapeHTML(invoice.id)}" style="width:100%;text-align:left;background:none;border-left:0;border-right:0;border-top:0;cursor:pointer"><span class="room-avatar">${invoice.room}</span><span class="person"><strong>${escapeHTML(invoice.name.split(' ')[0])}</strong><small>ห้อง ${invoice.room}</small></span><span class="overdue-amount">฿${baht(total(invoice))}<small>ครบกำหนด 5 ${selectedMonth==='2026-10'?'ต.ค.':selectedMonth==='2026-09'?'ก.ย.':'ส.ค.'}</small></span></button>`).join(''):`<div class="empty">${icon('check')}<strong>รับชำระครบแล้ว</strong><p>ไม่มีค่าเช่าค้างชำระในเดือนนี้</p></div>`}</div><div class="overdue-footer"><button data-go="payments" data-unpaid="true">ดูรายการชำระเงินทั้งหมด</button></div></section><div class="insight">${icon('light')}<div><strong>${vacant.length?`อีก ${vacant.length} ห้องพร้อมสร้างรายรับ`:'ห้องพักพร้อมรองรับผู้เช่า'}</strong><p>${vacant.length?`ห้อง ${vacant.map(room=>room.id).join(', ')} ว่างอยู่<br>เพิ่มผู้เช่าและเริ่มจัดการค่าเช่าได้เลย`:'ตรวจสอบรายละเอียดผู้เช่าและสถานะห้องพักได้ในเมนูห้องพัก'}</p></div></div></div></div><section class="panel table-panel"><div class="panel-header"><div><h2>การชำระเงินล่าสุด</h2><div class="panel-subtitle">รายการรับชำระใน${monthLabels[selectedMonth]}</div></div><button class="text-button" data-go="payments">ดูทั้งหมด</button></div>${invoiceTableHTML(monthlyInvoices().filter(invoice=>invoice.paid).sort((a,b)=>(b.paidAt||'').localeCompare(a.paidAt||'')).slice(0,5),false)}</section>`;
}
function invoiceTableHTML(invoices,actions=true) {
  if(!invoices.length) return `<div class="empty">${icon('receipt')}<strong>ยังไม่มีรายการ</strong><p>ลองเปลี่ยนเดือนหรือตัวกรอง</p></div>`;
  return `<div class="table-wrap"><table><thead><tr><th>ผู้เช่า</th><th>ห้อง</th><th>ยอดชำระ</th><th>ช่องทาง</th><th>สถานะ</th><th>${actions?'จัดการ':'วันที่ชำระ'}</th></tr></thead><tbody>${invoices.map(invoice=>`<tr><td><div class="table-person"><span class="avatar">${escapeHTML(invoice.name.charAt(0))}</span><div><strong>${escapeHTML(invoice.name)}</strong><small>${monthLabels[invoice.month]}</small></div></div></td><td><span class="room-number">${invoice.room}</span></td><td class="money">฿${baht(total(invoice))}</td><td>${invoice.paid?escapeHTML(invoice.method):'—'}</td><td><span class="badge ${invoice.paid?'':isOverdue(invoice)?'late':'pending'}">${invoice.paid?'ชำระแล้ว':isOverdue(invoice)?'ค้างชำระ':'รอชำระ'}</span></td><td>${actions?`<button class="${invoice.paid?'text-button':'button small primary'}" data-invoice="${escapeHTML(invoice.id)}">${invoice.paid?'ดูรายละเอียด':'รับชำระ'}</button>`:`<span class="table-date">${dateLabel(invoice.paidAt)}</span>`}</td></tr>`).join('')}</tbody></table></div>`;
}
function roomsHTML() {
  const filtered = data.rooms.filter(room => (filters.floor==='all'||String(room.floor)===filters.floor) && (filters.status==='all'||roomStatus(room)===filters.status) && `${room.id} ${tenantFor(room.id)?.name || ''}`.toLowerCase().includes(filters.search.toLowerCase()));
  return `<div class="toolbar"><label class="search">${icon('search')}<input id="search-input" type="search" placeholder="ค้นหาห้อง หรือชื่อผู้เช่า" aria-label="ค้นหาห้อง" value="${escapeHTML(filters.search)}"></label><select id="floor-filter" aria-label="ชั้น"><option value="all">ทุกชั้น</option>${[1,2,3].map(floor=>`<option value="${floor}" ${filters.floor===String(floor)?'selected':''}>ชั้น ${floor}</option>`).join('')}</select><select id="status-filter" aria-label="สถานะห้อง"><option value="all">ทุกสถานะ</option>${Object.entries(statusLabels).map(([key,label])=>`<option value="${key}" ${filters.status===key?'selected':''}>${label}</option>`).join('')}</select><span class="toolbar-count">${filtered.length} ห้อง</span></div><div class="room-cards">${filtered.map(room=>{const tenant=tenantFor(room.id);const status=roomStatus(room);return `<article class="room-card"><div class="room-card-top"><h2>${room.id}</h2><span class="badge ${status}">${statusLabels[status]}</span></div><p>ชั้น ${room.floor} · ${room.type}</p><div class="room-card-details"><div><span>ค่าเช่าต่อเดือน</span><strong>฿${baht(room.rate)}</strong></div><div><span>ผู้เช่า</span><strong>${tenant?escapeHTML(tenant.name):'—'}</strong></div></div><button class="button small" data-room="${room.id}">ดูรายละเอียดห้อง</button></article>`;}).join('')||emptyHTML('ไม่พบห้องพัก','ลองเปลี่ยนคำค้นหาหรือตัวกรอง')}</div>`;
}
function tenantsHTML() {
  const filtered = data.tenants.filter(tenant => `${tenant.name} ${tenant.room} ${tenant.phone}`.toLowerCase().includes(filters.search.toLowerCase()));
  return `<div class="toolbar"><label class="search">${icon('search')}<input id="search-input" type="search" placeholder="ค้นหาชื่อ ห้อง หรือเบอร์โทร" aria-label="ค้นหาผู้เช่า" value="${escapeHTML(filters.search)}"></label><span class="toolbar-count">ผู้เช่าทั้งหมด ${filtered.length} คน</span></div><section class="panel">${filtered.length?`<div class="table-wrap"><table><thead><tr><th>ผู้เช่า</th><th>ห้อง</th><th>เบอร์โทรศัพท์</th><th>วันที่เข้าพัก</th><th>ค่าเช่า / เดือน</th><th>จัดการ</th></tr></thead><tbody>${filtered.map(tenant=>`<tr><td><div class="table-person"><span class="avatar">${escapeHTML(tenant.name.charAt(0))}</span><strong>${escapeHTML(tenant.name)}</strong></div></td><td><span class="room-number">${tenant.room}</span></td><td>${escapeHTML(tenant.phone)}</td><td class="table-date">${dateLabel(tenant.moveIn)}</td><td class="money">฿${baht(data.rooms.find(room=>room.id===tenant.room)?.rate||0)}</td><td><button class="text-button" data-tenant="${escapeHTML(tenant.id)}">ดู / แก้ไข</button></td></tr>`).join('')}</tbody></table></div>`:emptyHTML('ไม่พบผู้เช่า','ลองค้นหาด้วยชื่อหรือหมายเลขห้อง')}</section>`;
}
function paymentsHTML() {
  const invoices = monthlyInvoices().filter(invoice => (filters.payment==='all'||(filters.payment==='paid'?invoice.paid:!invoice.paid)) && `${invoice.name} ${invoice.room}`.toLowerCase().includes(filters.search.toLowerCase()));
  return `${statsHTML()}<div class="toolbar"><label class="search">${icon('search')}<input id="search-input" type="search" placeholder="ค้นหาห้อง หรือชื่อผู้เช่า" aria-label="ค้นหารายการชำระเงิน" value="${escapeHTML(filters.search)}"></label><div class="payment-summary">${[['all','ทั้งหมด'],['unpaid','ค้างชำระ'],['paid','ชำระแล้ว']].map(([key,label])=>`<button class="filter-chip ${filters.payment===key?'active':''}" data-payment-filter="${key}" aria-pressed="${filters.payment===key}">${label}</button>`).join('')}</div></div><section class="panel"><div class="panel-header"><div><h2>ค่าเช่า${monthLabels[selectedMonth]}</h2><div class="panel-subtitle">ค่าเช่า + ค่าน้ำ + ค่าไฟ · ${invoices.length} รายการ</div></div><button class="button small" id="export-button">${icon('download')}ส่งออก CSV</button></div>${invoiceTableHTML(invoices)}</section>`;
}
function emptyHTML(title,description) { return `<div class="empty">${icon('search')}<strong>${title}</strong><p>${description}</p></div>`; }
const views = {
  overview:{title:'ภาพรวมของหอพัก',description:'ทุกเรื่องของหอพัก อยู่ในที่เดียว',eyebrow:'YOUR PROPERTY, AT A GLANCE',render:overviewHTML},
  rooms:{title:'ห้องพัก',description:'จัดการทุกห้อง ให้พร้อมสำหรับผู้เช่า',eyebrow:'ROOM MANAGEMENT',render:roomsHTML},
  tenants:{title:'ผู้เช่า',description:'ข้อมูลและรายละเอียดการเข้าพัก',eyebrow:'YOUR RESIDENTS',render:tenantsHTML},
  payments:{title:'ค่าเช่าและการชำระเงิน',description:'ติดตามค่าเช่า รับชำระ และดูประวัติในแต่ละเดือน',eyebrow:'RENT & PAYMENTS',render:paymentsHTML}
};
function render() {
  const page = views[view];
  $('#page-title').textContent=page.title;
  $('#page-description').textContent=page.description;
  $('#page-eyebrow').textContent=page.eyebrow;
  $('#breadcrumb-view').textContent=view==='overview'?'ภาพรวม':page.title;
  $('#view-content').innerHTML=page.render();
  document.querySelectorAll('.overdue-item').forEach(item=>{
    const invoice=data.invoices.find(invoice=>invoice.id===item.dataset.invoice);
    if(invoice)item.querySelector('.overdue-amount small').textContent=`ครบกำหนด ${new Date(`${dueDate(invoice)}T12:00:00`).toLocaleDateString('th-TH',{day:'numeric',month:'short'})}`;
  });
  document.querySelectorAll('[data-view]').forEach(link=>{link.classList.toggle('active',link.dataset.view===view);if(link.dataset.view===view) link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
  $('#unpaid-count').textContent=unpaidInvoices().length || '';
  $('#unpaid-count').hidden=!unpaidInvoices().length;
  $('#notification-dot').hidden=!unpaidInvoices().length;
  $('#occupancy-percent').textContent=`${Math.round(data.tenants.length/data.rooms.length*100)}%`;
  $('#occupancy-progress').style.width=`${data.tenants.length/data.rooms.length*100}%`;
  $('#occupancy-caption').textContent=`${data.tenants.length} จาก ${data.rooms.length} ห้องมีผู้เช่า`;
  $('#add-tenant').disabled=!loaded||saving;
}
function navigate(next,paymentFilter='all') { view=next;filters={search:'',status:'all',floor:'all',payment:paymentFilter};location.hash=next;render();closeMenu(); }
function closeMenu() { $('#sidebar').classList.remove('open');$('#sidebar').inert=window.innerWidth<=760;$('#backdrop').hidden=true;$('#menu-button').setAttribute('aria-expanded','false'); }
function toast(message) { $('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,3500); }
async function api(url,method='GET',payload) {
  const response=await fetch(url,{method,headers:payload?{'Content-Type':'application/json'}:{},body:payload?JSON.stringify(payload):undefined,cache:'no-store',signal:AbortSignal.timeout(10000)});
  let body;
  try{body=await response.json();}catch{throw new Error('ไม่สามารถอ่านคำตอบจากระบบได้ กรุณาลองอีกครั้ง');}
  if(!response.ok){const error=new Error(body.error||'ไม่สามารถบันทึกข้อมูลได้');error.status=response.status;throw error;}
  if(!body||body.version!==1||!['rooms','tenants','invoices'].every(key=>Array.isArray(body[key]))||!Number.isSafeInteger(body.meta?.revision))throw new Error('ข้อมูลที่ได้รับไม่ครบถ้วน กรุณาลองอีกครั้ง');
  return body;
}
function ensureUnchanged(record,original,label) {
  if(!record||JSON.stringify(record)!==JSON.stringify(original))throw new Error(`${label}เปลี่ยนแล้ว กรุณาปิดหน้าต่างและเปิดรายละเอียดล่าสุดก่อนยืนยัน`);
}
async function writeRequest(url,method,payload) {
  for(let attempt=0;attempt<2;attempt++){
    try{return await api(url,method,payload);}catch(error){if(attempt===1||error.status&&error.status<500)throw error;}
  }
}
async function persist(change,onSuccess) {
  if(!loaded||saving)return;
  const draft=structuredClone(data);
  try{change(draft);}catch(error){toast(error.message);return;}
  const payload={revision:data.meta.revision,mutationId:crypto.randomUUID(),data:{version:1,rooms:draft.rooms,tenants:draft.tenants,invoices:draft.invoices}};
  const controls=[...document.querySelectorAll('#editor-dialog button,#editor-dialog input,#editor-dialog select')].map(element=>({element,disabled:element.disabled}));
  saving=true;controls.forEach(({element})=>element.disabled=true);$('#add-tenant').disabled=true;
  $('#saved-label').textContent='กำลังบันทึกข้อมูล…';
  try{
    data=await writeRequest('/api/state','PUT',payload);
    render();$('#saved-label').textContent=`บันทึกข้อมูลแล้ว · ${new Date(data.meta.updatedAt).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})}`;
    onSuccess();
  }catch(error){
    if(error.status===409){try{data=await api('/api/state');render();}catch{}}
    $('#saved-label').textContent='ยังบันทึกการแก้ไขนี้ไม่สำเร็จ';
    toast(error.status?error.message:'ไม่สามารถยืนยันการบันทึกได้ กรุณาลองอีกครั้ง ข้อมูลในฟอร์มยังอยู่');
  }finally{
    saving=false;controls.forEach(({element,disabled})=>element.disabled=disabled);$('#add-tenant').disabled=!loaded;
  }
}
async function loadData() {
  loaded=false;$('#add-tenant').disabled=true;$('#month-select').disabled=true;
  $('#view-content').innerHTML='<div class="empty"><strong>กำลังโหลดข้อมูลหอพัก…</strong></div>';
  $('#saved-label').textContent='กำลังโหลดข้อมูล…';
  try{
    data=await api('/api/state');
    let legacy=null;
    try{legacy=JSON.parse(localStorage.getItem(storageKey));}catch{}
    if(legacy&&data.meta.importAllowed){
      try{
        data=await writeRequest('/api/import','POST',{revision:data.meta.revision,mutationId:crypto.randomUUID(),data:legacy});
        toast('ย้ายข้อมูลเดิมเข้าฐานข้อมูลแล้ว');
      }catch(error){
        data=await api('/api/state');
        toast(error.status===409?'ฐานข้อมูลมีการแก้ไขแล้ว เก็บข้อมูลเดิมในเบราว์เซอร์ไว้เป็นสำรอง':'ย้ายข้อมูลเดิมไม่ได้ ข้อมูลเดิมยังอยู่ในเบราว์เซอร์');
      }
    }
    loaded=true;$('#month-select').disabled=false;render();
    $('#saved-label').textContent='ข้อมูลบันทึกอยู่ในฐานข้อมูล';
  }catch{
    $('#view-content').innerHTML='<div class="empty"><strong>โหลดข้อมูลหอพักไม่ได้</strong><p>ตรวจสอบว่าเว็บยังเปิดทำงานอยู่ แล้วลองอีกครั้ง</p><button class="button primary" id="retry-load" style="margin-top:16px">โหลดข้อมูลอีกครั้ง</button></div>';
    $('#saved-label').textContent='ยังเชื่อมต่อข้อมูลไม่ได้';
    $('#retry-load').onclick=loadData;
  }
}
document.querySelectorAll('[data-icon]').forEach(element=>element.innerHTML=icon(element.dataset.icon));
document.addEventListener('click',event=>{
  if(!loaded||saving)return;
  const nav=event.target.closest('[data-view],[data-go]');if(nav){event.preventDefault();navigate(nav.dataset.view||nav.dataset.go,nav.dataset.unpaid?'unpaid':'all');return;}
  const room=event.target.closest('[data-room]');if(room){openRoom(room.dataset.room);return;}
  const tenant=event.target.closest('[data-tenant]');if(tenant){openTenant(tenant.dataset.tenant);return;}
  const invoice=event.target.closest('[data-invoice]');if(invoice){openInvoice(invoice.dataset.invoice);return;}
  const filter=event.target.closest('[data-payment-filter]');if(filter){filters.payment=filter.dataset.paymentFilter;render();return;}
  if(event.target.closest('#export-button')) exportInvoices();
});
document.addEventListener('input',event=>{if(event.target.id==='search-input'){const cursor=event.target.selectionStart;filters.search=event.target.value;render();const input=$('#search-input');input.focus();input.setSelectionRange(cursor,cursor);}});
document.addEventListener('change',event=>{if(event.target.id==='floor-filter'){filters.floor=event.target.value;render();}if(event.target.id==='status-filter'){filters.status=event.target.value;render();}});
$('#month-select').addEventListener('change',event=>{selectedMonth=event.target.value;render();});
$('#notification-button').addEventListener('click',()=>navigate('payments','unpaid'));
$('#menu-button').addEventListener('click',()=>{if(!loaded)return;const open=!$('#sidebar').classList.contains('open');$('#sidebar').classList.toggle('open',open);$('#sidebar').inert=!open;$('#backdrop').hidden=!open;$('#menu-button').setAttribute('aria-expanded',String(open));});
window.matchMedia('(max-width:760px)').addEventListener('change',closeMenu);
$('#backdrop').addEventListener('click',closeMenu);
document.addEventListener('keydown',event=>{if(event.key==='Escape') closeMenu();});
window.addEventListener('hashchange',()=>{const next=location.hash.slice(1);if(views[next]&&next!==view) navigate(next);});
$('#close-dialog').addEventListener('click',()=>{if(!saving)$('#editor-dialog').close();});
$('#editor-dialog').addEventListener('cancel',event=>{if(saving)event.preventDefault();});
$('#editor-dialog').addEventListener('click',event=>{if(!saving&&event.target===$('#editor-dialog')){const rect=event.target.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom) event.target.close();}});
function openDialog(title,content) { $('#dialog-title').textContent=title;$('#dialog-body').innerHTML=content;if(!$('#editor-dialog').open)$('#editor-dialog').showModal(); }
function openRoom(roomId) { const room=data.rooms.find(item=>item.id===roomId);if(!room)return;const tenant=tenantFor(roomId);const status=roomStatus(room);openDialog(`ห้อง ${room.id}`,`<div class="dialog-content"><span class="badge ${status}">${statusLabels[status]}</span><div class="detail-metrics"><div><small>ค่าเช่าต่อเดือน</small><strong>฿${baht(room.rate)}</strong></div><div><small>ห้องพัก</small><strong>ชั้น ${room.floor}</strong></div></div><div class="detail-row"><span>ประเภทห้อง</span><strong>${escapeHTML(room.type)}</strong></div><div class="detail-row"><span>ผู้เช่า</span><strong>${tenant?escapeHTML(tenant.name):'ไม่มีผู้เช่า'}</strong></div>${tenant?`<div class="detail-row"><span>เบอร์โทรศัพท์</span><strong>${escapeHTML(tenant.phone)}</strong></div><div class="detail-row"><span>วันที่เข้าพัก</span><strong>${dateLabel(tenant.moveIn)}</strong></div>`:''}<div class="dialog-actions"><button class="button" id="edit-room">${icon('edit')}แก้ไขห้อง</button>${tenant?`<button class="button primary" id="room-tenant">ดูข้อมูลผู้เช่า</button>`:status==='vacant'?'<button class="button primary" id="room-add-tenant">เพิ่มผู้เช่าห้องนี้</button>':''}</div></div>`);$('#edit-room').onclick=()=>editRoom(roomId);if($('#room-tenant'))$('#room-tenant').onclick=()=>{$('#editor-dialog').close();openTenant(tenant.id);};if($('#room-add-tenant'))$('#room-add-tenant').onclick=()=>{$('#editor-dialog').close();openTenant(null,roomId);}; }
function editRoom(roomId) {
  const room=data.rooms.find(item=>item.id===roomId);
  if(!room)return;
  const occupied=!!tenantFor(roomId);
  openDialog(`แก้ไขห้อง ${roomId}`,`<form class="dialog-form" id="room-form"><div class="form-grid"><div class="field full"><label for="room-type">รายละเอียดห้อง</label><input id="room-type" name="type" required maxlength="80" value="${escapeHTML(room.type)}"></div><div class="field"><label for="room-rate">ค่าเช่าต่อเดือน (บาท)</label><input id="room-rate" name="rate" type="number" required min="500" max="100000" step="1" value="${room.rate}"></div><div class="field"><label for="room-status">สถานะห้อง</label><select id="room-status" name="status" ${occupied?'disabled':''}><option value="normal" ${room.status==='normal'?'selected':''}>พร้อมให้เช่า</option><option value="repair" ${room.status==='repair'?'selected':''}>อยู่ระหว่างปรับปรุง</option></select></div><div class="field-hint field full">ค่าเช่าใหม่จะใช้กับรายการที่ออกในอนาคต ยอดค่าเช่าที่ออกแล้วคงเดิม${occupied?'<br>ย้ายผู้เช่าออกก่อนเปลี่ยนห้องเป็นสถานะปรับปรุง':''}</div></div><div class="dialog-actions"><button class="button" type="button" id="room-cancel">ยกเลิก</button><button class="button primary" type="submit">บันทึกห้องพัก</button></div></form>`);
  $('#room-cancel').onclick=()=>openRoom(roomId);
  $('#room-form').onsubmit=event=>{
    event.preventDefault();
    const rate=Number($('#room-rate').value);
    const type=$('#room-type').value.trim();
    if(!type||!Number.isFinite(rate)||rate<500||rate>100000){toast('กรุณาตรวจสอบรายละเอียดและค่าเช่า');return;}
    const status=$('#room-status').value;
    persist(draft=>{const record=draft.rooms.find(item=>item.id===roomId);ensureUnchanged(record,room,'ข้อมูลห้อง');record.rate=rate;record.type=type;if(!draft.tenants.some(item=>item.room===roomId))record.status=status;},()=>{$('#editor-dialog').close();toast(`บันทึกห้อง ${roomId} แล้ว`);});
  };
}
function openTenant(tenantId=null,roomId='') {
  const tenant=tenantId?data.tenants.find(item=>item.id===tenantId):null;
  if(tenantId&&!tenant)return;
  const available=data.rooms.filter(room=>room.status==='normal'&&!tenantFor(room.id));
  if(!tenant&&!available.length){openDialog('ยังไม่มีห้องว่าง',`<div class="dialog-content"><p>ทุกห้องมีผู้เช่าหรืออยู่ระหว่างปรับปรุง ตรวจสอบสถานะห้องก่อนเพิ่มผู้เช่าใหม่</p><div class="dialog-actions"><button class="button primary" id="no-room-close">เข้าใจแล้ว</button></div></div>`);$('#no-room-close').onclick=()=>$('#editor-dialog').close();return;}
  const chosen=tenant?.room||roomId||available[0].id;
  const currentRoom=data.rooms.find(room=>room.id===chosen);
  openDialog(tenant?'ข้อมูลผู้เช่า':'เพิ่มผู้เช่าใหม่',`<form class="dialog-form" id="tenant-form"><div class="form-grid"><div class="field full"><label for="tenant-name">ชื่อ–นามสกุล</label><input id="tenant-name" required maxlength="80" value="${escapeHTML(tenant?.name||'')}" placeholder="เช่น อรทัย ใจดี" autocomplete="off"></div><div class="field full"><label for="tenant-phone">เบอร์โทรศัพท์</label><input id="tenant-phone" type="tel" inputmode="numeric" pattern="0[0-9]{8,9}" title="เบอร์โทรศัพท์ขึ้นต้นด้วย 0 จำนวน 9–10 หลัก" required maxlength="10" value="${escapeHTML(tenant?.phone||'')}" placeholder="08xxxxxxxx" autocomplete="off"></div><div class="field"><label for="tenant-room">ห้องพัก</label><select id="tenant-room" ${tenant?'disabled':''}>${(tenant?[currentRoom]:available).map(room=>`<option value="${room.id}" ${chosen===room.id?'selected':''}>ห้อง ${room.id} · ฿${baht(room.rate)}</option>`).join('')}</select></div><div class="field"><label for="tenant-move-in">วันที่เข้าพัก</label><input id="tenant-move-in" type="date" required min="2020-01-01" max="2099-12-31" value="${tenant?.moveIn||previewDate}" ${tenant?'readonly':''}></div><div class="field full"><label for="tenant-deposit">เงินประกัน (บาท)</label><input id="tenant-deposit" type="number" required min="0" max="200000" step="1" value="${tenant?.deposit??currentRoom.rate*2}"><span class="field-hint">${tenant?'เงินประกันแยกจากค่าเช่ารายเดือน':'ออกค่าเช่าตั้งแต่เดือนที่เข้าพัก ค่าน้ำและค่าไฟเริ่มที่ 0 บาทและแก้ไขภายหลังได้'}</span></div></div><div class="dialog-actions">${tenant?'<button class="button danger" type="button" id="move-out">ย้ายออก</button>':''}<button class="button" type="button" id="tenant-cancel">ยกเลิก</button><button class="button primary" type="submit">${tenant?'บันทึกข้อมูล':'เพิ่มผู้เช่า'}</button></div></form>`);
  $('#tenant-cancel').onclick=()=>$('#editor-dialog').close();
  $('#tenant-room').onchange=()=>{$('#tenant-deposit').value=data.rooms.find(room=>room.id===$('#tenant-room').value).rate*2;};
  if(tenant)$('#move-out').onclick=()=>confirmMoveOut(tenant);
  $('#tenant-form').onsubmit=event=>{
    event.preventDefault();
    const name=$('#tenant-name').value.trim();
    const phone=$('#tenant-phone').value.trim();
    const deposit=Number($('#tenant-deposit').value);
    const moveIn=$('#tenant-move-in').value;
    const room=$('#tenant-room').value;
    if(!name||!/^0\d{8,9}$/.test(phone)||!Number.isFinite(deposit)||deposit<0||deposit>200000||!/^\d{4}-\d{2}-\d{2}$/.test(moveIn)){toast('กรุณาตรวจสอบข้อมูลผู้เช่า');return;}
    persist(draft=>{
      if(tenant){const record=draft.tenants.find(item=>item.id===tenant.id);ensureUnchanged(record,tenant,'ข้อมูลผู้เช่า');record.name=name;record.phone=phone;record.deposit=deposit;draft.invoices.filter(invoice=>invoice.tenantId===tenant.id&&!invoice.paid).forEach(invoice=>invoice.name=name);}
      else {
        if(draft.tenants.some(item=>item.room===room)||draft.rooms.find(item=>item.id===room)?.status!=='normal')throw new Error('ห้องนี้ไม่พร้อมให้เช่า กรุณาเลือกห้องอื่น');
        ensureUnchanged(draft.rooms.find(item=>item.id===room),available.find(item=>item.id===room),'ข้อมูลห้อง');
        const resident={id:crypto.randomUUID(),name,phone,deposit,moveIn,room};
        draft.tenants.push(resident);
        for(const month of Object.keys(monthLabels).filter(month=>month>=moveIn.slice(0,7)))draft.invoices.push({id:`${month}-${resident.id}`,month,tenantId:resident.id,room,name,rent:draft.rooms.find(item=>item.id===room).rate,water:0,electric:0,paid:false,paidAt:null,method:'โอนเงิน',dueAt:month===moveIn.slice(0,7)&&moveIn.slice(8)>'05'?moveIn:`${month}-05`});
      }
    },()=>{$('#editor-dialog').close();toast(tenant?'บันทึกข้อมูลผู้เช่าแล้ว':`เพิ่มผู้เช่าห้อง ${room} แล้ว`);});
  };
}
function confirmMoveOut(tenant) {
  const balance=data.invoices.filter(invoice=>invoice.tenantId===tenant.id&&!invoice.paid).reduce((sum,invoice)=>sum+total(invoice),0);
  openDialog(`ย้ายออกจากห้อง ${tenant.room}`,`<div class="dialog-content"><p>${escapeHTML(tenant.name)}</p><div class="detail-row"><span>ยอดค้างชำระทั้งหมด</span><strong>฿${baht(balance)}</strong></div><div class="detail-row"><span>เงินประกัน</span><strong>฿${baht(tenant.deposit)}</strong></div><div class="confirmation-note">ห้องจะเปลี่ยนเป็นห้องว่าง ประวัติและยอดค่าเช่าจะยังอยู่ในรายการชำระเงิน การคืนเงินประกันให้ดำเนินการแยกต่างหาก</div><div class="dialog-actions"><button class="button" id="move-out-cancel">กลับไป</button><button class="button danger" id="move-out-confirm">ยืนยันย้ายออก</button></div></div>`);
  $('#move-out-cancel').onclick=()=>openTenant(tenant.id);
  $('#move-out-confirm').onclick=()=>persist(draft=>{ensureUnchanged(draft.tenants.find(item=>item.id===tenant.id),tenant,'ข้อมูลผู้เช่า');if(draft.invoices.filter(invoice=>invoice.tenantId===tenant.id&&!invoice.paid).reduce((sum,invoice)=>sum+total(invoice),0)!==balance)throw new Error('ยอดค้างชำระเปลี่ยนแล้ว กรุณาเปิดรายละเอียดล่าสุดก่อนย้ายออก');draft.tenants=draft.tenants.filter(item=>item.id!==tenant.id);},()=>{$('#editor-dialog').close();toast(`ห้อง ${tenant.room} พร้อมรับผู้เช่าใหม่แล้ว`);});
}
function openInvoice(invoiceId) {
  const invoice=data.invoices.find(item=>item.id===invoiceId);
  if(!invoice)return;
  openDialog(`ค่าเช่าห้อง ${invoice.room}`,`<form class="dialog-form" id="payment-form"><p>${escapeHTML(invoice.name)} · ${monthLabels[invoice.month]}</p><div class="confirm-amount">฿${baht(total(invoice))}</div><div class="detail-row"><span>ค่าเช่า</span><strong>฿${baht(invoice.rent)}</strong></div><div class="detail-row"><span>ค่าน้ำ</span><strong>฿${baht(invoice.water)}</strong></div><div class="detail-row"><span>ค่าไฟ</span><strong>฿${baht(invoice.electric)}</strong></div><div class="detail-row"><span>ครบกำหนด</span><strong>${dateLabel(dueDate(invoice))}</strong></div>${invoice.paid?`<div class="detail-row"><span>วันที่ชำระ</span><strong>${dateLabel(invoice.paidAt)}</strong></div><div class="detail-row"><span>ช่องทาง</span><strong>${escapeHTML(invoice.method)}</strong></div><span class="badge">ชำระแล้ว</span>`:`<div class="form-grid" style="margin-top:20px"><div class="field"><label for="payment-method">ช่องทางรับชำระ</label><select id="payment-method"><option>โอนเงิน</option><option>เงินสด</option></select></div><div class="field"><label for="payment-date">วันที่รับชำระ</label><input id="payment-date" type="date" required min="${invoice.month}-01" max="${previewDate}" value="${previewDate}"></div></div>`}<div class="dialog-actions">${invoice.paid?'<button class="button danger" type="button" id="reverse-payment">ยกเลิกรายการรับชำระ</button><button class="button" type="button" id="payment-close">ปิด</button>':'<button class="button" type="button" id="edit-invoice">แก้ไขยอด</button><button class="button primary" type="submit">ยืนยันรับชำระ</button>'}</div></form>`);
  if(invoice.paid){$('#payment-close').onclick=()=>$('#editor-dialog').close();$('#reverse-payment').onclick=()=>confirmReversePayment(invoice);$('#payment-form').onsubmit=event=>event.preventDefault();}
  else {
    $('#edit-invoice').onclick=()=>editInvoice(invoice);
    $('#payment-form').onsubmit=event=>{event.preventDefault();const date=$('#payment-date').value;const method=$('#payment-method').value;if(!date||date<`${invoice.month}-01`||date>previewDate||!['โอนเงิน','เงินสด'].includes(method)){toast('กรุณาตรวจสอบวันที่และช่องทางชำระ');return;}persist(draft=>{const record=draft.invoices.find(item=>item.id===invoice.id);ensureUnchanged(record,invoice,'รายการค่าเช่า');if(record.paid)throw new Error('รายการนี้ได้รับชำระแล้ว กรุณาเปิดรายละเอียดใหม่');record.paid=true;record.paidAt=date;record.method=method;},()=>{$('#editor-dialog').close();toast(`บันทึกรับชำระห้อง ${invoice.room} · ฿${baht(total(invoice))} แล้ว`);});};
  }
}
function confirmReversePayment(invoice) {
  openDialog('ยกเลิกรายการรับชำระ',`<div class="dialog-content"><p>ห้อง ${invoice.room} · ${monthLabels[invoice.month]}</p><div class="confirm-amount">฿${baht(total(invoice))}</div><div class="confirmation-note">รายการนี้จะกลับเป็นสถานะรอชำระ และยอดรับชำระในภาพรวมจะถูกปรับตาม</div><div class="dialog-actions"><button class="button" id="reverse-cancel">กลับไป</button><button class="button danger" id="reverse-confirm">ยืนยันยกเลิกรับชำระ</button></div></div>`);
  $('#reverse-cancel').onclick=()=>openInvoice(invoice.id);
  $('#reverse-confirm').onclick=()=>persist(draft=>{const record=draft.invoices.find(item=>item.id===invoice.id);ensureUnchanged(record,invoice,'รายการค่าเช่า');record.paid=false;record.paidAt=null;},()=>{$('#editor-dialog').close();toast('ยกเลิกรายการรับชำระแล้ว');});
}
function editInvoice(invoice) {
  openDialog(`แก้ไขค่าเช่าห้อง ${invoice.room}`,`<form class="dialog-form" id="invoice-form"><p>${escapeHTML(invoice.name)} · ${monthLabels[invoice.month]}</p><div class="form-grid" style="margin-top:18px">${[['rent','ค่าเช่า'],['water','ค่าน้ำ'],['electric','ค่าไฟ']].map(([key,label])=>`<div class="field ${key==='rent'?'full':''}"><label for="invoice-${key}">${label} (บาท)</label><input id="invoice-${key}" type="number" required min="0" max="100000" step="1" value="${invoice[key]}"></div>`).join('')}</div><div class="dialog-actions"><button type="button" class="button" id="invoice-cancel">กลับไป</button><button class="button primary" type="submit">บันทึกยอดค่าเช่า</button></div></form>`);
  $('#invoice-cancel').onclick=()=>openInvoice(invoice.id);
  $('#invoice-form').onsubmit=event=>{event.preventDefault();const amounts=Object.fromEntries(['rent','water','electric'].map(key=>[key,Number($(`#invoice-${key}`).value)]));if(Object.values(amounts).some(value=>!Number.isFinite(value)||value<0||value>100000)){toast('กรุณาระบุยอดตั้งแต่ 0 ถึง 100,000 บาท');return;}persist(draft=>{const record=draft.invoices.find(item=>item.id===invoice.id);ensureUnchanged(record,invoice,'รายการค่าเช่า');if(record.paid)throw new Error('รายการนี้ชำระแล้ว กรุณาตรวจสอบรายละเอียดใหม่');Object.assign(record,amounts);},()=>{openInvoice(invoice.id);toast('บันทึกยอดค่าเช่าแล้ว');});};
}
function exportInvoices() {
  const rows=[['เดือน','ห้อง','ผู้เช่า','ค่าเช่า','ค่าน้ำ','ค่าไฟ','รวม','สถานะ','วันที่ชำระ','ช่องทาง'],...monthlyInvoices().map(invoice=>[invoice.month,invoice.room,invoice.name,invoice.rent,invoice.water,invoice.electric,total(invoice),invoice.paid?'ชำระแล้ว':isOverdue(invoice)?'ค้างชำระ':'รอชำระ',invoice.paidAt||'',invoice.paid?invoice.method:''])];
  const csv='\uFEFF'+rows.map(row=>row.map(value=>{let cell=String(value);if(/^[=+@\-\t\r]/.test(cell))cell="'"+cell;return '"'+cell.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  const link=document.createElement('a');link.href=url;link.download=`baanprom-rent-${selectedMonth}.csv`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('ส่งออกค่าเช่าของเดือนที่เลือกแล้ว');
}
$('#add-tenant').addEventListener('click',()=>openTenant());
loadData();
closeMenu();
if(document.modelContext?.registerTool){
  const lifecycle=new AbortController();
  const tools=[
    {name:'read_dorm_summary',title:'อ่านภาพรวมหอพัก',description:'Read the selected month, room occupancy and rent totals in this local dorm preview.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:input=>{if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('Expected an empty object');return {month:selectedMonth,rooms:data.rooms.length,occupied:data.tenants.length,vacant:data.rooms.filter(room=>roomStatus(room)==='vacant').length,paid:monthlyInvoices().filter(invoice=>invoice.paid).reduce((sum,invoice)=>sum+total(invoice),0),unpaid:unpaidInvoices().reduce((sum,invoice)=>sum+total(invoice),0)};}},
    {name:'navigate_dorm_view',title:'เปิดหน้าจัดการหอพัก',description:'Open the overview, rooms, tenants or payments view. This only changes the visible page.',inputSchema:{type:'object',properties:{view:{type:'string',enum:['overview','rooms','tenants','payments']}},required:['view'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(!input||Object.keys(input).some(key=>key!=='view')||!Object.hasOwn(views,input.view))throw new Error('Invalid view');navigate(input.view);return {view};}},
    {name:'start_tenant_creation',title:'เปิดแบบฟอร์มเพิ่มผู้เช่า',description:'Open the tenant form for a vacant room. Does not create a tenant; the user completes the visible form.',inputSchema:{type:'object',properties:{room:{type:'string',pattern:'^[123]0[1-8]$'}},required:['room'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(!input||Object.keys(input).some(key=>key!=='room')||!data.rooms.some(room=>room.id===input.room&&roomStatus(room)==='vacant'))throw new Error('Room is not vacant');openTenant(null,input.room);return {room:input.room,form:'tenant',created:false};}},
    {name:'start_payment_confirmation',title:'เปิดรายละเอียดรับชำระ',description:'Open an unpaid invoice for the selected month. Does not mark it paid or collect money; the user confirms in the visible form.',inputSchema:{type:'object',properties:{room:{type:'string',pattern:'^[123]0[1-8]$'}},required:['room'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(!input||Object.keys(input).some(key=>key!=='room'))throw new Error('Invalid input');const invoice=unpaidInvoices().find(item=>item.room===input.room);if(!invoice)throw new Error('No unpaid invoice for this room');openInvoice(invoice.id);return {invoiceId:invoice.id,room:invoice.room,amount:total(invoice),paid:false};}}
  ];
  for(const tool of tools){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
