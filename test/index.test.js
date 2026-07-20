const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const html = fs.readFileSync('index.html', 'utf8');

test('root page links to the comments directory', () => {
    assert.match(html, /<a href="comments\/">/);
    assert.doesNotMatch(html, /href="comments\/index\.html"/);
});
