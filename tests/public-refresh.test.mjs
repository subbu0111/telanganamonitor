import test from 'node:test';import assert from 'node:assert/strict';
import {publicSources,isPublicSource} from '../scripts/public-sources.mjs';
import {AI_MODEL,parseJSON} from '../scripts/ai-client.mjs';
const rule=publicSources[0],valid={permissionId:rule.id,publicAllowed:true,publisher:rule.publisher,url:'https://www.pib.gov.in/PressReleasePage.aspx?PRID=123',permissionUrl:rule.permissionUrl,licenseUrl:rule.licenseUrl,author:'PIB'};
test('Public records need a matching permission and original publisher',()=>{assert.ok(isPublicSource(valid));for(const patch of [{publicAllowed:false},{permissionId:'unknown'},{url:'https://unapproved.example/article'},{permissionUrl:''},{licenseUrl:''},{author:''}])assert.equal(isPublicSource({...valid,...patch}),false);});
test('AI configuration locks the requested model and rejects malformed JSON',()=>{assert.equal(AI_MODEL,'nvidia/nemotron-3.5-lightning:free');assert.deepEqual(parseJSON('```json\n{"ok":true}\n```'),{ok:true});assert.throws(()=>parseJSON('Here is my answer: {"ok":true}'));});
