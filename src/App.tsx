import { useEffect, useState, useCallback } from "react";
import type { Tables } from "@/lib/database.types";
import supabase from "@/lib/supabase";
import { VenueCard } from "@/components/VenueCard";
import { VenueForm } from "@/components/VenueForm";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortOption = "alphabetic" | "distance" | "price_saturday";
const sortOptions: { label: string; value: SortOption }[] = [
  { label: "Alphabetic", value: "alphabetic" },
  { label: "Distance", value: "distance" },
  { label: "Price (Saturday)", value: "price_saturday" },
];

function App() {
  const [venues, setVenues] = useState<Tables<"venues">[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editingVenue, setEditingVenue] = useState<
    Tables<"venues"> | undefined
  >(undefined);
  const [sortOption, setSortOption] = useState<SortOption>("alphabetic");

  const fetchVenues = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("venues").select("*");

      if (error) throw error;
      setVenues(data || []);
    } catch (error) {
      console.error("Error fetching venues:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  const sortedVenues = [...venues].sort((a, b) => {
    if (sortOption === "alphabetic") {
      return (a.name || "").localeCompare(b.name || "");
    }
    if (sortOption === "distance") {
      const distA = a.drive_time_minutes ?? Infinity;
      const distB = b.drive_time_minutes ?? Infinity;
      return distA - distB;
    }
    if (sortOption === "price_saturday") {
      const getPrice = (p: string | null) => {
        if (!p || p === "Unavailable") return Infinity;
        // Remove commas and find the first number (handles "1,200" or "1000-2000")
        const match = p.replace(/,/g, "").match(/(\d+)/);
        return match ? parseInt(match[1], 10) : Infinity;
      };
      return getPrice(a.price_saturday) - getPrice(b.price_saturday);
    }
    return 0;
  });

  const handleEdit = (venue: Tables<"venues">) => {
    setEditingVenue(venue);
    setView("edit");
  };

  const handleCreate = () => {
    setEditingVenue(undefined);
    setView("create");
  };

  const handleSave = () => {
    fetchVenues();
    setView("list");
    setEditingVenue(undefined);
  };

  const handleCancel = () => {
    setView("list");
    setEditingVenue(undefined);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Wedding Venues</h1>
          </div>
          {view === "list" && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select
                items={sortOptions}
                onValueChange={setSortOption}
                value={sortOption}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Venue
              </Button>
            </div>
          )}
        </header>

        <main>
          {view === "list" ? (
            loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : venues.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-lg border border-dashed">
                <h3 className="text-lg font-medium text-slate-900">
                  No venues yet
                </h3>
                <p className="text-slate-500 mb-4">
                  Start by adding a venue to your list
                </p>
                <Button onClick={handleCreate}>Add Venue</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {sortedVenues.map((venue) => (
                  <VenueCard key={venue.id} venue={venue} onEdit={handleEdit} />
                ))}
              </div>
            )
          ) : (
            <div className="max-w-2xl mx-auto">
              <VenueForm
                initialData={editingVenue}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
