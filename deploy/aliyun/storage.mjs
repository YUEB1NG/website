import {mkdir,readFile,rename,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {randomUUID} from 'node:crypto';

// The Worker only uses these two R2 operations. Store complete objects locally.
export class FileBucket {
 constructor(root){this.root=root;}
 path(key){if(!/^(playlist\/current\.json|covers\/[a-f0-9]{64})$/.test(key))throw new Error('Invalid storage key');return join(this.root,...key.split('/'));}
 async get(key){
  const path=this.path(key);let bytes;
  try{bytes=await readFile(path);}catch(e){if(e.code==='ENOENT')return null;throw e;}
  let contentType;try{contentType=(await readFile(path+'.type','utf8')).trim();}catch(e){if(e.code!=='ENOENT')throw e;}
  return {body:new Uint8Array(bytes),httpMetadata:{contentType},json:async()=>JSON.parse(bytes.toString('utf8'))};
 }
 async put(key,value,options={}){
  const path=this.path(key);await mkdir(dirname(path),{recursive:true});
  const temp=path+'.'+randomUUID()+'.tmp';
  const bytes=typeof value==='string'?value:Buffer.from(value);
  await writeFile(temp,bytes,{mode:0o600});await rename(temp,path);
  if(options.httpMetadata?.contentType)await writeFile(path+'.type',options.httpMetadata.contentType,{mode:0o600});
 }
}
