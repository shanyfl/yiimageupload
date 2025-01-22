import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const DB_PATH = path.join(__dirname, 'db.sqlite');

export interface ImageRecord {
    id: string;
    filePath: string;       // local file system path (or S3 URL in production)
    expirationTimestamp: number; // e.g., Date.now() + X * 60 * 1000
}

export const initializeDb = async () => {
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database,
    });

    // Create the images table if it doesn't exist
    await db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      filePath TEXT NOT NULL,
      expirationTimestamp INTEGER NOT NULL
    );
  `);

    return db;
};
