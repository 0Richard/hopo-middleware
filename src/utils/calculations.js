// src/utils/calculations.js
export function calculateTotals(items) {
    return items.reduce((acc, item) => {
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.price?.amount) || 0;
      
      return {
        itemCount: acc.itemCount + quantity,
        totalValue: acc.totalValue + (quantity * price)
      };
    }, { itemCount: 0, totalValue: 0 });
  }