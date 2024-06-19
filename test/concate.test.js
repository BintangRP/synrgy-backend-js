const concate = require('../test/concate');

test('perkalian', () => {
    expect(concate(1, 2)).toBe(2);
    expect(concate(3, 100)).toBe(300);
});