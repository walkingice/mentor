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

const canUseCommentActionsStart = html.indexOf('const canUseCommentActions =');
const canUseCommentActionsEnd = html.indexOf(';', canUseCommentActionsStart) + 1;
const canUseCommentActionsSource = html.slice(canUseCommentActionsStart, canUseCommentActionsEnd);

const backupHelpersStart = html.indexOf('const removeApiKeyFromSettings =');
const backupHelpersEnd = html.indexOf('const { useState', backupHelpersStart);
const backupHelpersSource = html.slice(backupHelpersStart, backupHelpersEnd);

const context = {
    DEFAULT_SETTINGS: { commentLength: 30 }
};
vm.runInNewContext(`${buildCommentPromptSource}; this.buildCommentPrompt = buildCommentPrompt;`, context);
vm.runInNewContext(`${parseRosterNamesSource}; this.parseRosterNames = parseRosterNames;`, context);
vm.runInNewContext(`${canUseCommentActionsSource}; this.canUseCommentActions = canUseCommentActions;`, context);
vm.runInNewContext(`${backupHelpersSource}; this.createLocalStorageBackup = createLocalStorageBackup; this.parseLocalStorageBackup = parseLocalStorageBackup; this.preserveCurrentApiKey = preserveCurrentApiKey;`, context);

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

test('comment actions are enabled only when comment has content', () => {
    assert.equal(context.canUseCommentActions(''), false);
    assert.equal(context.canUseCommentActions('   '), false);
    assert.equal(context.canUseCommentActions('老師覺得小明很認真。'), true);
});

test('student rows expose centered delete and comment action controls', () => {
    assert.match(html, /absolute left-0 top-1\/2 -translate-x-1\/2 -translate-y-1\/2/);
    assert.match(html, /aria-label="清除評語"/);
    assert.match(html, /aria-label="複製評語"/);
});

test('bottom bar exposes backup export and import controls', () => {
    assert.match(html, /匯出備份/);
    assert.match(html, /匯入備份/);
    assert.match(html, /accept="\.json,application\/json"/);
    assert.match(html, /getExportFilename\(settings\.className, '備份', 'json'\)/);
});

test('model discovery only runs from the manual refresh control', () => {
    assert.doesNotMatch(html, /\}, \[settings\.apiKey\]\);/);
    assert.match(html, /onClick=\{refreshAvailableModels\}/);
    assert.match(html, /aria-label="重新整理 Model 清單"/);
});

test('localStorage backup preserves every stored key and value', () => {
    const storage = {
        firstKey: 'first value',
        secondKey: '{"enabled":true}',
        'teacher-settings': JSON.stringify({ className: '1年1班', apiKey: 'secret' })
    };
    Object.defineProperty(storage, 'getItem', {
        value(key) {
            return this[key];
        },
        enumerable: false
    });

    assert.equal(JSON.stringify(context.createLocalStorageBackup(storage)), JSON.stringify({
        firstKey: 'first value',
        secondKey: '{"enabled":true}',
        'teacher-settings': JSON.stringify({ className: '1年1班' })
    }));
});

test('localStorage backup parser accepts string values only', () => {
    assert.equal(
        JSON.stringify(context.parseLocalStorageBackup('{"teacher-settings":"{}"}')),
        JSON.stringify({ 'teacher-settings': '{}' })
    );
    assert.throws(
        () => context.parseLocalStorageBackup('{"teacher-settings":{}}'),
        /備份檔內容不正確/
    );
    assert.throws(
        () => context.parseLocalStorageBackup('[]'),
        /備份檔格式不正確/
    );
});

test('backup import preserves the current API key', () => {
    const storage = {
        getItem(key) {
            return key === 'teacher-settings'
                ? JSON.stringify({ className: '2年3班', apiKey: 'current-secret' })
                : null;
        }
    };
    const backup = {
        'teacher-settings': JSON.stringify({ className: '1年1班', apiKey: 'old-secret' })
    };

    const imported = context.preserveCurrentApiKey(backup, storage);
    assert.equal(JSON.parse(imported['teacher-settings']).apiKey, 'current-secret');
    assert.equal(JSON.parse(imported['teacher-settings']).className, '1年1班');
});
