import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { id } = ctx.args;
  const sub_id = ctx.identity.sub;

  // First verify room exists and belongs to user
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({
      PK: `SUB#${sub_id}`,
      SK: `ROOM#${id}`
    })
  };
}

export function response(ctx) {
  const room = ctx.result;
  if (!room) {
    util.error('Room not found');
  }

  // Generate unique image key
  const imageKey = `uploads/${ctx.identity.sub}/${room.id}/${util.autoId()}.jpg`;

  // Get signed URL for upload
  const uploadUrl = util.url.encode(`https://${process.env.IMAGE_BUCKET}.s3.amazonaws.com/${imageKey}`);

  // Return the upload URL - the actual image processing will happen 
  // when the image is uploaded to S3 via the imageProcessor Lambda
  return {
    id: room.id,
    uploadUrl,
    imageKey
  };
}