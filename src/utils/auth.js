// src/utils/auth.js
export function validateOwnership(ctx, entitySubId) {
    const requestorSubId = ctx.identity.sub;
    if (requestorSubId !== entitySubId) {
      util.error('Not authorized');
    }
  }
  
  export function isAdmin(ctx) {
    return ctx.identity.groups?.includes('Admin') ?? false;
  }