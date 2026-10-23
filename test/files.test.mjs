import test from 'node:test';
import assert from 'node:assert/strict';
import {readProject,writeProject,scoreCsv,brief} from '../src/files.mjs';
import {example} from '../src/example.mjs';
test('JSON retains unknown ratings, weights and evidence notes',()=>{
  const p=example();assert.deepEqual(readProject('\uFEFF'+writeProject(p)),p);
  assert.equal(readProject(writeProject(p)).options[0].ratings[3].score,null);
});
test('malformed and oversized imports reject without echoing content',()=>{
  for(const value of ['null','{private-sentinel','[]','x'.repeat(50001)])assert.throws(()=>readProject(value));
  assert.throws(()=>readProject('{private-sentinel'),error=>!error.message.includes('private-sentinel'));
});
test('CSV quotes notes and protects formula-like text while preserving zero',()=>{
  const p=example();p.options[0].name='=1+1';p.options[0].ratings[0].score=0;p.options[0].ratings[0].note='Say "hello", then go\nSecond line';
  const output=scoreCsv(p);
  assert.ok(output.includes('"\'=1+1"'));assert.ok(output.includes('"4","0",'));
  assert.ok(output.includes('"Say ""hello"", then go\nSecond line"'));
  assert.ok(output.includes('"unknown"'));
});
test('Markdown brief escapes user markup and keeps uncertainty explicit',()=>{
  const p=example();p.title='Compare [options]';p.options[0].ratings[0].note='![image](https://example.test/pixel)';
  const output=brief(p);
  assert.ok(output.startsWith('# Compare \\[options\\]'));
  assert.ok(output.includes('not probabilities'));
  assert.ok(output.includes('No unique clear lead'));
  assert.equal(output.includes('![image]('),false);
});
