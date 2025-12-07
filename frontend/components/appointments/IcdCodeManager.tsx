"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { X, Plus, Loader2, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  getAppointmentIcdCodes,
  addAppointmentIcdCodes,
  removeAppointmentIcdCode,
  AppointmentIcdCode,
} from "@/app/_apis/appointmentIcdCodes";
import { searchIcdCodes } from "@/app/_apis/staff/receptionist";

interface IcdCodeManagerProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: number;
  appointmentDetails?: {
    patientName: string;
    date: string;
  };
}

interface IcdCode {
  id: number;
  code: string;
  description: string;
}

export function IcdCodeManager({ isOpen, onClose, appointmentId, appointmentDetails }: IcdCodeManagerProps) {
  const [currentCodes, setCurrentCodes] = useState<AppointmentIcdCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<IcdCode[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCurrentCodes();
    }
  }, [isOpen, appointmentId]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setShowSearchResults(true);
    const handler = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchIcdCodes(searchQuery);
        setSearchResults(results);
      } catch (error) {
        toast.error("Failed to search ICD codes");
        setShowSearchResults(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadCurrentCodes = async () => {
    setLoading(true);
    try {
      const codes = await getAppointmentIcdCodes(appointmentId);
      setCurrentCodes(codes);
    } catch (error: any) {
      toast.error(error.message || "Failed to load ICD codes");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCode = async (code: IcdCode) => {
    // Check if already added
    if (currentCodes.find(c => c.icd_code_id === code.id)) {
      toast.error("This ICD code is already added");
      return;
    }

    setSaving(true);
    try {
      const updatedCodes = await addAppointmentIcdCodes(appointmentId, {
        icd_code_ids: [code.id]
      });
      setCurrentCodes(updatedCodes);
      setSearchQuery("");
      setShowSearchResults(false);
      toast.success(`Added ${code.code}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to add ICD code");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCode = async (icdCodeId: number, code: string) => {
    setRemoving(icdCodeId);
    try {
      const updatedCodes = await removeAppointmentIcdCode(appointmentId, {
        icd_code_id: icdCodeId
      });
      setCurrentCodes(updatedCodes);
      toast.success(`Removed ${code}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to remove ICD code");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage ICD-10 Codes</DialogTitle>
          {appointmentDetails && (
            <div className="text-sm text-gray-600 mt-2">
              <p><strong>Patient:</strong> {appointmentDetails.patientName}</p>
              <p><strong>Date:</strong> {appointmentDetails.date}</p>
            </div>
          )}
        </DialogHeader>

        {/* Current ICD Codes */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Current ICD Codes ({currentCodes.length})</Label>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : currentCodes.length === 0 ? (
            <Card className="p-6 text-center text-gray-500">
              <p className="text-sm">No ICD codes assigned yet</p>
              <p className="text-xs mt-1">Search and add codes below</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {currentCodes.map((item) => (
                <Card key={item.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono">
                          {item.icd_code.code}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Added {new Date(item.added_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {item.icd_code.description}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveCode(item.icd_code_id, item.icd_code.code)}
                      disabled={removing === item.icd_code_id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {removing === item.icd_code_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Add New ICD Code */}
        <div className="space-y-3 pt-4 border-t">
          <Label className="text-base font-semibold">Add New ICD Code</Label>

          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by code or description (e.g., 'diabetes', 'E11')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoComplete="off"
              />
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center flex items-center justify-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Searching...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div>
                    {searchResults.map((code) => {
                      const isAdded = currentCodes.find(c => c.icd_code_id === code.id);
                      return (
                        <div
                          key={code.id}
                          className={`p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${isAdded ? 'bg-gray-50 opacity-60' : ''
                            }`}
                          onClick={() => !isAdded && handleAddCode(code)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {code.code}
                                </Badge>
                                {isAdded && (
                                  <span className="text-xs text-[#388fe5] font-medium">
                                    ✓ Already Added
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-700">{code.description}</p>
                            </div>
                            {!isAdded && (
                              <Plus className="h-4 w-4 text-[#388fe5] flex-shrink-0 mt-1" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No results found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500">
            Type at least 2 characters to search. Click on a result to add it.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
