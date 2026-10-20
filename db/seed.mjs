export function seedData() {
  const rooms = Array.from({length:24}, (_, i) => {
    const floor = Math.floor(i / 8) + 1;
    const id = String(floor * 100 + i % 8 + 1);
    return {id, floor, rate:floor === 3 ? 4200 : 3800, type:floor === 3 ? 'ห้องแอร์ · 28 ตร.ม.' : 'ห้องแอร์ · 24 ตร.ม.', status:['105','305'].includes(id) ? 'repair' : 'normal'};
  });
  const names = ['ณัฐธิดา ใจดี','พีรพัฒน์ วงศ์สกุล','กมลชนก แสงทอง','ธนกร รุ่งเรือง','ปวีณา สุขใจ','ศุภชัย บุญมา','รินรดา วัฒนกุล','อธิวัฒน์ มีสุข','ชลธิชา พรหมดี','กิตติพงษ์ ทองแท้','วรัญญา จันทร์เพ็ญ','ธีรภัทร สมบูรณ์','พิชญา ศรีสวัสดิ์','นภัสสร แก้วกาญจน์','อัครพล พิพัฒน์','ธัญชนก อรุณรุ่ง','ภัทรพล คงมั่น','สุภาวดี เมฆงาม'];
  const occupied = rooms.filter(room => room.status !== 'repair' && !['108','208','307','308'].includes(room.id));
  const tenants = occupied.map((room,i) => ({id:`t${i+1}`, name:names[i], phone:`089${String(1234500 + i)}`, room:room.id, moveIn:`2026-0${(i % 7)+1}-01`, deposit:room.rate * 2}));
  const invoices = [];
  for (const month of ['2026-10','2026-09','2026-08']) tenants.forEach((tenant,i) => {
    const room=rooms.find(room=>room.id===tenant.room);
    const isLate=month==='2026-10'&&['103','202','303'].includes(room.id);
    invoices.push({id:`${month}-${tenant.id}`,month,tenantId:tenant.id,room:room.id,name:tenant.name,rent:room.rate,water:120+(i%4)*30,electric:270+(i%5)*90,paid:!isLate,paidAt:isLate?null:`${month}-${String(1+i%5).padStart(2,'0')}`,method:i%4===0?'เงินสด':'โอนเงิน',dueAt:`${month}-05`});
  });
  return {version:1,rooms,tenants,invoices};
}
