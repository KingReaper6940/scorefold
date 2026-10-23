export const MAX_OPTIONS=6;
export const MAX_CRITERIA=8;
const EPS=1e-9;
function text(value,max,label) {
  if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u001f]/.test(value))throw new Error(label+' must be non-empty text of at most '+max+' characters, without control characters.');
}
function id(value,used,label) {
  if(typeof value!=='string'||!/^[A-Za-z0-9_-]{1,60}$/.test(value)||used.has(value))throw new Error(label+' IDs must be unique letters, digits, underscores or hyphens.');
  used.add(value);
}
export function validate(input) {
  if(!input||input.version!==1)throw new Error('Use a Scorefold version 1 scorecard.');
  text(input.title,80,'Decision title');
  if(!Array.isArray(input.criteria)||input.criteria.length<1||input.criteria.length>MAX_CRITERIA)throw new Error('Use 1 to 8 criteria.');
  if(!Array.isArray(input.options)||input.options.length<2||input.options.length>MAX_OPTIONS)throw new Error('Use 2 to 6 options.');
  const criterionIds=new Set(),criterionNames=new Set();
  const criteria=input.criteria.map(c=>{
    if(!c)throw new Error('Invalid criterion.');
    id(c.id,criterionIds,'Criterion');text(c.name,40,'Criterion name');
    if(!Number.isInteger(c.weight)||c.weight<0||c.weight>100)throw new Error('Weights must be whole numbers from 0 to 100.');
    const name=c.name.trim().toLowerCase();if(criterionNames.has(name))throw new Error('Criterion names must be distinct.');criterionNames.add(name);
    return {id:c.id,name:c.name.trim(),weight:c.weight};
  });
  if(!criteria.some(c=>c.weight>0))throw new Error('At least one criterion needs a positive weight.');
  const optionIds=new Set(),optionNames=new Set();
  const options=input.options.map(option=>{
    if(!option)throw new Error('Invalid option.');
    id(option.id,optionIds,'Option');text(option.name,40,'Option name');
    const name=option.name.trim().toLowerCase();if(optionNames.has(name))throw new Error('Option names must be distinct.');optionNames.add(name);
    if(!Array.isArray(option.ratings)||option.ratings.length!==criteria.length)throw new Error('Each option needs one rating per criterion.');
    const seen=new Set();
    const ratings=option.ratings.map(r=>{
      if(!r||!criterionIds.has(r.criterionId)||seen.has(r.criterionId))throw new Error('Rating criterion IDs must match the scorecard exactly.');
      seen.add(r.criterionId);
      if(r.score!==null&&(!Number.isInteger(r.score)||r.score<0||r.score>5))throw new Error('Ratings must be unknown or a whole number from 0 to 5.');
      if(typeof r.note!=='string'||r.note.length>200||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(r.note))throw new Error('Rating notes must be text of at most 200 characters.');
      return {criterionId:r.criterionId,score:r.score,note:r.note};
    });
    return {id:option.id,name:option.name.trim(),ratings};
  });
  return {version:1,title:input.title.trim(),criteria,options};
}
export function analyze(input) {
  const project=validate(input);
  const totalWeight=project.criteria.reduce((sum,c)=>sum+c.weight,0);
  const questions=[];
  const options=project.options.map(option=>{
    let known=0,unknownWeight=0,unknownCount=0;
    for(const c of project.criteria) {
      const rating=option.ratings.find(r=>r.criterionId===c.id);
      if(rating.score===null) {
        if(c.weight>0){unknownWeight+=c.weight;unknownCount++;questions.push({optionId:option.id,option:option.name,criterionId:c.id,criterion:c.name,swing:100*c.weight/totalWeight,note:rating.note});}
      } else known+=c.weight*rating.score/5;
    }
    const lower=Math.max(0,Math.min(100,100*known/totalWeight));
    const upper=Math.max(0,Math.min(100,lower+100*unknownWeight/totalWeight));
    return {id:option.id,name:option.name,lower,upper,coverage:100*(totalWeight-unknownWeight)/totalWeight,unknownCount};
  });
  const bestLower=Math.max(...options.map(o=>o.lower));
  for(const option of options)option.canLead=option.upper>=bestLower-EPS;
  const clearLeader=options.find(o=>options.every(other=>other.id===o.id||o.lower>other.upper+EPS));
  const complete=questions.length===0;
  const tiedIds=complete?options.filter(o=>Math.abs(o.lower-bestLower)<=EPS).map(o=>o.id):[];
  questions.sort((a,b)=>b.swing-a.swing);
  return {title:project.title,totalWeight,options,questions,complete,clearLeaderId:clearLeader?.id??null,tiedIds};
}

export function simulateUnknown(input,optionId,criterionId,score) {
  const project=validate(input);
  if(!Number.isInteger(score)||score<0||score>5)throw new Error('Assumed rating must be a whole number from 0 to 5.');
  const option=project.options.find(o=>o.id===optionId),criterion=project.criteria.find(c=>c.id===criterionId);
  const rating=option?.ratings.find(r=>r.criterionId===criterionId);
  if(!rating||rating.score!==null||!criterion||criterion.weight===0)throw new Error('Choose an unanswered rating with a positive weight.');
  rating.score=score;
  return {assumption:{optionId,criterionId,score},analysis:analyze(project)};
}

