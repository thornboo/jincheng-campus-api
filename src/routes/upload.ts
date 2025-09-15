import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { authenticateToken } from '../middleware/auth'

const router = Router()

// 存储配置
const uploadsDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
    cb(null, name)
  },
})

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

// 单文件上传
router.post('/single', authenticateToken as any, upload.single('file'), (req, res) => {
  const file = req.file
  if (!file) return res.status(400).json({ code: 400, msg: '未接收到文件' })
  const url = `/uploads/${file.filename}`
  res.json({ code: 0, msg: 'ok', data: { url } })
})

// 多文件上传
router.post('/multiple', authenticateToken as any, upload.array('files', 9), (req, res) => {
  const files = (req.files as Express.Multer.File[]) || []
  const urls = files.map((f) => `/uploads/${f.filename}`)
  res.json({ code: 0, msg: 'ok', data: { urls } })
})

export default router


