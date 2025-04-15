
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBookingsByType, updateBookingStatus } from "@/services/bookingService";
import { BookingType, Booking } from "@/models/booking";
import { useToast } from "@/hooks/use-toast";
import { Search, TruckIcon, CheckCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useIsMobile } from "@/hooks/use-mobile";

const Dispatch = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const destinations = useAppSelector(state => state.booking.destinations);
  const isMobile = useIsMobile();

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      // Get both PAID and TO_PAY bookings
      const paidBookings = await getBookingsByType(BookingType.PAID);
      const toPayBookings = await getBookingsByType(BookingType.TO_PAY);
      
      // Combine and filter to only show "Booked" status (not dispatched)
      const allBookings = [...paidBookings, ...toPayBookings]
        .filter(booking => booking.status === "Booked");
      
      setBookings(allBookings);
      setFilteredBookings(allBookings);
    } catch (error) {
      console.error("Error loading bookings:", error);
      toast({
        title: "Error",
        description: "Failed to load bookings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    filterBookings();
  }, [selectedDestination, search, bookings]);

  const filterBookings = () => {
    let filtered = [...bookings];
    
    if (selectedDestination && selectedDestination !== "all") {
      filtered = filtered.filter(booking => booking.deliveryDestination === selectedDestination);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.id.toLowerCase().includes(searchLower) ||
        booking.consigneeName.toLowerCase().includes(searchLower) ||
        booking.consigneeMobile.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredBookings(filtered);
  };

  const handleDispatch = async (bookingId: string) => {
    setProcessing(prev => ({ ...prev, [bookingId]: true }));
    
    try {
      await updateBookingStatus(bookingId, "Dispatched", "dispatchDate");
      
      // Update local state
      const updatedBookings = bookings.filter(booking => booking.id !== bookingId);
      setBookings(updatedBookings);
      
      toast({
        title: "Success",
        description: `Booking ${bookingId} has been dispatched`,
      });
    } catch (error) {
      console.error("Error dispatching booking:", error);
      toast({
        title: "Error",
        description: "Failed to dispatch booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const resetFilters = () => {
    setSelectedDestination("all");
    setSearch("");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dispatch</h1>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dispatch Filters</CardTitle>
          <CardDescription>
            Filter bookings for dispatch by destination or search terms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-3 gap-4'}`}>
            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <Select
                value={selectedDestination}
                onValueChange={setSelectedDestination}
              >
                <SelectTrigger id="destination">
                  <SelectValue placeholder="All Destinations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Destinations</SelectItem>
                  {destinations.map((destination, index) => (
                    <SelectItem key={index} value={destination}>
                      {destination}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="flex">
                <Input
                  id="search"
                  placeholder="Search by LR No., Name, or Mobile"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-r-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-l-none border-l-0"
                >
                  <Search size={18} />
                </Button>
              </div>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={resetFilters}
                className="w-full"
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Pending Dispatch</CardTitle>
              <CardDescription>
                Bookings ready to be dispatched: {filteredBookings.length}
              </CardDescription>
            </div>
            <Button 
              onClick={loadBookings} 
              variant="outline"
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <p>Loading bookings...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No bookings found matching the filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-2 text-left">LR No.</th>
                    <th className="py-3 px-2 text-left">Date</th>
                    <th className="py-3 px-2 text-left hidden md:table-cell">From</th>
                    <th className="py-3 px-2 text-left">To</th>
                    <th className="py-3 px-2 text-left hidden md:table-cell">Consignee</th>
                    <th className="py-3 px-2 text-left hidden md:table-cell">Type</th>
                    <th className="py-3 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium">{booking.id}</td>
                      <td className="py-3 px-2">{booking.bookingDate}</td>
                      <td className="py-3 px-2 hidden md:table-cell">{booking.consignorName}</td>
                      <td className="py-3 px-2">{booking.deliveryDestination}</td>
                      <td className="py-3 px-2 hidden md:table-cell">{booking.consigneeName}</td>
                      <td className="py-3 px-2 hidden md:table-cell">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          booking.bookingType === BookingType.PAID ? 
                          "bg-green-100 text-green-800" : 
                          "bg-blue-100 text-blue-800"
                        }`}>
                          {booking.bookingType}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-brand-primary hover:bg-brand-primary/90"
                          onClick={() => handleDispatch(booking.id)}
                          disabled={processing[booking.id]}
                        >
                          {processing[booking.id] ? (
                            "Processing..."
                          ) : (
                            <>
                              <TruckIcon size={16} className="mr-1" /> Dispatch
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dispatch;
