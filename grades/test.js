'use strict';
const fs = require('fs');
const vm = require('vm');
const { describe, it, assert, assertEqual, getSummary } = require('../test_lib.js');
const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
const context = vm.createContext({});
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
const { calculate, parseScore, exportText, timestamp, pasteValues } = context;
describe('Grade calculations', () => {
    it('distinguishes zero from missing students', () => {
        const result = calculate(['', '  ', '0', '100']);
        assertEqual(result.students.length, 2);
        assertEqual(result.mean, 50);
        assert(Math.abs(result.deviation - 50) < 1e-10);
        assertEqual(result.median, 50);
        assertEqual(result.students[1].seat, 3);
    });
    it('handles empty data and a single student', () => {
        assertEqual(calculate([]).mean, null);
        assertEqual(calculate(['82']).deviation, 0);
        assertEqual(calculate(['82']).median, 82);
    });
    it('calculates odd medians and sorts ties by seat', () => {
        const result = calculate(['80', '90', '90']);
        assertEqual(result.median, 90);
        assertEqual(result.students.map(s => s.seat).join(','), '2,3,1');
        assert(Math.abs(result.deviation - Math.sqrt(200 / 9)) < 1e-10);
    });
    it('assigns every boundary and decimal to one band', () => {
        const result = calculate(['101', '100', '99.9', '90', '89.5', '80', '79', '70', '69', '60', '59.9', '0']);
        assertEqual(result.bands.join(','), '2,2,2,2,2,2');
    });
    it('rejects negatives, nonnumeric and nonfinite values', () => {
        ['-1', 'abc', 'Infinity', '.', '0x20', '1e2'].forEach(value => assert(Number.isNaN(parseScore(value))));
        const result = calculate(['90', '-1']);
        assertEqual(result.invalid.join(','), '2');
        assertEqual(result.students.length, 0);
    });
});
describe('Pasting and export', () => {
    it('preserves blank rows and accepts Windows and Mac newlines', () => {
        assertEqual(pasteValues(['1', '2', '3', '4', '5'], 1, '90\r\n\r\n0\r80').join('|'), '1|90||0|80');
    });
    it('clips paste at the last seat without changing earlier seats', () => {
        assertEqual(pasteValues(['1', '2'], 1, '80\n90').join(','), '1,80');
    });
    it('exports zero, missing seats, statistics and ranking', () => {
        const text = exportText(['90', '', '0', ' ', '']);
        assert(text.includes('01. 90\n02. --\n03. 0\n'));
        assert(!text.includes('04.'));
        assert(text.includes('總平均：45.00'));
        assert(text.includes('### 成績排序'));
    });
    it('uses the class subject as the H1 export title', () => {
        assertEqual(exportText(['90'], ' 四年一班數學 ').split('\n')[0], '# 四年一班數學');
    });
    it('uses the default title when the class subject is empty', () => {
        ['', '   ', undefined].forEach(title => {
            assertEqual(exportText([], title).split('\n')[0], '# 班級成績表');
        });
    });
    it('blocks invalid exports and handles empty exports', () => {
        let threw = false;
        try { exportText(['-1']); } catch { threw = true; }
        assert(threw);
        assert(exportText([]).includes('學生人數：0'));
    });
    it('formats a local timestamp with padded components', () => {
        assertEqual(timestamp(new Date(2026, 0, 2, 3, 4, 5)), '20260102_030405');
    });
});
const summary = getSummary();
console.log(`\n${summary.passes} passed, ${summary.failures} failed`);
process.exitCode = summary.failures ? 1 : 0;
