import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import { Button, Card } from '../ui';
import { X, Check } from 'lucide-react';
import getCroppedImg from '../../lib/avatarUtils';
import { Point, Area } from 'react-easy-crop';

interface AvatarCropModalProps {
    imageSrc: string;
    onCancel: () => void;
    onCropComplete: (blob: Blob) => void;
}

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({ imageSrc, onCancel, onCropComplete }) => {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const onCropChange = (crop: Point) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom: number) => {
        setZoom(zoom);
    };

    const onCropCompleteHandler = (_: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleSave = async () => {
        if (!croppedAreaPixels) return;
        setIsProcessing(true);
        try {
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (croppedImageBlob) {
                onCropComplete(croppedImageBlob);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 animate-fade-in backdrop-blur-sm isolate">
            <Card className="w-full max-w-lg bg-white overflow-hidden flex flex-col h-[80vh] md:h-[600px] shadow-2xl relative">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800">تعديل الصورة الشخصية</h3>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="relative flex-1 bg-black">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={onCropChange}
                        onCropComplete={onCropCompleteHandler}
                        onZoomChange={onZoomChange}
                        cropShape="round"
                        showGrid={false}
                    />
                </div>

                <div className="p-6 bg-white space-y-4">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-gray-500">تصغير/تكبير</span>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => {
                                setZoom(Number(e.target.value));
                            }}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0e3c63]"
                        />
                    </div>

                    <div className="flex gap-4 pt-2">
                        <Button
                            onClick={handleSave}
                            disabled={isProcessing}
                            className="flex-1 bg-[#0e3c63] hover:bg-[#1a4d7a] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                        >
                            {isProcessing ? 'جاري المعالجة...' : <><Check size={20} /> اعتماد الصورة</>}
                        </Button>
                        <Button
                            onClick={onCancel}
                            disabled={isProcessing}
                            variant="secondary"
                            className="px-6 border-gray-200"
                        >
                            إلغاء
                        </Button>
                    </div>
                </div>
            </Card>
        </div>,
        document.body
    );
};
