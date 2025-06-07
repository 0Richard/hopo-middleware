import AWS from 'aws-sdk';
import sharp from 'sharp';
import logger from './logger';

const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    const { Records } = event;
    
    for (const record of Records) {
      // Get the bucket and key from the S3 event
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key);
      
      // Get original image from S3
      const image = await s3.getObject({
        Bucket: bucket,
        Key: key
      }).promise();
      
      // Create thumbnail using sharp
      const thumbnail = await sharp(image.Body)
        .resize(
          parseInt(process.env.THUMBNAIL_WIDTH),
          parseInt(process.env.THUMBNAIL_HEIGHT),
          { fit: 'cover' }
        )
        .jpeg({ quality: parseInt(process.env.THUMBNAIL_QUALITY) })
        .toBuffer();
      
      // Generate thumbnail key
      const thumbnailKey = key.replace('uploads/', 'thumbnails/');
      
      // Upload thumbnail to S3
      await s3.putObject({
        Bucket: bucket,
        Key: thumbnailKey,
        Body: thumbnail,
        ContentType: 'image/jpeg'
      }).promise();
      
      // Extract room ID from key
      // Assuming key format: uploads/[sub_id]/[room_id]/[filename].jpg
      const keyParts = key.split('/');
      const roomId = keyParts[2];
      
      // Update room record with image URLs
      await dynamoDB.update({
        TableName: process.env.DYNAMODB_TABLE,
        Key: {
          PK: `SUB#${keyParts[1]}`,
          SK: `ROOM#${roomId}`
        },
        UpdateExpression: 'SET imageUrl = :imageUrl, thumbnailUrl = :thumbnailUrl, updated = :updated',
        ExpressionAttributeValues: {
          ':imageUrl': key,
          ':thumbnailUrl': thumbnailKey,
          ':updated': new Date().toISOString()
        }
      }).promise();
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Images processed successfully' })
    };
  } catch (error) {
    logger.error('Error processing image:', error);
    throw error;
  }
};
