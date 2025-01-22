import { beforeEach, it, describe, expect, vi} from 'vitest'
import fs from 'fs';
import { checkAndRemoveExpiredImages } from '../src/server';
import viteConfig from "../vite.config";

const mockIo = {
    emit: vi.fn(),
};

const database = {
    all: vi.fn(),
    run: vi.fn(),
};

const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock fs.existsSync and fs.unlink
vi.mock('fs', () => ({
    default: {
        mkdirSync: vi.fn(),
        existsSync: vi.fn().mockReturnValue(true),
        unlink: vi.fn((_path, cb) => cb(null)),
    },
    existsSync: vi.fn(),
    unlink: vi.fn((_path, cb) => cb(null)),
}));

vi.mock('socket.io', () => ({
    Server: vi.fn().mockImplementation(() => ({
        on: vi.fn(),
    })),
}));

const expiredImages = [
    { id: 'img1', filePath: '/fake/path1.jpg', expirationTimestamp: Date.now() - 10000 },
    { id: 'img2', filePath: '/fake/path2.jpg', expirationTimestamp: Date.now() - 20000 },
];

vi.mock('database', () => ({
    database: database
}));

describe('checkAndRemoveExpiredImages', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should remove expired images, delete files, and delete records from db, then emit events', async () => {
        await checkAndRemoveExpiredImages();
        expect(database.all).toHaveBeenCalledWith(
            'SELECT * FROM images WHERE expirationTimestamp < ?',
            expect.any(Number)
        );

        for (const img of expiredImages) {
            expect(fs.existsSync).toHaveBeenCalledWith(img.filePath);
            expect(fs.unlink).toHaveBeenCalledWith(img.filePath, expect.any(Function));
            expect(database.run).toHaveBeenCalledWith('DELETE FROM images WHERE id = ?', img.id);
            expect(mockIo.emit).toHaveBeenCalledWith('imageRemoved', { id: img.id });
        }
    });

    it('should handle cases where no expired images are returned', async () => {
        database.all = vi.fn().mockResolvedValue([]);

        await checkAndRemoveExpiredImages();

        expect(database.all).toHaveBeenCalled();
        expect(fs.existsSync).not.toHaveBeenCalled();
        expect(fs.unlink).not.toHaveBeenCalled();
        expect(database.run).not.toHaveBeenCalled();
        expect(mockIo.emit).not.toHaveBeenCalled();
    });

    it('should catch and log errors during cleanup', async () => {
        const error = new Error('Test error');
        database.all = vi.fn().mockRejectedValue(error);

        await checkAndRemoveExpiredImages();

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error during cleanup:', error);
    });
});

