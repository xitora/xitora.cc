import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSvgPath } from '../src/utils/svgPath.ts';
import { parseUrlString, buildUrlString } from '../src/utils/urlParser.ts';
import { convertToCsv } from '../src/utils/mockData.ts';
import { getWcagRating } from '../src/utils/colorPalette.ts';
import { evaluateTokenStatus, formatUnixTimestamp } from '../src/utils/jwt.ts';
import { buildEmailPayload, buildSmsPayload } from '../src/utils/qrGenerator.ts';
import { executeRegexAnalysis } from '../src/utils/regexTester.ts';
import { fromHex } from '../src/utils/core.ts';
import { calculateDutchPay } from '../src/utils/dutchPay.ts';

test('SVG expands repeated coordinates and implicit lines after moveto', () => {
 const result = parseSvgPath('M0 0 10 10 20 0 L30 0 40 10');
 assert.equal(result.isValid, true);
 assert.deepEqual(result.segments.map(s => s.command), ['M','L','L','L','L']);
 assert.deepEqual(result.segments.at(-1).endPoint, {x:40,y:10});
});
test('SVG handles smooth quadratic endpoints and rejects invalid arguments', () => {
 assert.deepEqual(parseSvgPath('M0 0 Q10 20 20 0 T40 0').segments.at(-1).endPoint,{x:40,y:0});
 for (const path of ['M0', 'M0 0 L2', 'X10 10', 'M0 0 garbage']) assert.equal(parseSvgPath(path).isValid,false,path);
});
test('URL accepts protocol-relative addresses and preserves credentials and query keys', () => {
 const parsed=parseUrlString('//example.com/a'); assert.equal(parsed.isValid,true);
 const auth=parseUrlString('https://user:pass@example.com/a?%20key%20=value');
 const rebuilt=new URL(buildUrlString(auth,auth.params));
 assert.equal(rebuilt.username,'user'); assert.equal(rebuilt.password,'pass'); assert.equal(rebuilt.searchParams.get(' key '),'value');
});
test('CSV escapes quoted and comma-separated header names', () => {
 assert.equal(convertToCsv([{'a,b':'value','say"hi':'x'}]), '\"a,b\",\"say\"\"hi\"\n\"value\",\"x\"');
});
test('contrast pass/fail uses the unrounded ratio', () => {
 const result=getWcagRating('#6363f8','#ffffff');
 assert.equal(result.ratio,4.5); assert.equal(result.aaNormal,false);
});
test('JWT NumericDate zero is a valid expired timestamp', () => {
 assert.equal(evaluateTokenStatus({exp:0},1).status,'expired');
 assert.notEqual(formatUnixTimestamp(0),'-');
});
test('QR email spaces use percent encoding and empty SMS still opens SMS', () => {
 assert.ok(buildEmailPayload({to:'a@example.com',subject:'hello world'}).includes('hello%20world'));
 assert.equal(buildSmsPayload({phone:'010-1234-5678'}),'smsto:01012345678:');
});
test('zero-width Unicode matches advance past surrogate pairs', () => {
 const result=executeRegexAnalysis('(?:)','gu','😀');
 assert.equal(result.isValid,true); assert.deepEqual(result.matches.map(m=>m.index),[0,2]);
});
test('hex decoding rejects corrupt input instead of silently stripping it', () => {
 assert.throws(()=>fromHex('GG')); assert.deepEqual([...fromHex('41 42')],[65,66]);
});
test('one-won settlements remain payable', () => {
 const result=calculateDutchPay([{id:'a',name:'A'},{id:'b',name:'B'}],[{id:'1',title:'test',amount:2,payerId:'a',participantIds:['a','b']}]);
 assert.deepEqual(result.transfers,[{fromName:'B',toName:'A',amount:1}]);
});


test('SI and binary data units are distinct', async () => {
 const {convertUnit}=await import('../src/utils/unitConverter.ts');
 assert.equal(convertUnit(1,'KB','B','data'),1000);
 assert.equal(convertUnit(1,'KiB','B','data'),1024);
});
test('cURL retains colon characters in Basic Auth and generates valid Python JSON', async () => {
 const {parseCurlCommand,generatePythonRequestsCode,generateFetchCode}=await import('../src/utils/curl.ts');
 const parsed=parseCurlCommand(`curl https://example.com -u 'user:a:b' --json '{"enabled":true,"value":null}'`);
 assert.equal(parsed.auth.password,'a:b');
 const code=generatePythonRequestsCode(parsed);
 assert.ok(code.includes('json.loads('));
 assert.doesNotThrow(()=>new Function(generateFetchCode({...parsed, url:"https://example.com/it's"})));
});
test('image downscaling never returns a zero-sized dimension', async () => {
 const {calculateAspectRatioFit}=await import('../src/utils/imageOptimizer.ts');
 assert.deepEqual(calculateAspectRatioFit(10000,1,1,1),{width:1,height:1});
});
test('UTF-8 ZIP filenames declare their encoding in both headers', async () => {
 const {createZipBundle}=await import('../src/utils/favicon.ts');
 const zip=createZipBundle([{name:'아이콘.png',data:'test'}]);
 const view=new DataView(zip.buffer);
 assert.equal(view.getUint16(6,true),0x800);
 const central=30+new TextEncoder().encode('아이콘.png').length+4;
 assert.equal(view.getUint16(central+8,true),0x800);
});

test('world time rejects malformed timestamps and preserves epoch zero', async () => {
 const {decodeWorldTimeShare}=await import('../src/utils/worldTime.ts');
 assert.equal(decodeWorldTimeShare('?t=0').timestampMs,0);
 assert.equal(decodeWorldTimeShare('?t=123bad').timestampMs,null);
 assert.equal(decodeWorldTimeShare('?t=9999999999999999999999').timestampMs,null);
});
