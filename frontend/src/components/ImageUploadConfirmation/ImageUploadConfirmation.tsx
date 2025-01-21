// src/components/ImageUploadConfirmation.tsx
import React from 'react';
import './ImageUploadConfirmation.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboard, faCheck } from '@fortawesome/free-solid-svg-icons';
import { UploadResponse } from '../ImageUpload/ImageUpload';

const isProduction = import.meta.env.NODE_ENV === 'production';
const APP_API_URL = isProduction ? import.meta.env.VITE_PROD_API_URL : import.meta.env.VITE_DEV_API_URL;
const IMAGES_URL = isProduction ? import.meta.env.VITE_PROD_IMAGES_URL : import.meta.env.VITE_DEV_IMAGES_URL;

interface ImageUploadConfirmationProps {
    uploadedImage: UploadResponse;
    onClose: () => void;
}

const ImageUploadConfirmation = ({ uploadedImage, onClose }: ImageUploadConfirmationProps) => {
    const imageUrl = `${APP_API_URL}${IMAGES_URL}${uploadedImage.id}`;
    const [copied, setCopied] = React.useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(imageUrl).then(() => {
            setCopied(true);
            setTimeout(() => {
                setCopied(false);
                onClose?.();
            }, 2000); // Revert to copy icon after 2 seconds
        });
    };

    return (
        <div className="image-upload-confirmation">
            <div className="modal-content">
                <h2>Image share link</h2>
                <div className="copy-container">
                    <input
                        type="text"
                        className="link-box"
                        readOnly
                        value={imageUrl}
                        onFocus={(e) => e.target.select()}
                    />
                    <span className="copy-icon" onClick={copyToClipboard}>
            <FontAwesomeIcon icon={copied ? faCheck : faClipboard} />
          </span>
                </div>
                <button className="close-button" onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    );
};

export default ImageUploadConfirmation;
