const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { describe, it, assert, assertEqual, assertThrows, getSummary } = require('../../test_lib.js');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const context = vm.createContext({ Intl, Math });
vm.runInContext(script, context);
const run = expression => vm.runInContext(expression, context);

describe('normalization', () => {
  it('removes punctuation, symbols, whitespace and emoji', () => {
    assertEqual(run("normalizeText('A 1,\t中😀! #\\nB')"), 'Ａ１中Ｂ');
  });
  it('keeps a combining character in one cell', () => {
    assertEqual(run("characters(normalizeText('e\\u0301')).length"), 1);
  });
  it('deduplicates nonempty lines in input order', () => {
    assertEqual(JSON.stringify(run("normalizePuzzles('A!\\n  \\nA\\nB\\nＡ')")), '["Ａ","Ｂ"]');
  });
  it('removes puzzle characters from filler and uses fallback', () => {
    assertEqual(JSON.stringify(run("fillerCharacters('A中B', ['Ａ'])")), '["中","Ｂ"]');
    assertEqual(JSON.stringify(run("fillerCharacters('A!', ['Ａ'])")), '["。"]');
  });
  it('deduplicates filler characters after normalization', () => {
    assertEqual(JSON.stringify(run("fillerCharacters('AＡBB中中', ['Ｃ'])")), '["Ａ","Ｂ","中"]');
  });
});

describe('placement', () => {
  it('validates rectangular dimensions and word length', () => {
    assertEqual(run("generateGrid(7, 10, ['ＡＢＣＤＥＦＧＨ'], '中').length"), 7);
    assertThrows(() => run("generateGrid(6, 10, ['Ａ'], '中')"));
    assertThrows(() => run("generateGrid(7, 21, ['Ａ'], '中')"));
    assertThrows(() => run("generateGrid(7, 10, ['ＡＢＣＤＥＦＧＨＩＪＫ'], '中')"));
    assertThrows(() => run("generateGrid(7, 7, [], '中')"));
  });
  it('generates all four straight directions without diagonals', () => {
    const spots = run("candidates(['Ａ', 'Ｂ'], 7, 7)");
    assertEqual(new Set(spots.map(({ dr, dc }) => `${dr},${dc}`)).size, 4);
    assert(spots.every(({ dr, dc }) => Math.abs(dr) + Math.abs(dc) === 1));
  });
  it('allows equal overlaps and rejects conflicting overlaps', () => {
    assertEqual(run("canPlace([['Ａ','Ｂ'],['Ｃ',null]], ['Ｂ','Ｄ'], {row:0,column:1,dr:1,dc:0})"), true);
    assertEqual(run("canPlace([['Ａ','Ｂ'],['Ｃ',null]], ['Ａ','Ｄ'], {row:0,column:0,dr:1,dc:0})"), false);
  });
  it('fails at the search limit without returning a partial grid', () => {
    assertThrows(() => run("generateGrid(7, 7, ['Ａ'], '中', Math.random, 0)"));
  });
  it('fills every cell of the requested grid', () => {
    const grid = run("generateGrid(7, 10, ['ＡＢ'], '中')");
    assertEqual(grid.length, 7);
    assert(grid.every(row => row.length === 10 && row.every(Boolean)));
  });
  it('uses unique filler characters as evenly as possible', () => {
    const grid = run("generateGrid(7, 10, ['題'], '甲甲乙丙丙')");
    const counts = ['甲', '乙', '丙'].map(char => grid.flat().filter(cell => cell === char).length);
    assertEqual(counts.reduce((sum, count) => sum + count, 0), 69);
    assert(Math.max(...counts) - Math.min(...counts) <= 1);
  });
});

if (getSummary().failures) process.exitCode = 1;
