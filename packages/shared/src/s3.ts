import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env.js";

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY,
      },
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    });
  }
  return s3Client;
}

export function isAllowedArtifactKey(key: string): boolean {
  return (
    key.startsWith("smoke/") &&
    !key.includes("..") &&
    !key.startsWith("/") &&
    key.length <= 300
  );
}

export function buildSmokeArtifactKey(runId: string): string {
  return `smoke/${runId}.png`;
}

export async function uploadArtifact(
  key: string,
  body: Buffer,
  contentType = "image/png",
): Promise<void> {
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getSignedArtifactUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  if (!isAllowedArtifactKey(key)) {
    throw new Error("Invalid artifact key");
  }

  const client = getS3Client();

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    }),
    { expiresIn },
  );
}