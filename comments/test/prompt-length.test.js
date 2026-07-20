const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');
const functionStart = html.indexOf('const buildCommentPrompt =');
const functionEnd = html.indexOf('const generateCommentWithGemini =', functionStart);
const buildCommentPromptSource = html.slice(functionStart, functionEnd);

const parseRosterNamesStart = html.indexOf('const parseRosterNames =');
const parseRosterNamesEnd = html.indexOf(';', parseRosterNamesStart) + 1;
const parseRosterNamesSource = html.slice(parseRosterNamesStart, parseRosterNamesEnd);

const context = {
    DEFAULT_SETTINGS: { commentLength: 30 }
};
vm.runInNewContext(`${buildCommentPromptSource}; this.buildCommentPrompt = buildCommentPrompt;`, context);
vm.runInNewContext(`${parseRosterNamesSource}; this.parseRosterNames = parseRosterNames;`, context);

const student = {
    name: '小明',
    traits: [],
    comment: ''
};

const baseSettings = {
    tone: '溫暖',
    includeName: true,
    includeClosing: true
};

test('buildCommentPrompt uses the configured numeric length', () => {
    const prompt = context.buildCommentPrompt(student, {
        ...baseSettings,
        commentLength: 30
    });

    assert.match(prompt, /一段約 30 字的完整期末評語/);
});

test('buildCommentPrompt falls back for legacy range settings', () => {
    const prompt = context.buildCommentPrompt(student, {
        ...baseSettings,
        commentLength: '30~50'
    });

    assert.match(prompt, /一段約 30 字的完整期末評語/);
});

test('buildCommentPrompt includes the student name when the setting is absent', () => {
    const prompt = context.buildCommentPrompt(student, {
        ...baseSettings,
        includeName: undefined,
        commentLength: 30
    });

    assert.match(prompt, /學生姓名：小明/);
    assert.doesNotMatch(prompt, /該生/);
});

test('buildCommentPrompt keeps the anonymous reference when name inclusion is disabled', () => {
    const prompt = context.buildCommentPrompt(student, {
        ...baseSettings,
        includeName: false,
        commentLength: 30
    });

    assert.match(prompt, /學生姓名：該生/);
});

test('parseRosterNames splits names by whitespace', () => {
    assert.deepEqual(Array.from(context.parseRosterNames('小明\n小華\t小美  小強')), [
        '小明',
        '小華',
        '小美',
        '小強'
    ]);
});

test('parseRosterNames ignores surrounding and repeated whitespace', () => {
    assert.deepEqual(Array.from(context.parseRosterNames('  小明\n\n 小華  ')), ['小明', '小華']);
});

test('parseRosterNames splits names by half-width and full-width commas', () => {
    assert.deepEqual(Array.from(context.parseRosterNames('小明,小華， 小美')), [
        '小明',
        '小華',
        '小美'
    ]);
});
