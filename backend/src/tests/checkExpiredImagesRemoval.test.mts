import fs from 'fs';
import { EventEmitter } from 'events';

// Assuming the function is exported from a module, e.g., cleanup.ts
import { checkAndRemoveExpiredImages } from '../server';

// Create mock objects for db and io
const mockDb = {
    all: jest.fn(),
    run: jest.fn(),
};

const mockIo = new EventEmitter();
mockIo.emit = jest.fn();

// Spy on console to suppress and check logs if needed
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

// Mock fs.existsSync and fs.unlink
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    unlink: jest.fn((path, cb) => cb(null)),
}));

// Override global variables used in checkAndRemoveExpiredImages
// Assuming in your module, you reference `db` and `io` directly, we override them:
jest.mock('./db', () => ({
    db: mockDb,
}));
jest.mock('socket.io', () => ({
    Server: jest.fn().mockImplementation(() => ({
        emit: mockIo.emit,
        on: jest.fn(),
    })),
}));

// Re-import the function after setting up mocks if necessary
// e.g., const { checkAndRemoveExpiredImages } = require('./cleanup');

describe('checkAndRemoveExpiredImages', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should remove expired images, delete files, and delete records from db, then emit events', async () => {
        // Setup: Create fake expired images in db
        const expiredImages = [
            { id: 'img1', filePath: '/fake/path1.jpg', expirationTimestamp: Date.now() - 1000 },
            { id: 'img2', filePath: '/fake/path2.jpg', expirationTimestamp: Date.now() - 2000 },
        ];

        // Configure db.all to return the expired images
        mockDb.all = jest.fn().mockResolvedValue(expiredImages);

        // Simulate that files exist for these images
        fs.existsSync = jest.fn().mockReturnValue(true);

        // Call the function under test
        await checkAndRemoveExpiredImages();

        // Verify db.all was called with expected query
        expect(mockDb.all).toHaveBeenCalledWith(
            'SELECT * FROM images WHERE expirationTimestamp < ?',
            expect.any(Number)  // now timestamp
        );

        // Verify that fs.existsSync and fs.unlink were called for each image
        for (const img of expiredImages) {
            expect(fs.existsSync).toHaveBeenCalledWith(img.filePath);
            expect(fs.unlink).toHaveBeenCalledWith(img.filePath, expect.any(Function));
            expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM images WHERE id = ?', img.id);
            expect(mockIo.emit).toHaveBeenCalledWith('imageRemoved', { id: img.id });
        }
    });

    it('should handle cases where no expired images are returned', async () => {
        // Setup: No expired images
        mockDb.all = jest.fn().mockResolvedValue([]);

        await checkAndRemoveExpiredImages();

        expect(mockDb.all).toHaveBeenCalled();
        // Since no images, unlink, run, or emit should not be called
        expect(fs.existsSync).not.toHaveBeenCalled();
        expect(fs.unlink).not.toHaveBeenCalled();
        expect(mockDb.run).not.toHaveBeenCalled();
        expect(mockIo.emit).not.toHaveBeenCalled();
    });

    it('should catch and log errors during cleanup', async () => {
        // Setup: Make db.all throw an error
        const error = new Error('Test error');

        // Configure db.all to return the expired images
        mockDb.all = jest.fn().mockResolvedValue(error);
        await checkAndRemoveExpiredImages();

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error during cleanup:', error);
    });
});
