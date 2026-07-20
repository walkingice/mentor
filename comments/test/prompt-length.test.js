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

const rowAnimationStart = html.indexOf('const getStudentRowAnimationClass =');
const rowAnimationEnd = html.indexOf(';', rowAnimationStart) + 1;
const rowAnimationSource = html.slice(rowAnimationStart, rowAnimationEnd);

const createStudentStart = html.indexOf('const createStudent =');
const createStudentEnd = html.indexOf('};', createStudentStart) + 2;
const createStudentSource = html.slice(createStudentStart, createStudentEnd);

const storageHelpersStart = html.indexOf('const STORAGE_PREFIX_KEY =');
const storageHelpersEnd = html.indexOf('const DEFAULT_PRESET_TRAITS =', storageHelpersStart);
const storageHelpersSource = html.slice(storageHelpersStart, storageHelpersEnd);
const backupHelpersStart = html.indexOf('const removeApiKeyFromSettings =');
const backupHelpersEnd = html.indexOf('const { useState', backupHelpersStart);
const backupHelpersSource = html.slice(backupHelpersStart, backupHelpersEnd);

const context = {
    DEFAULT_SETTINGS: { commentLength: 30 }
};
vm.runInNewContext(`${buildCommentPromptSource}; this.buildCommentPrompt = buildCommentPrompt;`, context);
vm.runInNewContext(`${parseRosterNamesSource}; this.parseRosterNames = parseRosterNames;`, context);
vm.runInNewContext(`${canUseCommentActionsSource}; this.canUseCommentActions = canUseCommentActions;`, context);
vm.runInNewContext(`${rowAnimationSource}; this.getStudentRowAnimationClass = getStudentRowAnimationClass;`, context);
const studentContext = {
    crypto: { randomUUID: () => 'test-id' }
};
vm.runInNewContext(`${createStudentSource}; this.createStudent = createStudent;`, studentContext);
vm.runInNewContext(`${storageHelpersSource}; this.getStorageKey = getStorageKey; this.getLogicalStorageKey = getLogicalStorageKey; this.isAppStorageKey = isAppStorageKey; this.clearAppStorage = clearAppStorage; this.restoreLocalStorageBackup = restoreLocalStorageBackup;`, context);
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

test('new students start with an empty name', () => {
    assert.equal(studentContext.createStudent().name, '');
    assert.match(createStudentSource, /name: ""/);
    assert.match(html, /Array\.from\(\{ length: 20 \}, createStudent\)/);
    assert.equal((html.match(/createStudent\(\)/g) || []).length, 2);
});

test('student rows expose centered delete and comment action controls', () => {
    assert.match(html, /absolute left-0 top-1\/2 -translate-x-1\/2 -translate-y-1\/2/);
    assert.match(html, /aria-label="清除評語"/);
    assert.match(html, /aria-label="複製評語"/);
});

test('student rows expose enter and removal animation states', () => {
    assert.equal(context.getStudentRowAnimationClass(false), 'student-row-enter');
    assert.equal(context.getStudentRowAnimationClass(true), 'student-row-removing');
    assert.match(html, /@keyframes student-row-enter/);
    assert.match(html, /@keyframes student-row-remove/);
    assert.match(html, /setTimeout\(\(\) => \{[\s\S]*setStudents\(prev => prev\.filter\(s => s\.id !== id\)\)/);
    assert.match(html, /getStudentRowAnimationClass\(removingId === student\.id\)/);
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

test('header places API key and model controls beside the title on wide screens', () => {
    assert.match(html, /max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8/);
    assert.match(html, /flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3/);
    assert.match(html, /lg:min-w-\[28rem\]/);
    assert.match(html, /<h1[\s\S]*?<\/h1>[\s\S]*?Responsive Secure Gemini API Key Setting/);
});

test('localStorage backup preserves every stored key and value', () => {
    const storage = {
        'myapp_comment:firstKey': 'first value',
        'myapp_comment:secondKey': '{"enabled":true}',
        'myapp_comment:teacher-settings': JSON.stringify({ className: '1年1班', apiKey: 'secret' }),
        'other-app:settings': 'must remain private'
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

test('storage keys are namespaced and backup ignores other apps', () => {
    assert.equal(context.getStorageKey('teacher-settings'), 'myapp_comment:teacher-settings');
    assert.equal(context.getLogicalStorageKey('myapp_comment:teacher-settings'), 'teacher-settings');
    assert.equal(context.isAppStorageKey('other-app:settings'), false);
});

test('backup restore clears and writes only this app namespace', () => {
    const storage = {
        'myapp_comment:old': 'old value',
        'other-app:keep': 'keep value',
        removeItem(key) {
            delete this[key];
        },
        setItem(key, value) {
            this[key] = value;
        }
    };
    Object.defineProperty(storage, 'getItem', {
        value(key) {
            return this[key] ?? null;
        },
        enumerable: false
    });

    context.clearAppStorage(storage);
    context.restoreLocalStorageBackup({ 'teacher-settings': '{}', students: '[]' }, storage);

    assert.equal(storage['myapp_comment:old'], undefined);
    assert.equal(storage['other-app:keep'], 'keep value');
    assert.equal(storage['myapp_comment:teacher-settings'], '{}');
    assert.equal(storage['myapp_comment:students'], '[]');
});

test('backup import preserves the current API key', () => {
    const storage = {
        getItem(key) {
            return key === 'myapp_comment:teacher-settings'
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
