const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, authorize } = require('../middleware/auth');
const { logger } = require('../middleware/errorHandler');

const router = express.Router();

// API endpoint to serve/render images
router.get('/image/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    console.log('Requested filename:', filename);
    const uploadsDir = path.join(__dirname, '../../uploads');
    const filePath = path.join(uploadsDir, filename);

    // Security check: ensure the file path is within uploads directory
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    
    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Get file extension and set content type
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    // Set headers - FIXED: removed duplicate Content-Type
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', contentType);
    
    // Send file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Image serving error:', error);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

// Add OPTIONS handler for CORS preflight
router.options('/image/:filename', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).end();
});


// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `menu-item-${uniqueSuffix}${ext}`);
  }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  },
  fileFilter: fileFilter
});

// Upload single image
router.post('/image', authenticateToken, authorize('admin', 'manager'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Get full URL with domain using API endpoint
    const protocol = req.protocol;
    const host = req.get('host');
    const imageUrl = `${protocol}://${host}/api/upload/image/${req.file.filename}`;
    
    // Log upload
    await logger.info(`Image uploaded: ${req.file.filename} by user ${req.user.username}`);

    res.json({
      success: true,
      imageUrl: imageUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    logger.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Upload multiple images
router.post('/images', authenticateToken, authorize('admin', 'manager'), upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    // Get full URL with domain using API endpoint
    const protocol = req.protocol;
    const host = req.get('host');
    
    const uploadedImages = req.files.map(file => ({
      imageUrl: `${protocol}://${host}/api/upload/image/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size
    }));

    // Log upload
    await logger.info(`${req.files.length} images uploaded by user ${req.user.username}`);

    res.json({
      success: true,
      images: uploadedImages
    });
  } catch (error) {
    logger.error('Images upload error:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// Delete image
router.delete('/image/:filename', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete file
    fs.unlinkSync(filePath);

    // Log deletion
    await logger.info(`Image deleted: ${filename} by user ${req.user.username}`);

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    logger.error('Image deletion error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// Get uploaded images list
router.get('/images', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    
    // Get full URL with domain using API endpoint
    const protocol = req.protocol;
    const host = req.get('host');
    
    const images = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      })
      .map(file => ({
        filename: file,
        imageUrl: `${protocol}://${host}/api/upload/image/${file}`,
        uploadDate: fs.statSync(path.join(uploadsDir, file)).mtime
      }))
      .sort((a, b) => b.uploadDate - a.uploadDate);

    res.json({
      success: true,
      images: images
    });
  } catch (error) {
    logger.error('Images list error:', error);
    res.status(500).json({ error: 'Failed to get images list' });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 10 files.' });
    }
  }
  
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({ error: 'Only image files are allowed!' });
  }

  logger.error('Upload middleware error:', error);
  res.status(500).json({ error: 'Upload failed' });
});

module.exports = router;