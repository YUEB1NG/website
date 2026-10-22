import {defineConfig} from 'vite';
import {cloudflare} from '@cloudflare/vite-plugin';
import {sites} from './scripts/vite/sites-vite-plugin';
export default defineConfig({
 server:{watch:{ignored:['**/.tools/**','**/artifacts/**','**/reference/**']}},
 plugins:[sites({mockAuth:false}),cloudflare({viteEnvironment:{name:'server'},inspectorPort:false,remoteBindings:false,config:{
  name:'yueb1ng-wabi',main:'worker/index.ts',compatibility_date:'2026-05-15',compatibility_flags:['nodejs_compat'],
  assets:{binding:'ASSETS',run_worker_first:['/api/*']},r2_buckets:[{binding:'BUCKET',bucket_name:'yueb1ng-playlist'}]
 }})]
});
