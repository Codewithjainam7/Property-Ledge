import React, { useRef, useState, useEffect } from 'react';
import { PenLine, RotateCcw, UploadCloud, FileImage } from 'lucide-react';

interface SignaturePadProps {
  onSign: (signatureBase64: string | null) => void;
}

export function SignaturePad({ onSign }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'draw') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'transparent';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
      }
    }
  }, [mode]);

  const getCoordinates = (event: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;

    if ('touches' in event) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = (event as React.MouseEvent).clientX;
      clientY = (event as React.MouseEvent).clientY;
    }
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'draw') return;
    e.preventDefault();
    setIsDrawing(true);
    setIsEmpty(false);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'draw') return;
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing || mode !== 'draw') return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (canvas) {
      onSign(canvas.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    setUploadedImage(null);
    setIsEmpty(true);
    onSign(null);

    if (mode === 'draw') {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setUploadedImage(base64String);
        setIsEmpty(false);
        onSign(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <label className="text-sm font-black text-on-surface flex items-center gap-2">
            <PenLine className="w-4 h-4 text-primary" /> Signature
          </label>
          <div className="flex bg-surface-container-low rounded-lg p-0.5 border border-outline-variant/30">
            <button
              onClick={() => { setMode('draw'); clearSignature(); }}
              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${mode === 'draw' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Draw
            </button>
            <button
              onClick={() => { setMode('upload'); clearSignature(); }}
              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${mode === 'upload' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Upload
            </button>
          </div>
        </div>
        <button 
          type="button"
          onClick={clearSignature}
          className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 bg-surface-container hover:bg-primary/10 px-3 py-1.5 rounded-full"
        >
          <RotateCcw className="w-3 h-3" /> Clear
        </button>
      </div>
      
      <div className="relative w-full h-40 bg-surface-container-lowest border-2 border-outline-variant/40 rounded-2xl overflow-hidden group hover:border-primary/50 transition-colors shadow-inner flex items-center justify-center">
        
        {mode === 'draw' ? (
          <>
            {isEmpty && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                <span className="text-xl font-display font-black text-on-surface-variant uppercase tracking-widest">Sign Here</span>
              </div>
            )}
            <canvas
              ref={canvasRef}
              width={800}
              height={320}
              style={{ width: '100%', height: '100%', touchAction: 'none' }}
              className="cursor-crosshair relative z-10"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            {uploadedImage ? (
              <img src={uploadedImage} alt="Uploaded Signature" className="max-w-full max-h-full object-contain p-4" />
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 text-on-surface-variant hover:text-primary transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">Upload Signature Image</span>
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/png, image/jpeg, image/jpg, image/svg+xml" 
              className="hidden" 
            />
          </div>
        )}

        {/* Signature Line */}
        <div className="absolute bottom-6 left-8 right-8 h-[2px] bg-outline-variant/40 rounded-full pointer-events-none" />
      </div>
      
      <p className="text-[10px] text-center text-on-surface-variant font-medium mt-1">
        By signing above, you agree to be legally bound to the terms and conditions of this lease agreement.
      </p>
    </div>
  );
}
