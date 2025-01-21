// src/components/ImageViewer.tsx
import React, {useEffect} from 'react';
import {QueryKey, useQuery, useQueryClient} from '@tanstack/react-query';
import ImageItem from "../ImageItem/ImageItem.tsx";
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000'); // adjust URL as needed

interface ImageData {
    id: string;
    url: string;
    expiresAt: string;
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
        refetchInterval: 60 * 1000, // fetch every 5 seconds
    });
    const queryClient = useQueryClient();

    useEffect(() => {
        const handleImageRemoved = async (data: { id: string }) => {
            console.log('Image removed:', data.id);
            try {
                await queryClient.invalidateQueries({
                    queryKey: ['images'] as QueryKey,
                });
            } catch (error) {
                console.error('Failed to invalidate images query:', error);
            }
        };

        // Listen for image removal events
        socket.on('imageRemoved',handleImageRemoved);

        // Cleanup on unmount
        return () => {
            socket.off('imageRemoved', handleImageRemoved);
        };
    }, [queryClient]);

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
                images.map((img) => (
                    <ImageItem key={img.id} img={img} />
                ))
            ) : (
                <p>No images found.</p>
            )}
        </div>
    );
};

export default ImageViewer;
