import type { Tables } from "@/lib/database.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  ExternalLink,
  FileText,
  MapPin,
  Edit,
  Car,
  ChevronDown,
} from "lucide-react";
import { Dialog, DialogPopup } from "@/components/ui/dialog";
import { useState } from "react";

interface VenueCardProps {
  venue: Tables<"venues">;
  onEdit: (venue: Tables<"venues">) => void;
}

export function VenueCard({ venue, onEdit }: VenueCardProps) {
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const images = venue.images || [];
  const heroImage = images[0] || null;
  const displayImage = hoveredImage || heroImage;

  // Update Map embed URL: z=10 for zoomed out
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(
    venue.location || ""
  )}&t=&z=8&ie=UTF8&iwloc=&output=embed`;

  const formatDriveTime = (minutes: number | null) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} mins`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} hr ${mins} mins`;
  };

  const driveTimeDisplay = formatDriveTime(venue.drive_time_minutes);

  const openImageModal = (imageUrl: string | null) => {
    if (!imageUrl) return;
    setSelectedImage(imageUrl);
    setIsImageOpen(true);
  };

  const closeImageModal = (open: boolean) => {
    setIsImageOpen(open);
    if (!open) setSelectedImage(null);
  };

  return (
    <div>
      <Card className="overflow-hidden flex flex-col pt-0 group/venue-card">
        {/* Hero Image Section */}
        <div>
          <div className="relative aspect-video w-full bg-gray-100">
            {displayImage ? (
              <button
                type="button"
                onClick={() => openImageModal(displayImage)}
                className="h-full w-full"
              >
                <img
                  src={displayImage}
                  alt={venue.name}
                  className="h-full w-full object-cover transition-all duration-300"
                />
                <span className="sr-only">Open image in modal</span>
              </button>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                No Hero Image
              </div>
            )}
            <div className="absolute top-4 left-4">
              <Badge
                className="text-white backdrop-blur-md border-0 shadow-sm"
                style={{ backgroundColor: venue.status_color || "" }}
                size="lg"
              >
                {venue.status || "Status Unknown"}
              </Badge>
            </div>
            <div className="absolute top-4 right-4">
              <Button
                size="icon"
                className="shadow-sm group-hover/venue-card:opacity-100 opacity-0 transition-opacity duration-300"
                onClick={() => onEdit(venue)}
                title="Edit Venue"
                variant="default"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Small Images - Shows up to 3 images after the hero */}
          <div className="grid grid-cols-3 gap-0.5 bg-white border-b">
            {[0, 1, 2].map((offset) => {
              const url = images[offset + 1];
              return (
                <button
                  type="button"
                  key={`small-img-${offset}`}
                  className={`aspect-square bg-gray-100 overflow-hidden relative w-full p-0 border-0 block ${
                    url ? "cursor-pointer" : "cursor-default"
                  }`}
                  onMouseEnter={() => url && setHoveredImage(url)}
                  onMouseLeave={() => setHoveredImage(null)}
                  onFocus={() => url && setHoveredImage(url)}
                  onBlur={() => setHoveredImage(null)}
                  onClick={() => openImageModal(url)}
                  disabled={!url}
                >
                  {url ? (
                    <img
                      src={url}
                      alt={`Gallery ${offset + 1}`}
                      className="h-full w-full object-cover "
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-gray-400 bg-slate-50">
                      {/* Empty slot */}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold">{venue.name}</CardTitle>

              {/* Location / Drive Time */}
              <div className="flex items-center text-muted-foreground text-sm h-6">
                {driveTimeDisplay ? (
                  <>
                    <Car className="h-4 w-4 mr-1.5" />
                    <span>{driveTimeDisplay} from Edinburgh</span>
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-1.5" />
                    <span>{venue.location}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                disabled={!venue.website_url}
                render={
                  venue.website_url ? (
                    <a
                      href={venue.website_url}
                      target="_blank"
                      rel="noreferrer"
                      title="Website"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : undefined
                }
              >
                {!venue.website_url && <ExternalLink className="h-4 w-4" />}
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full"
                disabled={!venue.brochure_url}
                render={
                  venue.brochure_url ? (
                    <a
                      href={venue.brochure_url}
                      target="_blank"
                      rel="noreferrer"
                      title="Brochure"
                    >
                      <FileText className="h-4 w-4" />
                    </a>
                  ) : undefined
                }
              >
                {!venue.brochure_url && <FileText className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 grow">
          {/* Pricing */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Saturday</div>
              <div className="font-semibold flex items-center justify-center text-sm">
                {venue.price_saturday ? (
                  <>
                    {venue.price_saturday === "Unavailable" ? "" : "£"}
                    {venue.price_saturday}
                  </>
                ) : (
                  "-"
                )}
              </div>
            </div>
            <div className="text-center border-l border-r border-slate-200">
              <div className="text-xs text-muted-foreground mb-1">Sunday</div>
              <div className="font-semibold flex items-center justify-center text-sm">
                {venue.price_sunday ? (
                  <>
                    {venue.price_sunday === "Unavailable" ? "" : "£"}
                    {venue.price_sunday}
                  </>
                ) : (
                  "-"
                )}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Mid-week</div>
              <div className="font-semibold flex items-center justify-center text-sm">
                {venue.price_midweek ? (
                  <>
                    {venue.price_midweek === "Unavailable" ? "" : "£"}
                    {venue.price_midweek}
                  </>
                ) : (
                  "-"
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {venue.notes && (
            <p className="text-sm italic text-muted-foreground whitespace-pre-line pl-4 border-l border-border">
              {venue.notes}
            </p>
          )}

          {/* Map Embed - Collapsible */}
          {venue.location && (
            <Collapsible
              open={isMapOpen}
              onOpenChange={setIsMapOpen}
              className="w-full"
            >
              <Button
                variant="ghost"
                className="w-full flex justify-between items-center group/map-toggle"
                onClick={() => setIsMapOpen(!isMapOpen)}
              >
                <span>{isMapOpen ? "Hide Map" : "Show Map"}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isMapOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
              <CollapsibleContent className="mt-2">
                <div className="aspect-square w-full rounded-md overflow-hidden border bg-slate-100">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={mapSrc}
                    title={`Map of ${venue.name}`}
                    className="filter grayscale-20 hover:grayscale-0 transition-all duration-500"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      <Dialog open={isImageOpen} onOpenChange={closeImageModal}>
        <DialogPopup className="sm:max-w-5xl bg-transparent border-none shadow-none p-0">
          {selectedImage && (
            <div className="bg-black/80 rounded-lg overflow-hidden">
              <img
                src={selectedImage}
                alt={venue.name}
                className="max-h-[80vh] w-full object-contain bg-black"
              />
            </div>
          )}
        </DialogPopup>
      </Dialog>
    </div>
  );
}
