import { useState } from "react";
import { useDropzone } from "react-dropzone";
import type { Tables, TablesInsert } from "@/lib/database.types";
import supabase from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, X, Sparkles, Trash2, ArrowUp, ArrowDown } from "lucide-react";

interface VenueFormProps {
  initialData?: Partial<Tables<"venues">>;
  onSave: () => void;
  onCancel: () => void;
}

export function VenueForm({ initialData, onSave, onCancel }: VenueFormProps) {
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const MAX_IMAGES = 10;
  const [formData, setFormData] = useState<Partial<Tables<"venues">>>({
    name: "",
    location: "",
    website_url: "",
    brochure_url: "",
    price_saturday: "",
    price_sunday: "",
    price_midweek: "",
    status: "Pending",
    status_color: "#64748b",
    notes: "",
    drive_time_minutes: null,
    ...initialData,
    active: initialData?.active ?? true,
    images: initialData?.images || [],
  });

  const PREDEFINED_COLORS = [
    "#64748b", // Slate
    "#3b82f6", // Blue
    "#22c55e", // Green
    "#eab308", // Yellow
    "#ef4444", // Red
  ];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Helper to calculate drive time
  const calculateDriveTime = async (
    destination: string
  ): Promise<number | null> => {
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) return null;

      const response = await fetch(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "routes.duration",
          },
          body: JSON.stringify({
            origin: {
              address: "Edinburgh Airport",
            },
            destination: {
              address: destination,
            },
            travelMode: "DRIVE",
            routingPreference: "TRAFFIC_AWARE",
          }),
        }
      );

      if (!response.ok) return null;

      const data = await response.json();

      if (data.routes && data.routes.length > 0 && data.routes[0].duration) {
        // Duration comes as "1234s"
        const durationSeconds = parseInt(
          data.routes[0].duration.replace("s", ""),
          10
        );
        return Math.round(durationSeconds / 60);
      }
    } catch (error) {
      console.error("Failed to calculate drive time", error);
    }
    return null;
  };

  const handleAutoFillLocation = async () => {
    if (!formData.name) return;
    setSearching(true);

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        alert("Google Maps API Key is missing");
        return;
      }

      // First: Text Search to get Place ID
      const searchResponse = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "places.formattedAddress",
          },
          body: JSON.stringify({
            textQuery: formData.name,
          }),
        }
      );

      if (!searchResponse.ok) throw new Error("Places Search failed");

      const searchData = await searchResponse.json();

      if (searchData.places && searchData.places.length > 0) {
        const place = searchData.places[0];
        const location = place.formattedAddress;
        setFormData((prev) => ({ ...prev, location }));
      } else {
        alert("No location found for this venue name");
      }
    } catch (error) {
      console.error("Failed to auto-fill location", error);
      alert("Failed to find location");
    } finally {
      setSearching(false);
    }
  };

  const uploadImages = async (files: File[]) => {
    if (files.length === 0) return;

    const currentImages = formData.images || [];
    if (currentImages.length >= MAX_IMAGES) {
      alert(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }

    const remainingSlots = MAX_IMAGES - currentImages.length;
    const filesToUpload = files.slice(0, remainingSlots);

    setLoading(true);
    try {
      const newImageUrls: string[] = [];
      for (const file of filesToUpload) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()
          .toString(36)
          .substring(2, 15)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("images").getPublicUrl(filePath);
        newImageUrls.push(data.publicUrl);
      }

      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images || []), ...newImageUrls],
      }));
    } catch (error) {
      console.error("Error uploading images:", error);
      alert("Error uploading images");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (acceptedFiles: File[]) => {
    uploadImages(acceptedFiles);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const pastedFiles = Array.from(event.clipboardData.files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (pastedFiles.length === 0) return;

    event.preventDefault();
    uploadImages(pastedFiles);
  };

  const imageCount = formData.images?.length || 0;
  const isMaxed = imageCount >= MAX_IMAGES;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: { "image/*": [] },
    multiple: true,
    disabled: loading || isMaxed,
  });

  const handleBrochureUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    try {
      setLoading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()
        .toString(36)
        .substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("brochures")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("brochures")
        .getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, brochure_url: data.publicUrl }));
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading file");
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index),
    }));
  };

  const moveImage = (index: number, direction: "up" | "down") => {
    const images = [...(formData.images || [])];
    if (direction === "up") {
      if (index === 0) return;
      [images[index], images[index - 1]] = [images[index - 1], images[index]];
    } else {
      if (index === images.length - 1) return;
      [images[index], images[index + 1]] = [images[index + 1], images[index]];
    }
    setFormData((prev) => ({ ...prev, images }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calculate drive time if location has changed or if it's a new record and we have a location
      let driveTime = formData.drive_time_minutes;
      const locationChanged = formData.location !== initialData?.location;
      const isNew = !formData.id;

      if (formData.location && (locationChanged || isNew)) {
        const calculatedTime = await calculateDriveTime(formData.location);
        if (calculatedTime !== null) {
          driveTime = calculatedTime;
        }
      }

      const dataToSave = {
        ...formData,
        active: formData.active ?? true,
        drive_time_minutes: driveTime,
      };

      if (formData.id) {
        const { error } = await supabase
          .from("venues")
          .update(dataToSave)
          .eq("id", formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("venues")
          .insert([dataToSave as TablesInsert<"venues">]);
        if (error) throw error;
      }
      onSave();
    } catch (error) {
      console.error("Error saving venue:", error);
      alert("Error saving venue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 border p-4 rounded-md bg-white shadow-sm"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          {formData.id ? "Edit Venue" : "Add Venue"}
        </h2>
        <Button variant="ghost" size="icon" onClick={onCancel} type="button">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Venue Name</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="e.g. The Balmoral Hotel"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location (Address or Coordinates)</Label>
          <div className="flex gap-2">
            <Input
              id="location"
              name="location"
              value={formData.location || ""}
              onChange={handleChange}
              required
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleAutoFillLocation}
              disabled={searching || !formData.name}
              title="Auto-fill location from Google Places"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 text-yellow-500" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website_url">Website URL</Label>
          <Input
            id="website_url"
            name="website_url"
            value={formData.website_url || ""}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Label htmlFor="status">Status</Label>
            <div className="flex gap-2 items-center bg-slate-50 p-1 rounded-md border">
              {PREDEFINED_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-3 h-3 rounded-full transition-transform hover:scale-125 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-slate-400 ${
                    formData.status_color === color
                      ? "ring-1 ring-offset-1 ring-slate-900 scale-125"
                      : ""
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, status_color: color }))
                  }
                  title={color}
                />
              ))}
            </div>
          </div>
          <Input
            id="status"
            name="status"
            value={formData.status || ""}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md border bg-slate-50 px-4 py-3">
        <div className="space-y-1">
          <Label htmlFor="active">Venue visibility</Label>
          <p className="text-sm text-muted-foreground">
            Inactive venues stay saved but are hidden from the list by default.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Inactive</span>
          <Switch
            id="active"
            checked={formData.active ?? true}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, active: checked }))
            }
          />
          <span className="text-sm text-muted-foreground">Active</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">
            Images ({`${imageCount}/${MAX_IMAGES}`})
          </h3>
          <div className="text-sm text-muted-foreground">
            First image is Hero
          </div>
        </div>

        <div className="space-y-4">
          <div
            {...getRootProps({
              onPaste: handlePaste,
              className: `flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center transition-colors ${
                isDragActive
                  ? "border-blue-400 bg-blue-50"
                  : "border-slate-200 bg-slate-50"
              } ${isMaxed ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-slate-400"}`,
            })}
          >
            <input {...getInputProps()} />
            <div className="text-sm font-medium">
              {isDragActive
                ? "Drop images to upload"
                : "Drop images here, click to browse, or paste (⌘/Ctrl + V)"}
            </div>
            <div className="text-xs text-muted-foreground">
              {loading ? "Uploading..." : `${imageCount}/${MAX_IMAGES} images`}
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            {formData.images?.map((url, index) => (
              <div key={url} className="group relative flex flex-col items-center">
                <div className="aspect-square rounded-lg overflow-hidden border bg-slate-50 mb-2 relative">
                  <img
                    src={url}
                    alt={`Venue ${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {index === 0 && (
                    <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                      Hero
                    </div>
                  )}
                </div>

                <ButtonGroup >
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => moveImage(index, "up")}
                    disabled={index === 0}
                    title="Move earlier"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => moveImage(index, "down")}
                    disabled={index === (formData.images?.length || 0) - 1}
                    title="Move later"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => removeImage(index)}
                    title="Remove image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </ButtonGroup>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Brochure</Label>
        <Input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleBrochureUpload}
        />
        {formData.brochure_url && (
          <a
            href={formData.brochure_url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline text-sm"
          >
            View Current Brochure
          </a>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">Pricing (GBP)</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="price_saturday">Saturday</Label>
            <Input
              id="price_saturday"
              name="price_saturday"
              value={formData.price_saturday || ""}
              onChange={handleChange}
              placeholder="e.g. 5000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price_sunday">Sunday</Label>
            <Input
              id="price_sunday"
              name="price_sunday"
              value={formData.price_sunday || ""}
              onChange={handleChange}
              placeholder="e.g. 4000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price_midweek">Mid-week</Label>
            <Input
              id="price_midweek"
              name="price_midweek"
              value={formData.price_midweek || ""}
              onChange={handleChange}
              placeholder="e.g. 3000"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes || ""}
          onChange={handleChange}
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Venue
        </Button>
      </div>
    </form>
  );
}
