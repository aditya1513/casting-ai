"use client"

import React, { useState, useRef, useCallback } from "react"
import { Camera, Upload, X, Crop, RotateCw, ZoomIn, ZoomOut, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface AvatarUploadProps {
  currentAvatar?: string
  userName?: string
  onUpload?: (file: File, croppedImage: string) => Promise<void>
  className?: string
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatar,
  userName = "User",
  onUpload,
  className
}) => {
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [croppedImage, setCroppedImage] = useState<string | null>(null)
  const [showCropDialog, setShowCropDialog] = useState(false)
  const [cropSettings, setCropSettings] = useState({
    zoom: 1,
    rotation: 0,
    x: 0,
    y: 0
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, GIF, etc.)",
        variant: "destructive"
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      })
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
      setShowCropDialog(true)
    }
    reader.readAsDataURL(file)
  }

  const handleCrop = useCallback(() => {
    if (!previewUrl) return

    // Create a canvas to crop the image
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      // Set canvas size to desired crop size (square for avatar)
      const cropSize = 300
      canvas.width = cropSize
      canvas.height = cropSize

      // Apply transformations
      ctx.save()
      ctx.translate(cropSize / 2, cropSize / 2)
      ctx.rotate((cropSettings.rotation * Math.PI) / 180)
      ctx.scale(cropSettings.zoom, cropSettings.zoom)
      ctx.translate(-cropSize / 2, -cropSize / 2)

      // Calculate crop area
      const sourceSize = Math.min(img.width, img.height)
      const sourceX = (img.width - sourceSize) / 2 + cropSettings.x
      const sourceY = (img.height - sourceSize) / 2 + cropSettings.y

      // Draw cropped image
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        cropSize,
        cropSize
      )
      ctx.restore()

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedUrl = URL.createObjectURL(blob)
          setCroppedImage(croppedUrl)
          setShowCropDialog(false)
        }
      }, "image/jpeg", 0.9)
    }
    img.src = previewUrl
  }, [previewUrl, cropSettings])

  const handleUpload = async () => {
    if (!selectedFile || !croppedImage) return

    setIsUploading(true)
    try {
      // Convert cropped image URL to File
      const response = await fetch(croppedImage)
      const blob = await response.blob()
      const croppedFile = new File([blob], selectedFile.name, { type: "image/jpeg" })

      if (onUpload) {
        await onUpload(croppedFile, croppedImage)
        toast({
          title: "Avatar updated",
          description: "Your profile picture has been successfully updated.",
        })
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  const resetUpload = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setCroppedImage(null)
    setCropSettings({ zoom: 1, rotation: 0, x: 0, y: 0 })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            {/* Avatar Display */}
            <div className="relative">
              <Avatar className="h-32 w-32">
                <AvatarImage 
                  src={croppedImage || currentAvatar} 
                  alt={userName}
                />
                <AvatarFallback className="text-2xl">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
                aria-label="Change avatar"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            {/* Upload Controls */}
            <div className="flex flex-col items-center space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Select avatar image"
              />
              
              {!croppedImage ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Image
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetUpload}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleUpload}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>Uploading...</>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Save Avatar
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground text-center">
                Recommended: Square image, at least 400x400px
                <br />
                Max file size: 5MB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Crop Dialog */}
      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
            <DialogDescription>
              Adjust the image to fit perfectly as your avatar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview Area */}
            <div className="relative h-64 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
              {previewUrl && (
                <div 
                  className="relative"
                  style={{
                    transform: `scale(${cropSettings.zoom}) rotate(${cropSettings.rotation}deg) translate(${cropSettings.x}px, ${cropSettings.y}px)`,
                    transition: "transform 0.1s ease-out"
                  }}
                >
                  <img
                    src={previewUrl}
                    alt="Crop preview"
                    className="max-h-64 max-w-full"
                  />
                  <div className="absolute inset-0 border-2 border-primary/50 rounded-full pointer-events-none" />
                </div>
              )}
            </div>

            {/* Crop Controls */}
            <div className="space-y-3">
              {/* Zoom Control */}
              <div className="flex items-center space-x-3">
                <ZoomOut className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={[cropSettings.zoom]}
                  onValueChange={([value]) => setCropSettings(prev => ({ ...prev, zoom: value }))}
                  min={1}
                  max={3}
                  step={0.1}
                  className="flex-1"
                  aria-label="Zoom level"
                />
                <ZoomIn className="h-4 w-4 text-muted-foreground" />
              </div>

              {/* Rotation Control */}
              <div className="flex items-center space-x-3">
                <RotateCw className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={[cropSettings.rotation]}
                  onValueChange={([value]) => setCropSettings(prev => ({ ...prev, rotation: value }))}
                  min={-180}
                  max={180}
                  step={1}
                  className="flex-1"
                  aria-label="Rotation angle"
                />
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {cropSettings.rotation}°
                </span>
              </div>

              {/* Position Controls */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Horizontal</label>
                  <Slider
                    value={[cropSettings.x]}
                    onValueChange={([value]) => setCropSettings(prev => ({ ...prev, x: value }))}
                    min={-100}
                    max={100}
                    step={1}
                    aria-label="Horizontal position"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Vertical</label>
                  <Slider
                    value={[cropSettings.y]}
                    onValueChange={([value]) => setCropSettings(prev => ({ ...prev, y: value }))}
                    min={-100}
                    max={100}
                    step={1}
                    aria-label="Vertical position"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCropDialog(false)
                resetUpload()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCrop}>
              <Crop className="h-4 w-4 mr-2" />
              Apply Crop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}