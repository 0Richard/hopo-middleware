// src/resolvers/js/room/uploadRoomImage.js
import { util } from '@aws-appsync/utils';
import { getSignedUrl } from '../../utils/s3';

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
  const imageKey = `${ctx.identity.sub}/${room.id}/${util.autoId()}.jpg`;
  const thumbnailKey = `${ctx.identity.sub}/${room.id}/${util.autoId()}_thumb.jpg`;

  // Get signed URLs for upload
  const uploadUrl = getSignedUrl('putObject', {
    Bucket: process.env.IMAGE_BUCKET,
    Key: imageKey,
    ContentType: 'image/jpeg',
    ACL: 'private'
  });

  // Update room with new image URLs
  const updateResult = util.dynamodb.update({
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      PK: `SUB#${ctx.identity.sub}`,
      SK: `ROOM#${room.id}`
    }),
    update: {
      expression: 'SET imageUrl = :imageUrl, thumbnailUrl = :thumbnailUrl, updated = :updated',
      expressionValues: util.dynamodb.toMapValues({
        ':imageUrl': imageKey,
        ':thumbnailUrl': thumbnailKey,
        ':updated': util.time.nowISO8601()
      })
    }
  });

  return {
    ...updateResult,
    uploadUrl
  };
}
