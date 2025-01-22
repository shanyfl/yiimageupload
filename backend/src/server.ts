import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import multer from 'multer';
import {nanoid} from "nanoid";
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import http from 'http';
import { initializeDb, ImageRecord } from './db';

// Initialize out db... else where will it be ??
let database: any;
(async () => {
  database = await initializeDb();
})();

// Create the uploads dir if it doesn't exist already :)
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// use multer middleware for multipart/form-data uploads
const storage = multer.diskStorage({
  destination: (_req, _res, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    // store file with an id based on unique name + original extension
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${nanoid()}${ext}`);
  },
});

const upload = multer({ storage });

// Initialize Express app server
const app = express();
app.use(cors()); // add support for cors, else we won't get much further!
app.use(express.json());
const server = http.createServer(app);

// we use socket.io for real-time updates
const io = new SocketIOServer(server, {
    cors: {
        origin: '*',
    },
});

app.get('/api/v1/images', async (req: express.Request, res: express.Response) => {
  try {
    const now = Date.now();
    // Query non-expired images
    const validImages: ImageRecord[] = await database.all(
        'SELECT * FROM images WHERE expirationTimestamp > ?',
        now
    );

    // Return image metadata
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

app.post('/api/v1/images', upload.single('image'), async (req: express.Request, res: express.Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // If an expirationTime was provided (in minutes) parse it as floats, since
    // we want to use seconds for the timestamp and not only whole minutes
    const expirationTimeMinutes = req.body.expirationTime
      ? parseFloat(req.body.expirationTime)
      : 60;

    // calculate the expiration
    const expirationTimestamp = Date.now() + expirationTimeMinutes * 60 * 1000;

    const imageID = nanoid();
    const record: ImageRecord = {
      id: imageID,
      filePath: req.file.path,
      expirationTimestamp,
    };

    // Insert the image into the db
    await database.run(
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

app.get('/api/v1/images/:imageID', async (req: express.Request, res: express.Response) => {
  try {
    const {imageID} = req.params;
    const record: ImageRecord = await database.get(
        'SELECT * FROM images WHERE id = ?',
        imageID
    );

    if (!record) {
      return res.status(404).json({error: 'Image not found'});
    }

    // Check if image expired already
    if (Date.now() > record.expirationTimestamp) {
      // Optionally delete the file from local disk
      if (fs.existsSync(record.filePath)) {
        fs.unlinkSync(record.filePath);
      }

      // Remove record from SQLite
      await database.run('DELETE FROM images WHERE id = ?', imageID);

      return res.status(410).json({error: 'Image has expired'}); // or 404
    }

    // it's valid, serve the file
    return res.sendFile(path.resolve(record.filePath));
  } catch (error) {
    console.error('Error fetching image:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// check if images have expired and if so, remove them and notify the client app
export const checkAndRemoveExpiredImages = async () => {
  try {
    const now = Date.now();

    // get all expired images
    const expiredImages: ImageRecord[] = await database.all(
        'SELECT * FROM images WHERE expirationTimestamp < ?',
        now
    );

    // remove the images from the upload dir
    for (const img of expiredImages) {
      console.log('Removing expired image:', img.id);
      if (fs.existsSync(img.filePath)) {
        fs.unlink(img.filePath, err => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      // delete the image from db
      await database.run('DELETE FROM images WHERE id = ?', img.id);
      io.emit('imageRemoved', { id: img.id });
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

// check every second - this is a native but doable approach
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

