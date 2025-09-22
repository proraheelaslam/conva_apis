const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Ensure diary upload directory exists
const uploadDir = path.join(__dirname, '../uploads/diary');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for diary photo upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.png';
    const filename = `diary-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const extname = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowed.test(file.mimetype);
  if (extname && mimetype) return cb(null, true);
  cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter
});

function buildUrl(req, filename) {
  return `${req.protocol}://${req.get('host')}/uploads/diary/${filename}`;
}

// POST /api/upload/diary/single
// Accept either form-data field name 'photo' or 'photos' for convenience
router.post('/single', (req, res, next) => {
  const handler = upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'photos', maxCount: 1 }]);
  handler(req, res, function(err) {
    if (err) return next(err);
    // Normalize to req.file
    const photoArr = (req.files && (req.files.photo || req.files.photos)) || [];
    req.file = photoArr[0];
    return next();
  });
}, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 400, message: 'No file uploaded', data: null });
    }
    return res.status(200).json({
      status: 200,
      message: 'Diary photo uploaded successfully',
      data: {
        filename: req.file.filename,
        url: buildUrl(req, req.file.filename),
        size: req.file.size,
        originalName: req.file.originalname
      }
    });
  } catch (error) {
    return res.status(500).json({ status: 500, message: 'Server error during upload', data: error.message || error });
  }
});

// POST /api/upload/diary/multiple
router.post('/multiple', upload.array('photos', 12), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ status: 400, message: 'No files uploaded', data: null });
    }
    const filenames = req.files.map(f => f.filename);
    return res.status(200).json({
      status: 200,
      message: `${req.files.length} diary photos uploaded successfully`,
      data: {
        filenames,
        urls: filenames.map(fn => buildUrl(req, fn))
      }
    });
  } catch (error) {
    return res.status(500).json({ status: 500, message: 'Server error during upload', data: error.message || error });
  }
});

// DELETE /api/upload/diary/:filename
router.delete('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ status: 404, message: 'File not found', data: null });
    }
    fs.unlinkSync(filePath);
    return res.status(200).json({ status: 200, message: 'Diary photo deleted successfully', data: null });
  } catch (error) {
    return res.status(500).json({ status: 500, message: 'Server error during deletion', data: error.message || error });
  }
});

module.exports = router;
