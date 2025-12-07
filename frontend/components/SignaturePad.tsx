"use client";

import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Pen, Eraser, Download, Upload, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { signatureApi } from "@/app/_apis/signatureApi";
import toast from "react-hot-toast";

interface SignaturePadProps {
  onSave?: (signature: string) => void;
}

export default function SignaturePad({ onSave }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [existingSignature, setExistingSignature] = useState<string | null>(null);

  // Fetch existing signature on mount
  useEffect(() => {
    const fetchSignature = async () => {
      setIsLoading(true);
      try {
        const response = await signatureApi.hasSignature();
        if (response.has_signature && response.signature_url) {
          const fullUrl = signatureApi.getSignatureUrl(response.signature_url);
          setExistingSignature(fullUrl);
        }
      } catch (error) {
        console.log("No existing signature found");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignature();
  }, []);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;

    // Set drawing styles
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Load existing signature if available
    if (existingSignature) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasSignature(true);
        setIsSaved(true);
      };
      img.onerror = () => {
        console.error("Failed to load signature image");
      };
      img.src = existingSignature;
    }
  }, [existingSignature]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    setIsSaved(false);

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setIsSaved(false);
    setExistingSignature(null);
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsUploading(true);
    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, "image/png");
      });

      // Create file from blob
      const file = new File([blob], "signature.png", { type: "image/png" });

      // Upload to backend
      const response = await signatureApi.uploadSignature(file);

      const signatureUrl = signatureApi.getSignatureUrl(response.signature.signature_file_path);
      setExistingSignature(signatureUrl);
      setIsSaved(true);

      if (onSave) {
        onSave(signatureUrl);
      }

      toast.success("Signature saved successfully!");
    } catch (error: any) {
      console.error("Failed to save signature:", error);
      toast.error(error.response?.data?.detail || "Failed to save signature");
    } finally {
      setIsUploading(false);
    }
  };

  const deleteSignature = async () => {
    if (!confirm("Are you sure you want to delete your signature?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await signatureApi.deleteSignature();

      // Clear canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }

      setExistingSignature(null);
      setHasSignature(false);
      setIsSaved(false);

      toast.success("Signature deleted successfully!");
    } catch (error: any) {
      console.error("Failed to delete signature:", error);
      toast.error(error.response?.data?.detail || "Failed to delete signature");
    } finally {
      setIsDeleting(false);
    }
  };

  const downloadSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const signatureData = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = "signature.png";
    link.href = signatureData;
    link.click();
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="bg-gradient-to-r from-[#388fe5]/10 to-transparent">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#388fe5] rounded-lg">
              <Pen className="h-4 w-4 text-white" />
            </div>
            <CardTitle>Electronic Signature</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#388fe5]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="bg-gradient-to-r from-[#388fe5]/10 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#388fe5] rounded-lg">
              <Pen className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle>Electronic Signature</CardTitle>
              <CardDescription>
                Draw your signature below. It will be used for official documents.
              </CardDescription>
            </div>
          </div>
          {existingSignature && (
            <Button
              onClick={deleteSignature}
              disabled={isDeleting}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Canvas */}
          <div className="relative">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg cursor-crosshair bg-white hover:border-[#388fe5] transition-colors"
              style={{ touchAction: "none", height: "200px" }}
            />
            {!hasSignature && !existingSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-gray-400 text-sm">Sign here</p>
              </div>
            )}
          </div>

          {/* Status Badge */}
          {isSaved && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-[#388fe5]" />
              <span className="text-sm font-medium text-green-700">Signature saved successfully</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={clearSignature}
              variant="outline"
              disabled={!hasSignature}
              className="flex-1 sm:flex-none"
            >
              <Eraser className="w-4 h-4 mr-2" />
              Clear
            </Button>
            <Button
              onClick={downloadSignature}
              variant="outline"
              disabled={!hasSignature}
              className="flex-1 sm:flex-none"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={saveSignature}
              disabled={!hasSignature || isUploading}
              className="flex-1 sm:flex-none bg-[#388fe5] hover:bg-[#6fb043] text-white"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Save Signature
                </>
              )}
            </Button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Instructions:</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Use your mouse or touchscreen to draw your signature</li>
              <li>Click "Clear" to start over if needed</li>
              <li>Click "Save Signature" to store your signature</li>
              <li>You can download your signature as an image</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
