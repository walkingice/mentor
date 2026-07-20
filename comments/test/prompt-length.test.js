const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');
const functionStart = html.indexOf('const buildCommentPrompt =');
const functionEnd = html.indexOf('const generateCommentWithGemini =', functionStart);
const buildCommentPromptSource = html.slice(functionStart, functionEnd);

const context = {
    DEFAULT_SETTINGS: { commentLength: 30 }
};
vm.runInNewContext(`${buildCommentPromptSource}; this.buildCommentPrompt = buildCommentPrompt;`, context);

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
