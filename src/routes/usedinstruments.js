import express from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import AWS from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';
import {getinstrumentMakes} from '../controllers/instrumentMakesController.js';
const usedInstrumentsRouter = express.Router();


// Initialize AWS SDK and S3

const s3 = new S3Client(
{
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,  // Replace with your own AWS Access Key ID
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,  // Replace with your own AWS Secret Access Key
  region: process.env.AWS_REGION // Replace with your own AWS Region
}

);

// Initialize Multer and MulterS3
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET,  // Replace with your own bucket name
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + '-' + file.originalname);
    }
  })
});

usedInstrumentsRouter.put('/uploadImages', upload.single('image'),(req,res) => {
    console.log(req);
    console.log("received requeset");
   
    res.send('Uploaded successfully to S3 bucket');
});

usedInstrumentsRouter.get('/getImageURL', (req,res) => {

  console.log("getImageURL request");

    
});

usedInstrumentsRouter.get('/getinstrumentMakes',getinstrumentMakes);

export default usedInstrumentsRouter;
