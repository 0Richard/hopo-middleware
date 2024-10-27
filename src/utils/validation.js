// src/utils/validation.js
export function validateInput(input, requiredFields) {
    requiredFields.forEach(field => {
      if (!input[field]) {
        util.error(`Missing required field: ${field}`);
      }
    });
  }