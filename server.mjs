import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { openDatabase, DataError } from './db/database.mjs';

const projectRoot=path.dirname(fileURLToPath(import.meta.url));
const publicRoot=path.join(projectRoot,'dist');
const port=Number(process.env.DORM_PORT||4173);
const databasePath=process.env.DORM_DB_PATH||path.join(projectRoot,'data','dorm.sqlite');
const database=openDatabase(databasePath);
const origins=new Set([`http://127.0.0.1:${port}`,`http://localhost:${port}`]);
const hosts=new Set([`127.0.0.1:${port}`,`localhost:${port}`]);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
function json(response,status,body){response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(JSON.stringify(body));}
async function readJSON(request){
  if(!/^application\/json(?:;|$)/i.test(request.headers['content-type']||''))throw new DataError('คำขอต้องเป็น JSON',415);
  let size=0;const chunks=[];
  for await(const chunk of request){size+=chunk.length;if(size>1024*1024)throw new DataError('ข้อมูลมีขนาดใหญ่เกินไป',413);chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new DataError('ข้อมูล JSON ไม่ถูกต้อง');}
}
const server=http.createServer(async(request,response)=>{
  try{
    if(!hosts.has(request.headers.host))throw new DataError('Host ไม่ได้รับอนุญาต',403);
    if(request.headers.origin&&!origins.has(request.headers.origin))throw new DataError('Origin ไม่ได้รับอนุญาต',403);
    const url=new URL(request.url,`http://127.0.0.1:${port}`);
    if(url.pathname.startsWith('/api/')){
      if(url.pathname==='/api/state'&&request.method==='GET'){json(response,200,database.readState());return;}
      if(url.pathname==='/api/health'&&request.method==='GET'){json(response,200,{ok:true,storage:'sqlite'});return;}
      if((url.pathname==='/api/state'&&request.method==='PUT')||(url.pathname==='/api/import'&&request.method==='POST')){
        const input=await readJSON(request);json(response,200,database.saveState(input,{importing:url.pathname==='/api/import'}));return;
      }
      throw new DataError('ไม่พบ API หรือวิธีเรียกไม่ถูกต้อง',404);
    }
    if(!['GET','HEAD'].includes(request.method))throw new DataError('วิธีเรียกไม่ถูกต้อง',405);
    const pathname=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
    const target=path.resolve(publicRoot,`.${pathname}`);
    if(!target.startsWith(publicRoot+path.sep))throw new DataError('ไม่อนุญาตให้อ่านไฟล์นี้',403);
    const body=await readFile(target);
    response.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});response.end(request.method==='HEAD'?undefined:body);
  }catch(error){
    const status=error instanceof DataError?error.status:error.code==='ENOENT'?404:500;
    if(status===500)console.error('Dorm database/server error:',error);
    json(response,status,{error:status===500?'ไม่สามารถโหลดหรือบันทึกข้อมูลได้ กรุณาลองอีกครั้ง':error instanceof DataError?error.message:'ไม่พบหน้านี้'});
  }
});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}\nStorage: SQLite database ready`));
function shutdown(){server.close(()=>{database.close();process.exit(0);});server.closeIdleConnections();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
server.on('error',error=>{console.error(error);database.close();process.exit(1);});
