const multer = require('multer')
const path = require('path')
const fs = require('fs')

const uploadsDir = path.join(__dirname, '..', '..', 'uploads')
const receiptsDir = path.join(uploadsDir, 'receipts')
fs.mkdirSync(uploadsDir, { recursive: true })
fs.mkdirSync(receiptsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Only image files are allowed'))
  },
})

// Attachment uploads accept any document type (invoice PDFs, delivery notes,
// images, ...) and are stored under uploads/receipts/.
const attachmentUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, receiptsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase()
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`)
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
})

function deleteUpload(url) {
  if (!url || !url.startsWith('/uploads/')) return
  const filePath = path.join(uploadsDir, path.basename(url))
  fs.unlink(filePath, () => {})
}

function deleteAttachmentFile(filename) {
  if (!filename) return
  const filePath = path.join(receiptsDir, path.basename(filename))
  fs.unlink(filePath, () => {})
}

module.exports = { upload, attachmentUpload, deleteUpload, deleteAttachmentFile }
