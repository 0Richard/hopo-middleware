describe('calculateTotals', () => {
  let calculateTotals;

  beforeAll(async () => {
    ({ calculateTotals } = await import('../calculations.js'));
  });

  test('empty item list returns zero totals', () => {
    expect(calculateTotals([])).toEqual({ itemCount: 0, totalValue: 0 });
  });

  test('sample list with quantities and prices returns expected totals', () => {
    const items = [
      { quantity: 2, price: { amount: 5 } },
      { quantity: '3', price: { amount: '4' } },
      { quantity: 1, price: { amount: 10 } }
    ];

    expect(calculateTotals(items)).toEqual({ itemCount: 6, totalValue: 32 });
  });
});
