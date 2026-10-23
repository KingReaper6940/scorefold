import {analyze,simulateUnknown,MAX_OPTIONS,MAX_CRITERIA} from './core.mjs';
import {readProject,writeProject,scoreCsv,brief} from './files.mjs';
import {example} from './example.mjs';
const $=id=>document.getElementById(id);
const el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
const pct=n=>n.toFixed(1);
let project=example(),report=null,revision=0;
function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
function input(value,field,label,max){
  const node=el('input');node.value=value;node.dataset.field=field;node.setAttribute('aria-label',label);
  if(max)node.maxLength=max;return node;
}
function matrix(){
  $('matrix-head').replaceChildren();$('matrix-body').replaceChildren();$('matrix').dataset.options=project.options.length;
  const header=el('tr');header.append(el('th','','Criterion'),el('th','','Weight'));
  project.options.forEach((option,i)=>{
    const th=el('th');th.scope='col';th.dataset.option=option.id;
    const name=input(option.name,'option-name','Option '+(i+1)+' name',40);
    const remove=el('button','','Remove option');remove.dataset.action='remove-option';remove.disabled=project.options.length<=2;remove.setAttribute('aria-label','Remove option '+(i+1));
    th.append(name,remove);header.append(th);
  });$('matrix-head').append(header);
  project.criteria.forEach((criterion,i)=>{
    const tr=el('tr');tr.dataset.criterion=criterion.id;
    const nameCell=el('td');nameCell.append(input(criterion.name,'criterion-name','Criterion '+(i+1)+' name',40));
    const remove=el('button','remove','Remove criterion');remove.dataset.action='remove-criterion';remove.disabled=project.criteria.length<=1;remove.setAttribute('aria-label','Remove criterion '+(i+1));nameCell.append(remove);
    const weightCell=el('td');const weight=input(criterion.weight,'weight','Weight for '+criterion.name);weight.type='number';weight.min='0';weight.max='100';weight.step='1';weightCell.append(weight);tr.append(nameCell,weightCell);
    for(const option of project.options){
      const r=option.ratings.find(r=>r.criterionId===criterion.id);
      const td=el('td');td.dataset.option=option.id;
      const select=el('select');select.dataset.field='score';select.setAttribute('aria-label','Rating for '+option.name+' / '+criterion.name);
      for(const value of ['?',0,1,2,3,4,5]){const opt=el('option','',value==='?'?'? · Unknown':value+' / 5');opt.value=String(value);select.append(opt);}
      select.value=r.score===null?'?':String(r.score);
      const details=el('details');details.append(el('summary','','Note / rationale'));
      const note=el('textarea');note.dataset.field='note';note.value=r.note;note.maxLength=200;note.setAttribute('aria-label','Note for '+option.name+' / '+criterion.name);details.append(note);td.append(select,details);tr.append(td);
    }$('matrix-body').append(tr);
  });
  $('add-option').disabled=project.options.length>=MAX_OPTIONS;
  $('add-criterion').disabled=project.criteria.length>=MAX_CRITERIA;
}
function rangeBar(option){
  const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 300 22');svg.setAttribute('aria-hidden','true');
  const rect=(x,width,fill)=>{const r=document.createElementNS(ns,'rect');r.setAttribute('x',x);r.setAttribute('y','6');r.setAttribute('width',Math.max(0,width));r.setAttribute('height','10');r.setAttribute('rx','3');r.setAttribute('fill',fill);svg.append(r);};
  rect(0,300,'#edf0eb');rect(0,option.lower*3,'#557c71');rect(option.lower*3,(option.upper-option.lower)*3,'#e4c8ad');
  return svg;
}
function fillResults(result,verdictTarget,rangesTarget){
  const leader=result.options.find(o=>o.id===result.clearLeaderId);
  const status=leader?'Clear lead':result.complete?'Exact tie':'Still open';
  const heading=leader?leader.name+' leads within these bounds':result.complete?'The top scores are tied':'More than one option could lead';
  const verdict=el('div','verdict');verdict.append(el('span','status',status),el('h3','',heading),el('p','',leader?'Its lower bound is above every other upper bound. This conclusion depends on the entered ratings and weights.':'Resolve unknown ratings or revisit the weights. The app does not fill gaps with guessed scores.'));
  verdictTarget.replaceChildren(verdict);rangesTarget.replaceChildren();
  for(const option of result.options){
    const card=el('div','range-card');const head=el('div','range-head');head.append(el('h3','',option.name),el('strong','',(Math.abs(option.upper-option.lower)<1e-9?pct(option.lower):pct(option.lower)+'–'+pct(option.upper))+' / 100'));card.append(head,rangeBar(option));
    const meta=el('div','range-meta');meta.append(el('span','',pct(option.coverage)+'% weighted coverage'),el('span',option.canLead?'could':'',option.canLead?'Could lead':'Below another lower bound'));card.append(meta);rangesTarget.append(card);
  }
}
function preview(){ $('preview').value=report?($('export-format').value==='csv'?scoreCsv(project):$('export-format').value==='json'?writeProject(project):brief(project)):''; }
function refreshNames(){
  for(const tr of $('matrix-body').children){
    const c=project.criteria.find(c=>c.id===tr.dataset.criterion);
    tr.querySelector('[data-field="weight"]').setAttribute('aria-label','Weight for '+c.name);
    for(const td of tr.querySelectorAll('[data-option]')){
      const option=project.options.find(o=>o.id===td.dataset.option);
      td.querySelector('select').setAttribute('aria-label','Rating for '+option.name+' / '+c.name);
      td.querySelector('textarea').setAttribute('aria-label','Note for '+option.name+' / '+c.name);
    }
  }
}
function render(){
  try{
    report=analyze(project);refreshNames();fillResults(report,$('verdict'),$('ranges'));
    $('questions').replaceChildren();
    for(const q of report.questions){const li=el('li');li.append(el('h3','',q.option+' / '+q.criterion),el('p','swing','Up to '+pct(q.swing)+' points of range'));if(q.note)li.append(el('p','',q.note));$('questions').append(li);}
    if(!report.questions.length)$('questions').append(el('li','','No positive-weight unknown ratings remain.'));
    $('save').disabled=false;$('download').disabled=false;preview();syncScenario();return true;
  }catch(error){
    report=null;$('verdict').replaceChildren(el('p','result-foot','Results unavailable until the inputs are valid.'));$('ranges').replaceChildren();$('questions').replaceChildren();$('preview').value='';$('save').disabled=true;$('download').disabled=true;message(error.message,true);syncScenario();return false;
  }
}
function changed(){revision++;if(render())message('Scorecard updated. Save a project to keep your changes.');}
function load(next,status){revision++;project=next;$('title').value=project.title;if($('scenario-question'))$('scenario-question').value='';if($('scenario-score'))$('scenario-score').value='3';matrix();render();message(status);}
function uniqueName(base,items){let n=items.length+1;while(items.some(item=>item.name.toLowerCase()===(base+' '+n).toLowerCase()))n++;return base+' '+n;}
$('title').addEventListener('input',()=>{project.title=$('title').value;changed();});
$('matrix').addEventListener('input',event=>{
  const node=event.target,field=node.dataset.field;if(!field)return;
  const row=node.closest('[data-criterion]'),cell=node.closest('[data-option]');
  const c=row?project.criteria.find(c=>c.id===row.dataset.criterion):null;
  const option=cell?project.options.find(o=>o.id===cell.dataset.option):null;
  if(field==='option-name')option.name=node.value;
  else if(field==='criterion-name')c.name=node.value;
  else if(field==='weight')c.weight=node.value===''?NaN:Number(node.value);
  else {const rating=option.ratings.find(r=>r.criterionId===c.id);if(field==='score')rating.score=node.value==='?'?null:Number(node.value);else rating.note=node.value;}
  changed();
});
$('matrix').addEventListener('click',event=>{
  const button=event.target.closest('button[data-action]');if(!button)return;
  if(button.dataset.action==='remove-option'){
    if(project.options.length<=2)return;const id=button.closest('[data-option]').dataset.option;project.options=project.options.filter(o=>o.id!==id);
  }else{
    if(project.criteria.length<=1)return;const id=button.closest('[data-criterion]').dataset.criterion;project.criteria=project.criteria.filter(c=>c.id!==id);for(const o of project.options)o.ratings=o.ratings.filter(r=>r.criterionId!==id);
  }matrix();changed();
});
$('add-option').addEventListener('click',()=>{if(project.options.length>=MAX_OPTIONS)return;project.options.push({id:crypto.randomUUID(),name:uniqueName('Option',project.options),ratings:project.criteria.map(c=>({criterionId:c.id,score:null,note:''}))});matrix();changed();});
$('add-criterion').addEventListener('click',()=>{if(project.criteria.length>=MAX_CRITERIA)return;const c={id:crypto.randomUUID(),name:uniqueName('Criterion',project.criteria),weight:1};project.criteria.push(c);for(const o of project.options)o.ratings.push({criterionId:c.id,score:null,note:''});matrix();changed();});
$('example').addEventListener('click',()=>load(example(),'Fictional example restored. Ratings are illustrative, not product claims.'));
$('new').addEventListener('click',()=>load({version:1,title:'Untitled decision',criteria:[{id:'criterion',name:'Criterion 1',weight:1}],options:[{id:'a',name:'Option A',ratings:[{criterionId:'criterion',score:null,note:''}]},{id:'b',name:'Option B',ratings:[{criterionId:'criterion',score:null,note:''}]}]},'New scorecard created. Save your work before replacing or reloading it.'));
function download(text,name,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('save').addEventListener('click',()=>{if(report)download(writeProject(project),'scorefold-project.json','application/json');});
$('download').addEventListener('click',()=>{if(!report)return;const type=$('export-format').value;download($('preview').value,'scorefold-'+(type==='markdown'?'brief.md':type==='csv'?'inputs.csv':'project.json'),type==='json'?'application/json':type==='csv'?'text/csv;charset=utf-8':'text/markdown;charset=utf-8');});
$('export-format').addEventListener('change',preview);
$('open').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;const token=++revision;
  try{if(file.size>200000)throw new Error('Project file is too large.');const source=await file.text();if(token!==revision)return;load(readProject(source),'Scorecard opened locally. Nothing was uploaded.');}
  catch(error){if(token===revision)message('Project not opened: '+error.message,true);}
  finally{event.target.value='';}
});
installPasteImport();
installScenario();
load(project,'Example loaded. Ratings are illustrative, not claims about real products.');

function installScenario(){
  const panel=el('div','scenario-panel');
  const head=el('div','section-head');const title=el('div');title.append(el('p','eyebrow','04 / TRY AN ASSUMPTION'),el('h2','','What would change your mind?'));head.append(title);
  const body=el('div','scenario-body');body.append(el('p','help','Test one unanswered rating. This does not change the scorecard and is not included in saved projects or exports.'));
  const fields=el('div','scenario-fields');
  const questionLabel=el('label','','Unanswered rating');const question=el('select');question.id='scenario-question';questionLabel.append(question);
  const scoreLabel=el('label','','Assume a rating');const score=el('select');score.id='scenario-score';
  for(let n=0;n<=5;n++){const option=el('option','',n+' / 5');option.value=String(n);score.append(option);}score.value='3';scoreLabel.append(score);
  const reset=el('button','quiet','Clear assumption');reset.id='scenario-reset';fields.append(questionLabel,scoreLabel,reset);
  const outcome=el('div');outcome.id='scenario-outcome';const verdict=el('div');verdict.id='scenario-verdict';const ranges=el('div');ranges.id='scenario-ranges';outcome.append(verdict,ranges);
  body.append(fields,outcome);panel.append(head,body);$('scenario-slot').append(panel);
  question.addEventListener('change',runScenario);score.addEventListener('change',runScenario);
  reset.addEventListener('click',()=>{question.value='';runScenario();});
}
function syncScenario(){
  const select=$('scenario-question'),previous=select.value;select.replaceChildren();
  const none=el('option','','Choose a question');none.value='';select.append(none);
  if(report)for(const q of report.questions){const option=el('option','',q.option+' / '+q.criterion);option.value=q.optionId+'|'+q.criterionId;select.append(option);}
  select.value=[...select.options].some(o=>o.value===previous)?previous:'';
  select.disabled=!report||report.questions.length===0;
  $('scenario-score').disabled=select.disabled;
  runScenario();
}
function runScenario(){
  const selected=$('scenario-question').value;
  if(!report||!selected){$('scenario-outcome').hidden=true;$('scenario-verdict').replaceChildren();$('scenario-ranges').replaceChildren();return;}
  try{
    const [optionId,criterionId]=selected.split('|');
    const scenario=simulateUnknown(project,optionId,criterionId,Number($('scenario-score').value));
    fillResults(scenario.analysis,$('scenario-verdict'),$('scenario-ranges'));$('scenario-outcome').hidden=false;
  }catch{ $('scenario-outcome').hidden=true; }
}

function installPasteImport(){
  const toolbar=document.querySelector('.toolbar>.actions');
  const toggle=el('button','quiet','Paste JSON');toggle.id='paste-toggle';toggle.setAttribute('aria-expanded','false');toolbar.append(toggle);
  const panel=el('section','paste-panel');panel.id='paste-panel';panel.hidden=true;panel.setAttribute('aria-label','Open scorecard from JSON');
  const label=el('label','','Saved scorecard JSON');const text=el('textarea');text.id='paste-source';text.maxLength=50000;text.spellcheck=false;text.setAttribute('aria-label','Saved scorecard JSON');label.append(text);
  const actions=el('div','actions');const open=el('button','primary','Open pasted scorecard');open.id='paste-open';const cancel=el('button','quiet','Cancel');actions.append(open,cancel);panel.append(label,actions);
  document.querySelector('.title-label').before(panel);
  function close(){panel.hidden=true;text.value='';toggle.setAttribute('aria-expanded','false');}
  toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)text.focus();});
  cancel.addEventListener('click',close);
  open.addEventListener('click',()=>{
    try{const next=readProject(text.value);load(next,'Pasted scorecard opened locally. Review the ratings and notes.');close();}
    catch(error){message('Scorecard not opened: '+error.message,true);}
  });
}
