import {readFile} from 'node:fs/promises';
export async function applyMigrations(DB){
 for(const file of ['0001_auth.sql','0002_game.sql','0003_approval_recovery.sql','0004_maintenance_recovery.sql']){
  const triggers=[],sql=(await readFile(new URL('../../server/migrations/'+file,import.meta.url),'utf8')).replace(/^--.*$/gm,'').replace(/CREATE TRIGGER[\s\S]*?END;/gi,match=>{triggers.push(match);return 'TRIGGER_'+(triggers.length-1)+';';});
  for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean)){const match=statement.match(/^TRIGGER_(\d+)$/);await DB.prepare(match?triggers[+match[1]]:statement).run();}
 }
}
