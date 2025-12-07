"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, PenLine, X } from "lucide-react";
import { documentSigningApi, DocumentType } from "@/app/_apis/documentSigningApi";
import { signatureApi } from "@/app/_apis/signatureApi";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface DocumentSignButtonProps {
  documentType: DocumentType;
  documentId: number;
  isSigned: boolean;
  signedAt?: string | null;
  signedByName?: string | null;
  onSignatureChange: () => void;
  className?: string;
}

export default function DocumentSignButton({
  documentType,
  documentId,
  isSigned,
  signedAt,
  signedByName,
  onSignatureChange,
  className = ""
}: DocumentSignButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSign = async () => {
    setLoading(true);
    try {
      // First check if user has a signature
      const hasSignatureResponse = await signatureApi.hasSignature();

      if (!hasSignatureResponse.has_signature) {
        toast.error("Please upload your signature first");
        if (confirm("You need to upload your signature first. Go to profile page?")) {
          router.push("/doctor/profile");
        }
        return;
      }

      // Sign the document
      await documentSigningApi.signDocument(documentType, documentId);

      toast.success("Document signed successfully!");
      onSignatureChange();
    } catch (error: any) {
      console.error("Failed to sign document:", error);

      if (error.response?.data?.detail?.includes("upload your e-signature")) {
        toast.error("Please upload your signature first");
        if (confirm("You need to upload your signature first. Go to profile page?")) {
          router.push("/doctor/profile");
        }
      } else {
        toast.error(error.response?.data?.detail || "Failed to sign document");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Are you sure you want to remove your signature from this document?")) {
      return;
    }

    setLoading(true);
    try {
      await documentSigningApi.removeSignature(documentType, documentId);

      toast.success("Signature removed successfully");
      onSignatureChange();
    } catch (error: any) {
      console.error("Failed to remove signature:", error);
      toast.error(error.response?.data?.detail || "Failed to remove signature");
    } finally {
      setLoading(false);
    }
  };

  if (isSigned) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-[#388fe5]" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900">Signed</p>
            {signedByName && (
              <p className="text-xs text-green-700">by {signedByName}</p>
            )}
            {signedAt && (
              <p className="text-xs text-[#388fe5]">
                {new Date(signedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <Button
          onClick={handleRemove}
          disabled={loading}
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Removing...
            </>
          ) : (
            <>
              <X className="w-4 h-4 mr-2" />
              Remove Signature
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleSign}
      disabled={loading}
      className={`bg-[#388fe5] hover:bg-[#6fb043] text-white ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Signing...
        </>
      ) : (
        <>
          <PenLine className="w-4 h-4 mr-2" />
          Sign Document
        </>
      )}
    </Button>
  );
}
