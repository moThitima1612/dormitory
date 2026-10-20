import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { seedData } from './seed.mjs';

export class DataError extends Error {
  constructor(message,status=400){super(message);this.status=status;}
}
const fail=message=>{throw new DataError(message);};
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const text=(value,max=120)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const amount=(value,min=0,max=100000)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(`${value}T12:00:00Z`).toISOString().slice(0,10)===value;

export function validateState(state){
  if(!object(state)||state.version!==1)fail('รูปแบบข้อมูลไม่ถูกต้อง');
  for(const key of ['rooms','tenants','invoices'])if(!Array.isArray(state[key])||state[key].length>5000)fail('จำนวนรายการหรือรูปแบบข้อมูลไม่ถูกต้อง');
  if(state.rooms.length!==24)fail('ข้อมูลห้องพักต้องครบทั้ง 24 ห้อง');
  const rooms=new Map();
  for(const room of state.rooms){
    if(!object(room)||!/^([123])0[1-8]$/.test(room.id)||room.floor!==Number(room.id[0])||!amount(room.rate,500)||!text(room.type,80)||!['normal','repair'].includes(room.status)||rooms.has(room.id))fail('ข้อมูลห้องพักไม่ถูกต้อง');
    rooms.set(room.id,room);
  }
  const tenants=new Map();const occupied=new Set();
  for(const tenant of state.tenants){
    if(!object(tenant)||!text(tenant.id)||!text(tenant.name,80)||typeof tenant.phone!=='string'||!/^0\d{8,9}$/.test(tenant.phone)||!validDate(tenant.moveIn)||!amount(tenant.deposit,0,200000)||!rooms.has(tenant.room)||rooms.get(tenant.room).status!=='normal'||tenants.has(tenant.id)||occupied.has(tenant.room))fail('ข้อมูลผู้เช่าไม่ถูกต้อง หรือห้องนี้มีผู้เช่าแล้ว');
    occupied.add(tenant.room);tenants.set(tenant.id,tenant);
  }
  const invoices=new Set();const periods=new Set();
  for(const invoice of state.invoices){
    if(!object(invoice)||!text(invoice.id,160)||!text(invoice.tenantId)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(invoice.month)||!rooms.has(invoice.room)||!text(invoice.name,80)||!['rent','water','electric'].every(key=>amount(invoice[key]))||typeof invoice.paid!=='boolean'||!['เงินสด','โอนเงิน'].includes(invoice.method)||!validDate(invoice.dueAt||`${invoice.month}-05`)||invoices.has(invoice.id)||periods.has(`${invoice.tenantId}:${invoice.month}`))fail('ข้อมูลค่าเช่าไม่ถูกต้อง');
    if(invoice.paid?(!validDate(invoice.paidAt)||invoice.paidAt<`${invoice.month}-01`):invoice.paidAt!==null)fail('วันที่รับชำระไม่ถูกต้อง');
    if(tenants.has(invoice.tenantId)&&tenants.get(invoice.tenantId).room!==invoice.room)fail('ห้องพักในรายการค่าเช่าไม่ตรงกับผู้เช่า');
    invoices.add(invoice.id);periods.add(`${invoice.tenantId}:${invoice.month}`);
  }
  return state;
}

export function openDatabase(filename){
  mkdirSync(path.dirname(filename),{recursive:true});
  const db=new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;');
  const version=db.prepare('PRAGMA user_version').get().user_version;
  if(version>1){db.close();throw new Error('Unsupported database schema version');}
  db.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
  const upsertRoom=db.prepare(`INSERT INTO rooms(id,floor,rate,type,status) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET floor=excluded.floor,rate=excluded.rate,type=excluded.type,status=excluded.status`);
  const upsertTenant=db.prepare(`INSERT INTO tenants(id,name,phone,room_id,move_in,deposit,active,moved_out_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,phone=excluded.phone,room_id=excluded.room_id,move_in=excluded.move_in,deposit=excluded.deposit,active=excluded.active,moved_out_at=excluded.moved_out_at`);
  const addArchivedTenant=db.prepare('INSERT OR IGNORE INTO tenants(id,name,phone,room_id,move_in,deposit,active,moved_out_at) VALUES(?,?,NULL,?,?,0,0,?)');
  const upsertInvoice=db.prepare(`INSERT INTO invoices(id,month,tenant_id,room_id,name,rent,water,electric,paid,paid_at,method,due_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,rent=excluded.rent,water=excluded.water,electric=excluded.electric,paid=excluded.paid,paid_at=excluded.paid_at,method=excluded.method,due_at=excluded.due_at`);
  function writeRows(state){
    const now=new Date().toISOString();
    for(const room of state.rooms)upsertRoom.run(room.id,room.floor,room.rate,room.type,room.status);
    db.prepare('UPDATE tenants SET active=0,moved_out_at=COALESCE(moved_out_at,?) WHERE active=1').run(now);
    for(const tenant of state.tenants)upsertTenant.run(tenant.id,tenant.name,tenant.phone,tenant.room,tenant.moveIn,tenant.deposit,1,null);
    for(const invoice of state.invoices){
      addArchivedTenant.run(invoice.tenantId,invoice.name,invoice.room,`${invoice.month}-01`,now);
      upsertInvoice.run(invoice.id,invoice.month,invoice.tenantId,invoice.room,invoice.name,invoice.rent,invoice.water,invoice.electric,Number(invoice.paid),invoice.paidAt,invoice.method,invoice.dueAt||`${invoice.month}-05`);
    }
  }
  if(!db.prepare('SELECT id FROM app_meta WHERE id=1').get()){
    db.exec('BEGIN IMMEDIATE');
    try{
      writeRows(validateState(seedData()));
      db.prepare('INSERT INTO app_meta(id,revision,database_id,source,updated_at) VALUES(1,0,?,?,?)').run(randomUUID(),'seed',new Date().toISOString());
      db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');db.close();throw error;}
  }
  db.exec('PRAGMA optimize');
  function readState(){
    const meta=db.prepare('SELECT revision,database_id AS databaseId,source,updated_at AS updatedAt FROM app_meta WHERE id=1').get();
    return {version:1,
      rooms:db.prepare('SELECT id,floor,rate,type,status FROM rooms ORDER BY id').all(),
      tenants:db.prepare('SELECT id,name,phone,room_id AS room,move_in AS moveIn,deposit FROM tenants WHERE active=1 ORDER BY room_id').all(),
      invoices:db.prepare('SELECT id,month,tenant_id AS tenantId,room_id AS room,name,rent,water,electric,paid,paid_at AS paidAt,method,due_at AS dueAt FROM invoices ORDER BY month DESC,room_id').all().map(invoice=>({...invoice,paid:!!invoice.paid})),
      meta:{...meta,importAllowed:meta.revision===0&&meta.source==='seed'}};
  }
  function saveState(input,{importing=false}={}){
    if(!object(input)||!Number.isSafeInteger(input.revision)||input.revision<0||!text(input.mutationId)||!/^[a-zA-Z0-9-]+$/.test(input.mutationId))fail('คำขอบันทึกข้อมูลไม่ถูกต้อง');
    const state=validateState(input.data);
    const hash=createHash('sha256').update(JSON.stringify({revision:input.revision,data:state,importing})).digest('hex');
    db.exec('BEGIN IMMEDIATE');
    try{
      const existing=db.prepare('SELECT payload_hash FROM mutations WHERE id=?').get(input.mutationId);
      if(existing){if(existing.payload_hash!==hash)fail('รหัสคำขอซ้ำกับข้อมูลอื่น');db.exec('COMMIT');return readState();}
      const meta=db.prepare('SELECT revision,source FROM app_meta WHERE id=1').get();
      if(meta.revision!==input.revision||importing&&(meta.revision!==0||meta.source!=='seed'))throw new DataError('ข้อมูลถูกแก้ไขจากหน้าอื่นแล้ว กรุณาตรวจสอบข้อมูลล่าสุดและลองบันทึกอีกครั้ง',409);
      for(const invoice of state.invoices){
        const existingInvoice=db.prepare('SELECT tenant_id,room_id,month FROM invoices WHERE id=?').get(invoice.id);
        if(existingInvoice&&(existingInvoice.tenant_id!==invoice.tenantId||existingInvoice.room_id!==invoice.room||existingInvoice.month!==invoice.month))fail('ไม่สามารถเปลี่ยนผู้เช่าหรือเดือนของรายการค่าเช่าเดิมได้');
      }
      writeRows(state);
      const revision=meta.revision+1;
      db.prepare('UPDATE app_meta SET revision=?,source=?,updated_at=? WHERE id=1').run(revision,importing?'imported':meta.source,new Date().toISOString());
      db.prepare('INSERT INTO mutations(id,payload_hash,revision) VALUES(?,?,?)').run(input.mutationId,hash,revision);
      db.exec('COMMIT');return readState();
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  return {readState,saveState,close:()=>db.close(),db};
}
