"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, Upload, X, ZoomIn, ZoomOut, RotateCw, Check, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface AvatarUploadProps {
  currentAvatar?: string;
  userName?: string;
  onUpload: (file: File) => Promise<string>;
  maxSizeMB?: number;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatar,
  userName = "User",
  onUpload,
  maxSizeMB = 5,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, GIF, WebP)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      toast({
        title: "File too large",
        description: `Please select an image smaller than ${maxSizeMB}MB`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStart) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setDragStart(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragStart) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const cropImage = useCallback(async () => {
    if (!previewUrl || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const img = new Image();
    img.src = previewUrl;

    return new Promise<Blob | null>((resolve) => {
      img.onload = () => {
        const size = 300;
        canvas.width = size;
        canvas.height = size;

        // Clear canvas
        ctx.clearRect(0, 0, size, size);

        // Save context state
        ctx.save();

        // Move to center and apply transformations
        ctx.translate(size / 2, size / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom, zoom);
        ctx.translate(position.x, position.y);

        // Draw image centered
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // Restore context
        ctx.restore();

        // Create circular mask
        ctx.globalCompositeOperation = "destination-in";
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();

        canvas.toBlob((blob) => {
          resolve(blob);
        }, "image/jpeg", 0.95);
      };
    });
  }, [previewUrl, zoom, rotation, position]);

  const handleCropConfirm = async () => {
    setIsUploading(true);
    try {
      const croppedBlob = await cropImage();
      if (!croppedBlob) {
        throw new Error("Failed to crop image");
      }

      const croppedFile = new File([croppedBlob], selectedFile?.name || "avatar.jpg", {
        type: "image/jpeg",
      });

      const uploadedUrl = await onUpload(croppedFile);
      
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been successfully updated.",
      });

      setCropDialogOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetImage = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-32 w-32">
                <AvatarImage src={currentAvatar} alt={userName} />
                <AvatarFallback className="text-2xl">{getInitials(userName)}</AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 rounded-full shadow-lg"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload new avatar"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-semibold">{userName}</h3>
              <p className="text-sm text-muted-foreground">
                Click the camera icon to upload a new photo
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Select avatar image"
            />

            <Alert>
              <AlertDescription>
                Recommended: Square image, at least 400x400 pixels, max {maxSizeMB}MB
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Crop Your Avatar</DialogTitle>
            <DialogDescription>
              Adjust your image to fit perfectly in the circular frame
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div
              className="relative mx-auto h-[300px] w-[300px] overflow-hidden rounded-full bg-muted cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
            >
              {previewUrl && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${zoom})`,
                    transition: dragStart ? "none" : "transform 0.1s",
                  }}
                >
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-full max-w-full"
                    draggable={false}
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <ZoomIn className="h-4 w-4" />
                    Zoom
                  </Label>
                  <span className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
                </div>
                <Slider
                  value={[zoom]}
                  onValueChange={([value]) => setZoom(value)}
                  min={1}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <RotateCw className="h-4 w-4" />
                    Rotation
                  </Label>
                  <span className="text-sm text-muted-foreground">{rotation}°</span>
                </div>
                <Slider
                  value={[rotation]}
                  onValueChange={([value]) => setRotation(value)}
                  min={-180}
                  max={180}
                  step={1}
                  className="w-full"
                />
              </div>

              <Button
                variant="outline"
                onClick={resetImage}
                className="w-full"
              >
                Reset Image
              </Button>
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCropDialogOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button onClick={handleCropConfirm} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Avatar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Add missing Label import
import { Label } from "@/components/ui/label";