import {useEffect} from 'react';
import './ImageViewer.scss';
import {QueryKey, useQuery, useQueryClient} from '@tanstack/react-query';
import ImageItem from "../ImageItem/ImageItem.tsx";
import { io } from 'socket.io-client';

const isProduction = import.meta.env.NODE_ENV === 'production';
const IMAGES_URL = isProduction ? import.meta.env.VITE_PROD_IMAGES_URL : import.meta.env.VITE_DEV_IMAGES_URL;
const SOCKET_URL = isProduction ? import.meta.env.VITE_PROD_SERVER_URL : import.meta.env.VITE_DEV_SERVER_URL;
const socket = io(SOCKET_URL); // adjust URL as needed

interface ImageData {
    id: string;
    url: string;
    expiresAt: string;
}

const fetchImages = async (): Promise<ImageData[]> => {
    const response = await fetch(IMAGES_URL as string);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json();
};

const ImageViewer = () => {
    const { data: images, error, isLoading } = useQuery<ImageData[], Error>({
        queryKey: ['images'],
        queryFn: fetchImages,
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

    const renderImages = () => {
       if (images && images.length > 0) {
           return (
               <div className={'image-viewer'}>
                   <h2>Uploaded Images</h2>
                   {images.map((img) => (
                       <ImageItem key={img.id} img={img} />
                   ))}
               </div>
           );
       }

       return <p>No images found.</p>;
    }

    return (
        <div className={'image-viewer'}>
            {renderImages()}
        </div>
    );
};

export default ImageViewer;
