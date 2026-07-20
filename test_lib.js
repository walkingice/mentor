// Mock localStorage if in Node.js environment
if (typeof localStorage === 'undefined') {
    global.localStorage = {
        _data: {},
        setItem(key, value) { this._data[key] = String(value); },
        getItem(key) { return this._data.hasOwnProperty(key) ? this._data[key] : null; },
        removeItem(key) { delete this._data[key]; },
        clear() { this._data = {}; }
    };
}

let currentSuite = '';
let passes = 0;
let failures = 0;

function describe(suiteName, fn) {
    currentSuite = suiteName;
    console.log(`\nSuite: ${suiteName}`);
    fn();
}

function it(testName, fn) {
    try {
        fn();
        console.log(`  ✓ ${testName}`);
        passes++;
    } catch (error) {
        console.error(`  ✗ ${testName}`);
        console.error(`    Error: ${error.message}`);
        if (error.stack) {
            console.error(error.stack.split('\n').slice(1, 4).join('\n'));
        }
        failures++;
    }
}

function assert(condition, message = 'Assertion failed') {
    if (!condition) {
        throw new Error(message);
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected: ${expected}, Got: ${actual}`);
    }
}

function assertThrows(fn, message = 'Expected function to throw') {
    let threw = false;
    try {
        fn();
    } catch (e) {
        threw = true;
    }
    if (!threw) {
        throw new Error(message);
    }
}

function getSummary() {
    return { passes, failures };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        describe,
        it,
        assert,
        assertEqual,
        assertThrows,
        getSummary
    };
}
