import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { uploadFile } from '../config/minio'

const storage = multer.memoryStorage()

const fileFilter = (_req: any, file: any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf/
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = allowedTypes.test(file.mimetype)

  if (mimetype && extname) {
    return cb(null, true)
  } else {
    cb(new Error('只支持图片和PDF文件'))
  }
}

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter,
})

export const uploadToMinio = async (file: Express.Multer.File): Promise<string> => {
  const fileName = `receipts/${uuidv4()}${path.extname(file.originalname)}`
  const url = await uploadFile(fileName, file.buffer, file.mimetype)
  return url
}