import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze,validate,simulateUnknown } from '../src/core.mjs';
import { example } from '../src/example.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('example retains uncertainty and no premature clear leader',()=>{
  const r=analyze(example());assert.equal(r.totalWeight,13);assert.equal(r.clearLeaderId,null);
  near(r.options[0].lower,100*37/65);near(r.options[0].upper,100*47/65);
  near(r.options[1].lower,100*53/65);near(r.options[1].upper,100*53/65);
  near(r.options[2].lower,100*36/65);near(r.options[2].upper,100*56/65);
  assert.deepEqual(r.options.map(o=>o.canLead),[false,true,true]);
});
test('unknown is distinct from zero and zero weight is excluded',()=>{
  const p=example();p.criteria.forEach(c=>c.weight=0);p.criteria[0].weight=1;
  p.options[0].ratings[0].score=null;p.options[1].ratings[0].score=0;
  const r=analyze(p);assert.deepEqual([r.options[0].lower,r.options[0].upper],[0,100]);
  assert.deepEqual([r.options[1].lower,r.options[1].upper],[0,0]);
  assert.equal(r.questions.length,1);
});
test('questions are ordered by potential point swing',()=>{
  const r=analyze(example());assert.equal(r.questions[0].criterionId,'control');
  near(r.questions[0].swing,400/13);near(r.questions[1].swing,200/13);
});
test('clear lead uses worst versus best bounds, not a midpoint',()=>{
  const p=example();p.options[2].ratings[1].score=5;
  const r=analyze(p);assert.equal(r.clearLeaderId,'portal');
});
test('complete equal options are a tie, never an arbitrary winner',()=>{
  const p=example();for(const o of p.options)for(const r of o.ratings)r.score=3;
  const r=analyze(p);assert.equal(r.complete,true);assert.equal(r.clearLeaderId,null);
  assert.deepEqual(r.tiedIds,['wiki','docs','portal']);r.options.forEach(o=>near(o.lower,60));
});
test('multiplying all weights preserves score ranges and does not mutate input',()=>{
  const p=example(),before=structuredClone(p);const a=analyze(p);
  assert.deepEqual(p,before);p.criteria.forEach(c=>c.weight*=3);const b=analyze(p);
  a.options.forEach((o,i)=>{near(o.lower,b.options[i].lower);near(o.upper,b.options[i].upper);});
});
test('rejects duplicate names/IDs, missing ratings and invalid weights/scores',()=>{
  for(const mutate of [p=>{p.options[0].name=p.options[1].name;},p=>{p.criteria[0].id=p.criteria[1].id;},p=>{p.criteria.forEach(c=>c.weight=0);},p=>{p.options[0].ratings.pop();},p=>{p.options[0].ratings[0].score=6;},p=>{p.criteria[0].weight=.5;}]) {
    const p=example();mutate(p);assert.throws(()=>validate(p));
  }
});
test('normalizes away arbitrary metadata',()=>{
  const p=example();p.privateMetadata='discard';p.options[0].ratings[0].extra='discard';
  const clean=validate(p);assert.equal('privateMetadata' in clean,false);assert.equal('extra' in clean.options[0].ratings[0],false);
});

test('isolated assumptions change only the scenario analysis',()=>{
  const p=example(),before=structuredClone(p);
  const low=simulateUnknown(p,'portal','control',0);
  const high=simulateUnknown(p,'portal','control',5);
  assert.equal(low.analysis.clearLeaderId,'docs');
  assert.equal(high.analysis.clearLeaderId,'portal');
  assert.deepEqual(p,before);assert.equal(analyze(p).clearLeaderId,null);
});
test('scenarios reject existing ratings, ignored criteria and invalid scores',()=>{
  const p=example();
  assert.throws(()=>simulateUnknown(p,'docs','control',3));
  assert.throws(()=>simulateUnknown(p,'portal','control',6));
  p.criteria[1].weight=0;assert.throws(()=>simulateUnknown(p,'portal','control',3));
});

test('all completions of the two demo unknowns agree with possible-leader bounds',()=>{
  const base=analyze(example()),possible=new Set();
  for(let a=0;a<=5;a++)for(let b=0;b<=5;b++){
    const p=example();p.options[0].ratings[3].score=a;p.options[2].ratings[1].score=b;
    const done=analyze(p);const top=Math.max(...done.options.map(o=>o.lower));
    for(const o of done.options){
      const range=base.options.find(candidate=>candidate.id===o.id);
      assert.ok(o.lower>=range.lower-1e-8&&o.lower<=range.upper+1e-8);
      if(Math.abs(o.lower-top)<1e-8)possible.add(o.id);
    }
  }
  assert.deepEqual(base.options.filter(o=>o.canLead).map(o=>o.id),[...possible].sort((a,b)=>base.options.findIndex(o=>o.id===a)-base.options.findIndex(o=>o.id===b)));
});
test('all maximum scores reach 100 and oversized option sets reject',()=>{
  const p=example();for(const o of p.options)for(const r of o.ratings)r.score=5;
  for(const o of analyze(p).options)near(o.lower,100);
  p.options=Array.from({length:7},(_,i)=>({...p.options[0],id:'id'+i,name:'Option '+i}));
  assert.throws(()=>validate(p),/2 to 6/);
});

