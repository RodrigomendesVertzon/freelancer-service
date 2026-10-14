import {
  DeleteObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import { storage } from "../config/storage";
import { env } from "../config/env";

export async function uploadObject(params: {
  key: string;
  buffer: Buffer;
  contentType: string;
}) {
  await storage.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: params.key,
      Body: params.buffer,
      ContentType: params.contentType,
    })
  );

  return params.key;
}

export async function deleteObject(key: string) {
  await storage.send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    })
  );
}