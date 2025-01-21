// src/components/ImageItem.tsx
import React from 'react';
import './ImageItem.scss';

const isProduction = import.meta.env.NODE_ENV === 'production';
const APP_API_URL = isProduction ? import.meta.env.VITE_PROD_API_URL : import.meta.env.VITE_DEV_API_URL;
const IMAGES_URL = isProduction ? import.meta.env.VITE_PROD_IMAGES_URL : import.meta.env.VITE_DEV_IMAGES_URL;

interface ImageData {
    id: string;
    url: string;
    expiresAt: string;
    // Add other properties as needed
}

interface ImageItemProps {
    img: ImageData;
}

const ImageItem: React.FC<ImageItemProps> = ({ img }) => {
    const imageUrl = `${APP_API_URL}${IMAGES_URL}${img.id}`;
    const expirationDate = new Date(img.expiresAt);
    const [timeLeft, setTimeLeft] = React.useState<number>(
        expirationDate.getTime() - Date.now()
    );

    React.useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(expirationDate.getTime() - Date.now());
        }, 1000);

        // Cleanup interval on unmount
        return () => clearInterval(interval);
    }, [expirationDate]);

    const formatTimeLeft = (ms: number) => {
        if (ms <= 0) return 'Expired';
        const totalSeconds = Math.floor(ms / 1000);
        const seconds = totalSeconds % 60;
        const minutes = Math.floor(totalSeconds / 60) % 60;
        const hours = Math.floor(totalSeconds / 3600);
        return `${hours}h ${minutes}m ${seconds}s`;
    };

    return (
        <div className={'image-item'}>
            <img src={imageUrl} alt={`Uploaded ${img.id}`}/>
            <p>Expires At: {img.expiresAt}</p>
            <p>Time Left: {formatTimeLeft(timeLeft)}</p>
        </div>
    );
};

export default ImageItem;
