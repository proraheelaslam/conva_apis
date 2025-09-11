const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/profile-photos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + fileExtension;
    cb(null, filename);
  }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Upload single image
router.post('/single', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 400,
        message: 'No file uploaded',
        data: null
      });
    }

    res.status(200).json({
      status: 200,
      message: 'Image uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: `/uploads/profile-photos/${req.file.filename}`
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      status: 500,
      message: 'Server error during upload',
      data: error.message
    });
  }
});

// Upload multiple images (up to 6 photos)
router.post('/multiple', upload.array('photos', 6), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 400,
        message: 'No files uploaded',
        data: null
      });
    }

    res.status(200).json({
      status: 200,
      message: `${req.files.length} images uploaded successfully`,
      data: {
        filenames: req.files.map(file => file.filename) // Array of filenames for photos field
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      status: 500,
      message: 'Server error during upload',
      data: error.message
    });
  }
});

// Delete uploaded image
router.delete('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        status: 404,
        message: 'File not found',
        data: null
      });
    }

    fs.unlinkSync(filePath);

    res.status(200).json({
      status: 200,
      message: 'Image deleted successfully',
      data: null
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      status: 500,
      message: 'Server error during deletion',
      data: error.message
    });
  }
});

module.exports = router;
