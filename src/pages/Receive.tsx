"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getBookingsByType, updateBookingStatus, getBookingById } from "@/services/bookingService"
import { BookingType, type Booking } from "@/models/booking"
import { useToast } from "@/hooks/use-toast"
import { Search, Package, Eye, FileDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAppSelector } from "@/hooks/useAppSelector"
import { useIsMobile } from "@/hooks/use-mobile"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { downloadInvoicePDF, viewInvoicePDF } from "@/utils/pdfGenerator"

const Receive = () => {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [selectedDestination, setSelectedDestination] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [processing, setProcessing] = useState<Record<string, boolean>>({})
  const [isPdfLoading, setIsPdfLoading] = useState(false)
  const [lrNumber, setLrNumber] = useState("")
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const { toast } = useToast()
  const destinations = useAppSelector((state) => state.booking.destinations)
  const isMobile = useIsMobile()

  useEffect(() => {
    loadBookings()
  }, [])

  const loadBookings = async () => {
    setIsLoading(true)
    try {
      // Get both PAID and TO_PAY bookings
      const paidBookings = await getBookingsByType(BookingType.PAID)
      const toPayBookings = await getBookingsByType(BookingType.TO_PAY)

      // Combine and filter to only show "Dispatched" or "In Transit" status
      const allBookings = [...paidBookings, ...toPayBookings].filter(
        (booking) => booking.status === "Dispatched" || booking.status === "In Transit",
      )

      setBookings(allBookings)
      setFilteredBookings(allBookings)
    } catch (error) {
      console.error("Error loading bookings:", error)
      toast({
        title: "Error",
        description: "Failed to load bookings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    filterBookings()
  }, [selectedDestination, search, bookings])

  const filterBookings = () => {
    let filtered = [...bookings]

    if (selectedDestination && selectedDestination !== "all") {
      filtered = filtered.filter((booking) => booking.deliveryDestination === selectedDestination)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (booking) =>
          booking.id.toLowerCase().includes(searchLower) ||
          booking.consigneeName.toLowerCase().includes(searchLower) ||
          booking.consigneeMobile.toLowerCase().includes(searchLower),
      )
    }

    setFilteredBookings(filtered)
  }

  const handleReceive = async (bookingId: string) => {
    setProcessing((prev) => ({ ...prev, [bookingId]: true }))

    try {
      await updateBookingStatus(bookingId, "Received", "receiveDate")

      // Update local state
      const updatedBookings = bookings.filter((booking) => booking.id !== bookingId)
      setBookings(updatedBookings)

      toast({
        title: "Success",
        description: `Booking ${bookingId} has been received`,
      })
    } catch (error) {
      console.error("Error receiving booking:", error)
      toast({
        title: "Error",
        description: "Failed to mark booking as received. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessing((prev) => ({ ...prev, [bookingId]: false }))
    }
  }

  const resetFilters = () => {
    setSelectedDestination("all")
    setSearch("")
  }

  const handleSearch = async () => {
    if (!lrNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an LR number",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setSelectedBooking(null)

    try {
      const foundBooking = await getBookingById(lrNumber.trim())

      if (!foundBooking) {
        toast({
          title: "Not Found",
          description: `No booking found with LR number ${lrNumber}`,
          variant: "destructive",
        })
        return
      }

      setSelectedBooking(foundBooking as Booking)
    } catch (error) {
      console.error("Error searching for booking:", error)
      toast({
        title: "Error",
        description: "Failed to search for booking. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const handleDownloadInvoice = async (booking: Booking) => {
    setIsPdfLoading(true)
    try {
      toast({
        title: "Preparing Download",
        description: "Generating invoice for download...",
        variant: "default",
      })

      await downloadInvoicePDF(booking, undefined, { skipUpload: true })

      toast({
        title: "Download Started",
        description: "Invoice download has started",
        variant: "default",
      })
    } catch (error) {
      console.error("Error downloading invoice:", error)
      toast({
        title: "Error",
        description: "Failed to download invoice. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsPdfLoading(false)
    }
  }

  const handleViewInvoice = async (booking: Booking) => {
    setIsPdfLoading(true)
    try {
      toast({
        title: "Opening Invoice",
        description: "Preparing invoice for viewing...",
        variant: "default",
      })

      await viewInvoicePDF(booking, { skipUpload: true })
    } catch (error) {
      console.error("Error viewing invoice:", error)
      toast({
        title: "Error",
        description: "Failed to view invoice. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsPdfLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Receive</h1>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Pending Receipts</TabsTrigger>
          <TabsTrigger value="search">Search by LR</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6 mt-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Receive Filters</CardTitle>
              <CardDescription>Filter dispatched bookings by destination or search terms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`grid ${isMobile ? "grid-cols-1 gap-4" : "grid-cols-3 gap-4"}`}>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <Select value={selectedDestination} onValueChange={setSelectedDestination}>
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
                    <Button type="button" variant="outline" className="rounded-l-none border-l-0">
                      <Search size={18} />
                    </Button>
                  </div>
                </div>

                <div className="flex items-end">
                  <Button variant="outline" onClick={resetFilters} className="w-full">
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
                  <CardTitle>Pending Receipt</CardTitle>
                  <CardDescription>Dispatched bookings awaiting receipt: {filteredBookings.length}</CardDescription>
                </div>
                <Button onClick={loadBookings} variant="outline" disabled={isLoading}>
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
                  <p className="text-gray-500">No dispatched bookings found matching the filters</p>
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
                        <th className="py-3 px-2 text-left hidden md:table-cell">Status</th>
                        <th className="py-3 px-2 text-left hidden md:table-cell">Type</th>
                        <th className="py-3 px-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map((booking) => (
                        <tr key={booking.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2 font-medium">{booking.id}</td>
                          <td className="py-3 px-2">{booking.bookingDate}</td>
                          <td className="py-3 px-2 hidden md:table-cell">{booking.consignorName}</td>
                          <td className="py-3 px-2">{booking.deliveryDestination}</td>
                          <td className="py-3 px-2 hidden md:table-cell">
                            <span
                              className={`px-2 py-1 rounded-full text-xs 
                              ${
                                booking.status === "Dispatched"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : booking.status === "In Transit"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {booking.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 hidden md:table-cell">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                booking.bookingType === BookingType.PAID
                                  ? "bg-green-100 text-green-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {booking.bookingType}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-brand-primary hover:bg-brand-primary/90"
                                onClick={() => handleReceive(booking.id)}
                                disabled={processing[booking.id]}
                              >
                                {processing[booking.id] ? (
                                  "Processing..."
                                ) : (
                                  <>
                                    <Package size={16} className="mr-1" /> Receive
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewInvoice(booking)}
                                className="h-8 w-8 p-0"
                                disabled={isPdfLoading}
                              >
                                <Eye size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-6 mt-4">
          {/* Search Box */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search by LR Number</CardTitle>
              <CardDescription>Enter the LR Number to find and receive the booking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Input
                    placeholder="Enter LR Number"
                    value={lrNumber}
                    onChange={(e) => setLrNumber(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="bg-brand-primary hover:bg-brand-primary/90"
                >
                  {isLoading ? "Searching..." : "Find LR"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Booking Details */}
          {selectedBooking && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <CardTitle>Booking Details</CardTitle>
                    <CardDescription>LR Number: {selectedBooking.id}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewInvoice(selectedBooking)}
                      className="gap-1"
                      disabled={isPdfLoading}
                    >
                      <Eye size={16} />
                      View Invoice
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadInvoice(selectedBooking)}
                      className="gap-1"
                      disabled={isPdfLoading}
                    >
                      <FileDown size={16} />
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Booking Information */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-brand-primary" />
                      <h3 className="font-medium">Booking Information</h3>
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-2">
                        <div className="text-sm text-gray-500">Booking Type:</div>
                        <div className="text-sm font-medium">{selectedBooking.bookingType}</div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="text-sm text-gray-500">Booking Date:</div>
                        <div className="text-sm font-medium">{selectedBooking.bookingDate}</div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="text-sm text-gray-500">Destination:</div>
                        <div className="text-sm font-medium">{selectedBooking.deliveryDestination}</div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="text-sm text-gray-500">Current Status:</div>
                        <div className="text-sm font-medium">
                          <span
                            className={`px-2 py-1 rounded-full text-xs 
                            ${
                              selectedBooking.status === "Dispatched"
                                ? "bg-yellow-100 text-yellow-800"
                                : selectedBooking.status === "In Transit"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {selectedBooking.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Article Information */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-brand-primary" />
                      <h3 className="font-medium">Article Information</h3>
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-2">
                        <div className="text-sm text-gray-500">Total Articles:</div>
                        <div className="text-sm font-medium">{selectedBooking.totalArticles}</div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="text-sm text-gray-500">Said to Contain:</div>
                        <div className="text-sm font-medium">{selectedBooking.saidToContain}</div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="text-sm text-gray-500">Declared Value:</div>
                        <div className="text-sm font-medium">₹{selectedBooking.declaredValue.toFixed(2)}</div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="text-sm text-gray-500">Total Amount:</div>
                        <div className="text-sm font-medium">₹{selectedBooking.totalAmount.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    className="bg-brand-primary hover:bg-brand-primary/90"
                    onClick={() => handleReceive(selectedBooking.id)}
                    disabled={
                      processing[selectedBooking.id] ||
                      selectedBooking.status === "Received" ||
                      selectedBooking.status === "Delivered"
                    }
                  >
                    {processing[selectedBooking.id]
                      ? "Processing..."
                      : selectedBooking.status === "Received" || selectedBooking.status === "Delivered"
                        ? "Already Processed"
                        : "Mark as Received"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Receive
