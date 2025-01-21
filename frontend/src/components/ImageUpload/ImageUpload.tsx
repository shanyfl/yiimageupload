import React, { useState, DragEvent } from 'react';
import './ImageUpload.scss';
import { useQueryClient } from '@tanstack/react-query';

interface UploadResponse {
    message?: string;
    link?: string;
    expiresAt?: string;
}

const ImageUpload: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [expirationTime, setExpirationTime] = useState<string>('');
    const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const queryClient = useQueryClient();

    // State to track if we are currently dragging something over the drop area
    const [isDragActive, setIsDragActive] = useState<boolean>(false);

    /**
     * Handle file changes from the file input
     */
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setError(null);
            setUploadResponse(null);
        }
    };

    /**
     * Handle drag-over event (fired continuously when you drag something over the drop zone)
     */
    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        // Indicate visually that we can drop
        if (!isDragActive) {
            setIsDragActive(true);
        }
    };

    /**
     * Handle drag-enter event (fired when the dragged item enters the drop zone)
     */
    const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
    };

    /**
     * Handle drag-leave event (fired when the dragged item leaves the drop zone)
     */
    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
    };

    /**
     * Handle drop event (when user drops the file)
     */
    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFile = e.dataTransfer.files[0];
            // Only accept images (optional check)
            if (!droppedFile.type.startsWith('image/')) {
                setError('Please drop an image file');
                return;
            }
            setFile(droppedFile);
            setError(null);
            setUploadResponse(null);
            e.dataTransfer.clearData();
        }
    };

    /**
     * Handle form submission to upload the image
     */
    const handleUpload = async () => {
        setIsUploading(true);
        setError(null);
        setUploadResponse(null);

        if (!file) {
            setError('Please select or drop an image file.');
            setIsUploading(false);
            return;
        }

        if (!expirationTime) {
            setError('Please enter an expiration time.');
            setIsUploading(false);
            return;
        }

        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('expirationTime', expirationTime);

            const response = await fetch('/api/v1/images', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }

            const data = (await response.json()) as UploadResponse;
            setUploadResponse(data);

            // Invalidate and refetch the 'images' query after a successful upload
            await queryClient.invalidateQueries(['images']);
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || 'Error uploading image');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="image-upload">
            <h2>Upload a Temporary Image</h2>

            {/* Drag-and-drop area */}
            <div
                className={`drop-zone ${isDragActive ? 'drag-active' : ''}`}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {file ? (
                    <p>
                        <strong>Selected file:</strong> {file.name}
                    </p>
                ) : (
                    <p>Drag &amp; drop an image here, or click below to browse</p>
                )}
            </div>

            {/* Traditional file input */}
            <div style={{ marginBottom: '1rem' }}>
                <label>
                    <strong>Select image:</strong>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ marginLeft: '0.5rem' }}
                    />
                </label>
            </div>

            {/* Expiration time input */}
            <div style={{ marginBottom: '1rem' }}>
                <label>
                    <strong>Expiration (minutes):</strong>
                    <input
                        type="number"
                        value={expirationTime}
                        onChange={(e) => setExpirationTime(e.target.value)}
                        style={{ marginLeft: '0.5rem' }}
                    />
                </label>
            </div>

            {/* Upload button */}
            <button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Upload'}
            </button>

            {/* Error message */}
            {error && (
                <div style={{ marginTop: '1rem', color: 'red' }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {/* Upload response */}
            {uploadResponse && (
                <div style={{ marginTop: '1rem' }}>
                    <p>{uploadResponse.message}</p>
                    {uploadResponse.link && (
                        <p>
                            Image Link (expires at {uploadResponse.expiresAt}): <br />
                            <a href={uploadResponse.link} target="_blank" rel="noopener noreferrer">
                                {uploadResponse.link}
                            </a>
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default ImageUpload;
