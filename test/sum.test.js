const sum = require('../test/sum');

test('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3);
    expect(sum(3, 100)).toBe(103);
});