import { Router } from 'express'
import multer from 'multer'
import { expenseController } from '../controllers/expense.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/receipts/')
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/
    const isValid = allowedTypes.test(file.mimetype)
    if (isValid) {
      cb(null, true)
    } else {
      cb(new Error('只支持图片和PDF文件'))
    }
  },
})

router.use(authenticate)

router.get('/:id', expenseController.getExpenseDetail)
router.put('/:id', upload.single('receipt'), expenseController.updateExpense)
router.delete('/:id', expenseController.deleteExpense)

export default router