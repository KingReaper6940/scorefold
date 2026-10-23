import {validate,analyze} from './core.mjs';
export function readProject(source) {
  if(typeof source!=='string'||source.length>50000)throw new Error('Scorecards must be JSON text under 50,000 characters.');
  let input;try{input=JSON.parse(source.replace(/^\uFEFF/,''));}catch{throw new Error('Invalid JSON. Open a Scorefold scorecard saved with Save project.');}
  return validate(input);
}
export function writeProject(input){return JSON.stringify(validate(input),null,2)+'\n';}
function csv(value) {
  let text=String(value);
  if(/^[\s]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
}
export function scoreCsv(input) {
  const project=validate(input),rows=[['Option','Criterion','Weight','Rating (0-5 or unknown)','Note']];
  for(const option of project.options)for(const c of project.criteria){
    const r=option.ratings.find(r=>r.criterionId===c.id);
    rows.push([option.name,c.name,c.weight,r.score===null?'unknown':r.score,r.note]);
  }
  return rows.map(row=>row.map(csv).join(',')).join('\r\n')+'\r\n';
}
const md=value=>String(value).replace(/([\\`*_{}\[\]()#+.!|<>-])/g,'\\$1').replace(/\r?\n/g,' ');
export function brief(input) {
  const project=validate(input),result=analyze(project);
  const leader=result.options.find(o=>o.id===result.clearLeaderId);
  const lines=['# '+md(project.title),'','Ranges describe unknown ratings, not probabilities. Higher ratings must always mean more preferred.','',
    leader?'Clear lead within this scorecard: '+md(leader.name)+'.':'No unique clear lead across the current bounds.','',
    '| Option | Lower | Upper | Weighted coverage | Could lead? |','| --- | ---: | ---: | ---: | --- |'];
  for(const o of result.options)lines.push('| '+md(o.name)+' | '+o.lower.toFixed(2)+' | '+o.upper.toFixed(2)+' | '+o.coverage.toFixed(1)+'% | '+(o.canLead?'Yes':'No')+' |');
  lines.push('','## Questions to resolve','');
  for(const q of result.questions)lines.push('- '+md(q.option)+' / '+md(q.criterion)+': up to '+q.swing.toFixed(2)+' points of score range.'+(q.note?' Note: '+md(q.note):''));
  if(!result.questions.length)lines.push('No positive-weight unknown ratings remain.');
  lines.push('','## Inputs and notes','');
  for(const c of project.criteria)lines.push('- '+md(c.name)+': weight '+c.weight);
  for(const option of project.options){
    lines.push('','### '+md(option.name),'');
    for(const r of option.ratings){
      const c=project.criteria.find(c=>c.id===r.criterionId);
      lines.push('- '+md(c.name)+': '+(r.score===null?'unknown':r.score+'/5')+(r.note?' — '+md(r.note):''));
    }
  }
  return lines.join('\n')+'\n';
}
