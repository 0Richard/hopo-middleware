// src/utils/s3.js
export function getSignedUrl(operation, params) {
    return util.url.encode(`https://${params.Bucket}.s3.amazonaws.com/${params.Key}`);
  }
  