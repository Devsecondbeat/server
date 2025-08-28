import express from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import AWS from '@aws-sdk/client-s3';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {getInstrumentMakes} from '../controllers/instrumentMakesController.js';
import {createInstrumentAds, getInstrumentAds, getInstrumentAdsByUser, updateInstrumentAds, deleteInstrumentAds} from '../controllers/instrumentMakesController.js';
import { validateInstrumentAd, validateId } from '../middleware/validation.js';

const usedInstrumentsRouter = express.Router();

// Initialize AWS SDK and S3
const s3 = new S3Client({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// File validation function
const fileFilter = (req, file, cb) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Initialize Multer and MulterS3 with validation
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET,
    key: function (req, file, cb) {
      // Generate unique filename with timestamp and original name
      const timestamp = Date.now();
      const uniqueFilename = `${timestamp}-${file.originalname}`;
      cb(null, uniqueFilename);
    },
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    }
  }),
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only allow 1 file per request
  }
});

// Upload Images endpoint
usedInstrumentsRouter.put('/uploadImages', upload.single('image'), (req, res) => {
  try {
    console.log('Upload request received');
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Log upload details
    console.log('File uploaded successfully:', {
      originalName: req.file.originalname,
      key: req.file.key,
      size: req.file.size,
      mimetype: req.file.mimetype,
      location: req.file.location
    });

    // Return success response with file details
    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully to S3 bucket',
      data: {
        filename: req.file.originalname,
        key: req.file.key,
        size: req.file.size,
        mimetype: req.file.mimetype,
        location: req.file.location,
        bucket: req.file.bucket
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message
    });
  }
});

// Error handling middleware for multer
usedInstrumentsRouter.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Only one file allowed per request.'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: error.message
    });
  }
  
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed!'
    });
  }
  
  next(error);
});

// Get Image URL endpoint
usedInstrumentsRouter.get('/getImageURL', async (req, res) => {
  try {
    console.log('getImageURL request received');
    
    const { key } = req.query;
    
    // Validate required parameters
    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Image key is required'
      });
    }

    // Create command to get object from S3
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key
    });

    // Generate presigned URL (valid for 1 hour)
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    console.log('Generated presigned URL for key:', key);

    res.status(200).json({
      success: true,
      message: 'Image URL generated successfully',
      data: {
        key: key,
        url: presignedUrl,
        expiresIn: 3600, // seconds
        bucket: process.env.S3_BUCKET
      }
    });

  } catch (error) {
    console.error('GetImageURL error:', error);
    
    // Handle specific S3 errors
    if (error.name === 'NoSuchKey') {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    if (error.name === 'AccessDenied') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to image'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to generate image URL',
      error: error.message
    });
  }
});

// Get multiple image URLs endpoint (for batch operations)
usedInstrumentsRouter.post('/getMultipleImageURLs', async (req, res) => {
  try {
    console.log('getMultipleImageURLs request received');
    
    const { keys } = req.body;
    
    // Validate required parameters
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Array of image keys is required'
      });
    }

    // Limit batch size to prevent abuse
    if (keys.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 keys allowed per request'
      });
    }

    const imageUrls = [];

    // Generate presigned URLs for each key
    for (const key of keys) {
      try {
        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: key
        });

        const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
        
        imageUrls.push({
          key: key,
          url: presignedUrl,
          status: 'success'
        });
      } catch (error) {
        imageUrls.push({
          key: key,
          url: null,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log(`Generated ${imageUrls.length} image URLs`);

    res.status(200).json({
      success: true,
      message: 'Image URLs generated successfully',
      data: {
        urls: imageUrls,
        total: imageUrls.length,
        successful: imageUrls.filter(item => item.status === 'success').length,
        failed: imageUrls.filter(item => item.status === 'error').length
      }
    });

  } catch (error) {
    console.error('GetMultipleImageURLs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate image URLs',
      error: error.message
    });
  }
});

// Existing instrument endpoints
usedInstrumentsRouter.get('/getInstrumentMakes', getInstrumentMakes);

usedInstrumentsRouter.post('/createInstrumentAds', validateInstrumentAd, (req, res) => {
  createInstrumentAds(req, res);
});

usedInstrumentsRouter.get('/getInstrumentAds', getInstrumentAds);

usedInstrumentsRouter.get('/getInstrumentAdsByUser/:id', getInstrumentAdsByUser);

usedInstrumentsRouter.put('/updateInstrumentAds/:id', validateInstrumentAd, (req, res) => {
  updateInstrumentAds(req, res);
});

usedInstrumentsRouter.delete('/deleteInstrumentAds/:id', (req, res) => {
  deleteInstrumentAds(req, res);
});

export default usedInstrumentsRouter;