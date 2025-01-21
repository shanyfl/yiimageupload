import express from 'express';

import multer from 'multer';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import cors from 'cors';

// In-memory store for image metadata
interface ImageRecord {
  id: string;
  filePath: string;       // local file system path (or S3 URL in production)
  expirationTimestamp: number; // e.g., Date.now() + X * 60 * 1000
}

const images: ImageRecord[] = [];

// Create the uploads directory if it doesn't exist
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// Configure Multer for single-file upload:
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // store file with a nanoid-based unique name + original extension
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${nanoid()}${ext}`);
  },
});
const upload = multer({ storage });

// Initialize Express
const app = express();
app.use(cors()); // optional, if you need CORS for local dev
app.use(express.json());


// Endpoint to fetch all non-expired images
// GET /v1/images
app.get('/api/v1/images', (req: express.Request, res: express.Response) => {
  console.log(images);
  // Filter out expired images
  const validImages = images.filter(img => Date.now() < img.expirationTimestamp);

  // Map valid images to a response format
  const imageData = validImages.map(img => ({
    id: img.id,
    // Construct URL to fetch individual image
    url: `${req.protocol}://${req.get('host')}/v1/images/${img.id}`,
    expiresAt: new Date(img.expirationTimestamp).toISOString(),
  }));

  res.json(imageData);
});

//-------------------------------------------------
// POST /v1/images
//-------------------------------------------------
// 1) Accepts a single file (field name: "image")
// 2) Accepts expirationTime (minutes) in the body or query
// 3) Returns JSON with { imageID, url, message }
app.post('/api/v1/images', upload.single('image'), (req: express.Request, res: express.Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // If an expirationTime was provided (in minutes), parse it:
    const expirationTimeMinutes = req.body.expirationTime
      ? parseInt(req.body.expirationTime, 10)
      : 60; // default to 60 minutes if not provided

    // Calculate expiration timestamp
    const expirationTimestamp = Date.now() + expirationTimeMinutes * 60 * 1000;

    // Generate a unique ID for the image
    const imageID = nanoid();

    // Store metadata in our in-memory array
    const record: ImageRecord = {
      id: imageID,
      filePath: req.file.path,
      expirationTimestamp,
    };

    images.push(record);

    // Construct a URL for retrieving the image
    // e.g., http://localhost:4000/v1/images/xyz123
    const imageUrl = `${req.protocol}://${req.get('host')}/api/v1/images/${imageID}`;

    return res.status(201).json({
      message: 'Image uploaded successfully',
      imageID,
      url: imageUrl,
      expiresAt: new Date(expirationTimestamp).toISOString(),
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

//-------------------------------------------------
// GET /v1/images/:imageID
//-------------------------------------------------
// 1) Find the matching record in our in-memory store
// 2) Check if expired
// 3) Return the file if valid, or 404 if not found/expired
app.get('/api/v1/images/:imageID', (req: express.Request, res: express.Response) => {
  const { imageID } = req.params;
  const record = images.find((img) => img.id === imageID);

  if (!record) {
    return res.status(404).json({ error: 'Image not found' });
  }

  // Check if expired
  if (Date.now() > record.expirationTimestamp) {
    // Optionally delete the file from local disk
    if (fs.existsSync(record.filePath)) {
      fs.unlinkSync(record.filePath);
    }

    // Remove from in-memory store
    const index = images.findIndex((img) => img.id === imageID);
    if (index !== -1) {
      images.splice(index, 1);
    }

    return res.status(410).json({ error: 'Image has expired' }); // or 404
  }

  // If valid, serve the file
  return res.sendFile(path.resolve(record.filePath));
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

