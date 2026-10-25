import {compoundLayouts} from './compound-layouts.mjs';
import {compoundVariants,newWorldLayouts} from './compound-phase4-layouts.mjs';
import {refineCompoundLayout} from './compound-layout-rules.mjs';
import {prisonCampLayout} from './prison-camp-layout.mjs';
// Road checkpoints remain design-only. base-coast is a solved route, never a stamped 400 m pad.
export const runtimeLayouts=[...compoundLayouts,...compoundVariants,...newWorldLayouts.filter(l=>l.id!=='road-checkpoint'&&l.type!=='road-checkpoint'),prisonCampLayout].map(source=>{
 const l=refineCompoundLayout(source);l.layoutId=l.id;l.type=l.type||l.id;l.variant=l.variant||1;l.id=l.type;l.status='integrated';
 l.civilian=l.family==='civil';return l;
});
const layoutsByType=new Map();
for(const layout of runtimeLayouts){if(!layoutsByType.has(layout.type))layoutsByType.set(layout.type,[]);layoutsByType.get(layout.type).push(layout)}
export const chooseCompoundLayout=(type,random)=>{const pool=layoutsByType.get(type)||[];if(!pool.length)throw Error('Unknown compound '+type);return pool[Math.floor(random()*pool.length)]};
