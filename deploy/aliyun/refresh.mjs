import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {FileBucket} from './storage.mjs';
import {refresh} from '../../worker/playlist.mjs';
const root=resolve(process.env.YUEB1NG_DATA_DIR||fileURLToPath(new URL('../../.tools/aliyun-data/',import.meta.url)));
try{const result=await refresh(new FileBucket(root));console.log(JSON.stringify({ok:true,total:result.total,updatedAt:result.updatedAt}));}
catch(error){console.error('Refresh failed; last successful playlist preserved:',error.message);process.exitCode=1;}
