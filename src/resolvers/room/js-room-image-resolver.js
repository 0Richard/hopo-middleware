import { util } from '@aws-appsync/utils';
import { getSignedUrl } from '../../utils/s3';

export function request(ctx) {
  const { id } = ctx.args;
  const sub_id = ctx.identity.sub;

  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({
      PK: `SUB#${sub_id}`,
      SK: `ROOM#${id}`
    })
  };
}

export async function response(ctx) {
  const room = ctx.result;
  if (!room) {
    util.error('Room not found');
  }

  const imageKey = `uploads/${ctx.identity.sub}/${room.id}/${util.autoId()}.jpg`;

  const uploadUrl = await getSignedUrl('putObject', {
    Bucket: process.env.IMAGE_BUCKET,
    Key: imageKey,
    ContentType: 'image/jpeg'
  });

  return {
    id: room.id,
    uploadUrl,
    imageKey
  };
}
