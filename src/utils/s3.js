import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as presign } from '@aws-sdk/s3-request-presigner';

const client = new S3Client({ region: process.env.REGION });

export async function getSignedUrl(operation, params) {
  const commandMap = {
    putObject: PutObjectCommand,
    getObject: GetObjectCommand
  };
  const Command = commandMap[operation];
  if (!Command) {
    throw new Error(`Unsupported S3 operation: ${operation}`);
  }
  const command = new Command(params);
  return presign(client, command, { expiresIn: 900 });
}
