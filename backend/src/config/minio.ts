import * as Minio from 'minio'
import logger from '../utils/logger'

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
})

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'tripsum'

export async function initMinio() {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME)
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1')
      logger.info(`Bucket ${BUCKET_NAME} created successfully`)
    } else {
      logger.info(`Bucket ${BUCKET_NAME} already exists`)
    }
  } catch (error) {
    logger.error('MinIO initialization error:', error)
  }
}

export async function uploadFile(
  fileName: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string> {
  try {
    await minioClient.putObject(BUCKET_NAME, fileName, fileBuffer, fileBuffer.length, {
      'Content-Type': contentType,
    })
    
    const url = await minioClient.presignedGetObject(BUCKET_NAME, fileName, 7 * 24 * 60 * 60)
    return url
  } catch (error) {
    logger.error('File upload error:', error)
    throw error
  }
}

export async function deleteFile(fileName: string): Promise<void> {
  try {
    await minioClient.removeObject(BUCKET_NAME, fileName)
  } catch (error) {
    logger.error('File deletion error:', error)
    throw error
  }
}

export default minioClient