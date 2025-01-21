// src/components/ImageItem.tsx
import React from 'react';

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
        <li>
            <img src={`http://localhost:5173/api/v1/images/${img.id}`} alt={`Uploaded ${img.id}`} style={{ maxWidth: '200px' }} />
            <p>Expires At: {img.expiresAt}</p>
            <p>Time Left: {formatTimeLeft(timeLeft)}</p>
        </li>
    );
};

export default ImageItem;
