import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import multer from 'multer';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import http from 'http';
import { initializeDb, ImageRecord } from './db';  // import DB setup

// Initialize Database
let db: any;
(async () => {
  db = await initializeDb();
})();


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
const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: '*',
    },
});

// Endpoint to fetch all non-expired images
// GET /v1/images
app.get('/api/v1/images', async (req: express.Request, res: express.Response) => {
  try {
    const now = Date.now();
    // Query non-expired images from SQLite
    const validImages: ImageRecord[] = await db.all(
        'SELECT * FROM images WHERE expirationTimestamp > ?',
        now
    );

    const imageData = validImages.map(img => ({
      id: img.id,
      url: `${req.protocol}://${req.get('host')}/api/v1/images/${img.id}`,
      expiresAt: new Date(img.expirationTimestamp).toISOString(),
    }));

    res.json(imageData);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//-------------------------------------------------
// POST /v1/images
//-------------------------------------------------
// 1) Accepts a single file (field name: "image")
// 2) Accepts expirationTime (minutes) in the body or query
// 3) Returns JSON with { imageID, url, message }
app.post('/api/v1/images', upload.single('image'), async (req: express.Request, res: express.Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // If an expirationTime was provided (in minutes), parse it:
    const expirationTimeMinutes = req.body.expirationTime
      ? parseFloat(req.body.expirationTime)
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

    // Insert metadata into SQLite
    await db.run(
        `INSERT INTO images (id, filePath, expirationTimestamp) VALUES (?, ?, ?)`,
        record.id,
        record.filePath,
        record.expirationTimestamp
    );

    return res.status(201).json({
      message: 'Image uploaded successfully',
      imageID,
      id: imageID,
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
app.get('/api/v1/images/:imageID', async (req: express.Request, res: express.Response) => {
  try {
    const {imageID} = req.params;
    const record: ImageRecord = await db.get(
        'SELECT * FROM images WHERE id = ?',
        imageID
    );

    if (!record) {
      return res.status(404).json({error: 'Image not found'});
    }

    // Check if expired
    if (Date.now() > record.expirationTimestamp) {
      // Optionally delete the file from local disk
      if (fs.existsSync(record.filePath)) {
        fs.unlinkSync(record.filePath);
      }

      // Remove record from SQLite
      await db.run('DELETE FROM images WHERE id = ?', imageID);

      return res.status(410).json({error: 'Image has expired'}); // or 404
    }

    // If valid, serve the file
    return res.sendFile(path.resolve(record.filePath));
  } catch (error) {
    console.error('Error fetching image:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// Remove expired images periodically
const checkAndRemoveExpiredImages = async () => {
  try {
    const now = Date.now();
    const expiredImages: ImageRecord[] = await db.all(
        'SELECT * FROM images WHERE expirationTimestamp < ?',
        now
    );

    for (const img of expiredImages) {
      console.log('Removing expired image:', img.id);
      if (fs.existsSync(img.filePath)) {
        fs.unlink(img.filePath, err => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      await db.run('DELETE FROM images WHERE id = ?', img.id);
      io.emit('imageRemoved', { id: img.id });
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

// Check for expired images every minute (adjust as needed)
setInterval(checkAndRemoveExpiredImages, 1000);

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Listen for client connections
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Optionally handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

