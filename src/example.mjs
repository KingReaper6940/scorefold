export function example() {
  const criteria=[{id:'setup',name:'Easy to set up',weight:4},{id:'control',name:'Control over data',weight:4},{id:'editing',name:'Editing experience',weight:3},{id:'maintenance',name:'Low maintenance',weight:2}];
  const rows=[
    ['wiki','Open-source wiki',[2,5,3,null],['Needs an installation owner.','Can run on our own server.','Try the editor with the team.','Need an upkeep estimate.']],
    ['docs','Shared documents',[5,2,5,5],['Workspace already available.','Illustrative score; check policy.','Familiar editing workflow.','Managed service in this fictional example.']],
    ['portal','Lightweight portal',[4,null,4,4],['Some setup required.','Need a data retention review.','Test with a contributor.','Ask about update ownership.']]
  ];
  return {version:1,title:'Choose a home for team knowledge',criteria,options:rows.map(([id,name,scores,notes])=>({id,name,ratings:criteria.map((c,i)=>({criterionId:c.id,score:scores[i],note:notes[i]}))}))};
}
