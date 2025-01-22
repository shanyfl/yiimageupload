import React, {useState, DragEvent, useRef} from 'react';
import './ImageUpload.scss';
import {QueryKey, useQueryClient} from '@tanstack/react-query';
import ImageUploadConfirmation from "../ImageUploadConfirmation/ImageUploadConfirmation.tsx";

export interface UploadResponse {
    message: string;
    id: string;
    expiresAt: string;
}

const ImageUpload = () => {
    const [file, setFile] = useState<File | null>(null);
    const [expirationTime, setExpirationTime] = useState<string>('0.5');
    const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();

    const [isDragActive, setIsDragActive] = useState<boolean>(false);

    const expirationOptions = [
        { label: '30 seconds', value: '0.5' },
        { label: '1 minute', value: '1' },
        { label: '5 minutes', value: '5' },
        { label: '15 minutes', value: '15' },
        { label: '30 minutes', value: '30' },
        { label: '1 hour', value: '60' },
        { label: '6 hours', value: '360' },
        { label: '12 hours', value: '720' },
        { label: '1 day', value: '1440' },
        { label: '3 days', value: '4320' },
        { label: '1 week', value: '10080' },
        { label: '1 month', value: '43200' },
        { label: '6 months', value: '259200' },
    ];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setError(null);
            setUploadResponse(null);
        }
    };

    const resetAll = () => {
        setFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; // clear the file input
        }
        setExpirationTime('0.5');
        setUploadResponse(null);
        setError(null);
    }

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        // Indicate visually that we can drop
        if (!isDragActive) {
            setIsDragActive(true);
        }
    };

    const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
    };

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

            // Invalidate and re-fetch the 'images' query after a successful upload
            await queryClient.invalidateQueries({
                queryKey: ['images'] as QueryKey,
            });

        } catch (err: unknown) {
            if (err instanceof Error) {
                console.error('Upload error:', err.message);
                setError(err.message);
            }
            else {
                console.error('Upload error:', err);
                setError('An unknown error occurred during upload');
            }
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="image-upload">
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

            <div style={{ marginBottom: '1rem' }}>
                <label>
                    <strong>Select image:</strong>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ marginLeft: '0.5rem' }}
                    />
                </label>
            </div>

            <div style={{marginBottom: '1rem'}}>
                <label>
                    <strong>Expiration:</strong>
                    <select
                        value={expirationTime}
                        onChange={(e) => setExpirationTime(e.target.value)}
                        style={{marginLeft: '0.5rem'}}
                    >
                        {expirationOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>


            <button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Upload'}
            </button>

            {error && (
                <div style={{marginTop: '1rem', color: 'red'}}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {uploadResponse && (
                <ImageUploadConfirmation
                    uploadedImage={uploadResponse}
                    onClose={() => resetAll()}
                />
            )}
        </div>
    );
};

export default ImageUpload;
