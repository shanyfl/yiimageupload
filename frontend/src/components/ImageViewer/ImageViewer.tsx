// src/components/ImageViewer.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import ImageItem from "../ImageItem/ImageItem.tsx";

interface ImageData {
    id: string;
    url: string;
    expiresAt: string;
    // Add other properties as needed
}

// Define a function to fetch images from the backend
const fetchImages = async (): Promise<ImageData[]> => {
    const response = await fetch('/api/v1/images');
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json();
};

const ImageViewer: React.FC = () => {
    const { data: images, error, isLoading, refetch } = useQuery<ImageData[], Error>({
        queryKey: ['images'],
        queryFn: fetchImages,
        // Optionally enable polling:
        refetchInterval: 5000, // fetch every 5 seconds
    });

    if (isLoading) {
        return <div>Loading images...</div>;
    }

    if (error) {
        return <div>Error loading images: {error.message}</div>;
    }

    return (
        <div>
            <h2>Uploaded Images</h2>
            <button onClick={() => refetch()}>Refresh</button>
            {images && images.length > 0 ? (
                <ul>
                    {images.map((img) => (
                        <li key={img.id}>
                            <ImageItem key={img.id} img={img} />
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No images found.</p>
            )}
        </div>
    );
};

export default ImageViewer;
