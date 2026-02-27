// src/components/settings/EditHospitalProfile.tsx

"use client";

import { useEffect, useState, FormEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchHospitalProfile, updateHospitalProfile } from "@/store/slices/hospitalProfileSlice";
import { fetchHospitalInfo } from "@/store/slices/authSlice";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import { InfinitySpin } from "react-loader-spinner";

export default function EditHospitalProfile() {
  const dispatch = useDispatch<AppDispatch>();
  const { profile, status } = useSelector((state: RootState) => state.hospitalProfile);

  const [formData, setFormData] = useState(profile);

  useEffect(() => {
    // Fetch profile only if it hasn't been fetched yet
    if (!profile) {
      dispatch(fetchHospitalProfile());
    }
  }, [dispatch, profile]);

  useEffect(() => {
    // Update local form state when Redux profile data is loaded
    setFormData(profile);
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    // We only send the fields that are updatable
    const { name, phone_number, country, address, time_zone, primary_language, header_text, tagline, description, sidebar_color, header_color } = formData;

    toast.promise(
      dispatch(updateHospitalProfile({ name, phone_number, country, address, time_zone, primary_language, header_text, tagline, description, sidebar_color, header_color })).unwrap()
        .then((res) => {
          dispatch(fetchHospitalInfo());
          return res;
        }),
      {
        loading: 'Updating profile...',
        success: 'Profile updated successfully!',
        error: (err) => err || 'Failed to update profile.'
      }
    );
  };

  if (status === 'loading' && !profile) {
    return <div className="flex justify-center p-10"><InfinitySpin color="#388fe5" /></div>;
  }

  if (!formData) {
    return <div className="text-center p-10">Could not load hospital profile.</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Edit Hospital Profile</CardTitle>
          <CardDescription>
            Update your hospital's public and internal information here.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1 */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Hospital Name</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input id="phone_number" name="phone_number" value={formData.phone_number} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" value={formData.address} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" name="country" value={formData.country} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="tagline">Tagline</Label>
              <Input id="tagline" name="tagline" value={formData.tagline} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" value={formData.description} onChange={handleChange} />
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="time_zone">Time Zone</Label>
              <Input id="time_zone" name="time_zone" value={formData.time_zone} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="primary_language">Primary Language</Label>
              <Input id="primary_language" name="primary_language" value={formData.primary_language} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="header_text">Header Text</Label>
              <Input id="header_text" name="header_text" value={formData.header_text} onChange={handleChange} />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="sidebar_color">Sidebar Color</Label>
                <Input id="sidebar_color" name="sidebar_color" type="color" value={formData.sidebar_color} onChange={handleChange} className="p-1 h-10" />
              </div>
              <div className="flex-1">
                <Label htmlFor="header_color">Header Color</Label>
                <Input id="header_color" name="header_color" type="color" value={formData.header_color} onChange={handleChange} className="p-1 h-10" />
              </div>
            </div>
            <div>
              <Label>Hospital Code</Label>
              <Input value={formData.code} disabled />
            </div>
            <div>
              <Label>Admin Email</Label>
              <Input value={formData.email} disabled />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="bg-blue-500" disabled={status === 'loading'}>
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}