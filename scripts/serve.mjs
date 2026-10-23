import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const files=new Map([['/','index.html'],['/index.html','index.html'],['/style.css','style.css'],['/favicon.svg','favicon.svg'],...['core','files','example','app'].map(n=>['/src/'+n+'.mjs','src/'+n+'.mjs'])]);
const types={html:'text/html; charset=utf-8',css:'text/css',svg:'image/svg+xml',mjs:'text/javascript'};
createServer(async(req,res)=>{
  const file=files.get(new URL(req.url,'http://localhost').pathname);if(!file){res.writeHead(404);res.end('Not found');return;}
  try{const bytes=await readFile(new URL(file,root));res.writeHead(200,{'Content-Type':types[file.split('.').pop()],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(bytes);}
  catch{res.writeHead(500);res.end('Preview unavailable');}
}).listen(4183,'127.0.0.1',()=>console.log('Scorefold preview: http://127.0.0.1:4183'));
