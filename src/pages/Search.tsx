"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog"
import { getBookingById, getRecentBookings, deleteBooking, searchBookings } from "@/services/bookingService"
import type { Booking } from "@/models/booking"
import { useToast } from "@/hooks/use-toast"
import { SearchIcon, FileDown, Eye, Calendar, Package, Trash2, Edit, X } from "lucide-react"
import { downloadInvoicePDF, viewInvoicePDF } from "@/utils/pdfGenerator"
import { useIsMobile } from "@/hooks/use-mobile"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useNavigate } from "react-router-dom"

const Search = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchType, setSearchType] = useState("lrNumber")
  const [booking, setBooking] = useState<Booking | null>(null)
  const [searchResults, setSearchResults] = useState<Booking[]>([])
  const [recentBookings, setRecentBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isPdfLoading, setIsPdfLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  useEffect(() => {
    loadRecentBookings()
  }, [])

  const loadRecentBookings = async () => {
    try {
      const bookings = await getRecentBookings(10)
      setRecentBookings(bookings)
    } catch (error) {
      console.error("Error loading recent bookings:", error)
      toast({
        title: "Error",
        description: "Failed to load recent bookings",
        variant: "destructive",
      })
    }
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a search term",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setBooking(null)
    setSearchResults([])

    try {
      if (searchType === "lrNumber") {
        // Search by LR Number (exact match)
        const foundBooking = await getBookingById(searchTerm.trim())
        if (foundBooking) {
          setBooking(foundBooking as Booking)
          setSearchResults([foundBooking as Booking])
        } else {
          toast({
            title: "Not Found",
            description: `No booking found with LR number ${searchTerm}`,
            variant: "destructive",
          })
        }
      } else {
        // Search by other criteria (multiple results possible)
        const results = await searchBookings(searchType, searchTerm.trim())
        
        if (results && results.length > 0) {
          setSearchResults(results)
          if (results.length === 1) {
            setBooking(results[0])
          }
          
          toast({
            title: "Search Results",
            description: `Found ${results.length} booking${results.length > 1 ? 's' : ''} matching your search`,
            variant: "default",
          })
        } else {
          const searchTypeLabel = {
            consignorName: "consignor name",
            deliveryLocation: "delivery location",
            consigneeName: "consignee name",
            mobile: "mobile number"
          }[searchType] || searchType
          
          toast({
            title: "Not Found",
            description: `No bookings found matching ${searchTypeLabel}: ${searchTerm}`,
            variant: "destructive",
          })
        }
      }
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

  const handleClearSearch = () => {
    setSearchTerm("")
    setBooking(null)
    setSearchResults([])
  }

  const handleSelectBooking = (selectedBooking: Booking) => {
    setBooking(selectedBooking)
  }

  const handleDownloadInvoice = async (booking: Booking) => {
    setIsPdfLoading(true)
    try {
      toast({
        title: "Preparing Download",
        description: "Generating invoice for download...",
        variant: "default",
      })

      await downloadInvoicePDF(booking)

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

      await viewInvoicePDF(booking)
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

  const handleDeleteBooking = async (bookingId: string) => {
    setDeletingId(bookingId)
    try {
      await deleteBooking(bookingId)
      
      toast({
        title: "Success",
        description: `Booking ${bookingId} has been deleted successfully.`,
      })
      
      // Clear the current booking if it was the one deleted
      if (booking && booking.id === bookingId) {
        setBooking(null)
      }
      
      // Remove from search results
      setSearchResults(prev => prev.filter(b => b.id !== bookingId))
      
      // Refresh the recent bookings list
      await loadRecentBookings()
    } catch (error) {
      console.error("Error deleting booking:", error)
      toast({
        title: "Error",
        description: "Failed to delete booking. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const handleEditBooking = (bookingId: string) => {
    navigate(`/booking/edit/${bookingId}`)
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-green-100 text-green-800"
      case "In Transit":
        return "bg-yellow-100 text-yellow-800"
      case "Booked":
        return "bg-purple-100 text-purple-800"
      case "Dispatched":
        return "bg-blue-100 text-blue-800"
      case "Received":
        return "bg-indigo-100 text-indigo-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getSearchPlaceholder = () => {
    switch (searchType) {
      case "lrNumber":
        return "Enter LR Number (e.g., LR001)"
      case "consignorName":
        return "Enter consignor name"
      case "consigneeName":
        return "Enter consignee name"
      case "deliveryLocation":
        return "Enter delivery location/destination"
      case "mobile":
        return "Enter mobile number"
      default:
        return "Enter search term"
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Search</h1>

      <Tabs defaultValue="search" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="search">Search Bookings</TabsTrigger>
          <TabsTrigger value="recent">Recent Bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6 mt-4">
          {/* Search Box */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search Bookings</CardTitle>
              <CardDescription>Find bookings by LR Number</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <Label htmlFor="searchType">Search By</Label>
                  <Select value={searchType} onValueChange={setSearchType}>
                    <SelectTrigger id="searchType">
                      <SelectValue placeholder="Search Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lrNumber">LR Number</SelectItem>
                      <SelectItem value="consignorName">Consignor Name</SelectItem>
                      <SelectItem value="consigneeName">Consignee Name</SelectItem>
                      <SelectItem value="deliveryLocation">Delivery Location</SelectItem>
                      <SelectItem value="mobile">Mobile Number</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="searchTerm">Search Term</Label>
                  <div className="relative">
                    <Input
                      id="searchTerm"
                      placeholder={getSearchPlaceholder()}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="pr-8"
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearSearch}
                        className="absolute right-1 top-1 h-6 w-6 p-0 hover:bg-gray-100"
                      >
                        <X size={14} />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleSearch}
                    disabled={isLoading}
                    className="w-full bg-brand-primary hover:bg-brand-primary/90"
                  >
                    {isLoading ? "Searching..." : "Search"}
                    <SearchIcon size={16} className="ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search Results Summary */}
          {searchResults.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Search Results ({searchResults.length})</CardTitle>
                <CardDescription>Click on a booking to view full details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-3 px-2 text-left">LR No.</th>
                        <th className="py-3 px-2 text-left">Date</th>
                        <th className="py-3 px-2 text-left hidden md:table-cell">From</th>
                        <th className="py-3 px-2 text-left">To</th>
                        <th className="py-3 px-2 text-left hidden md:table-cell">Type</th>
                        <th className="py-3 px-2 text-left">Status</th>
                        <th className="py-3 px-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.map((searchBooking) => (
                        <tr 
                          key={searchBooking.id} 
                          className={`border-b hover:bg-gray-50 cursor-pointer ${
                            booking?.id === searchBooking.id ? 'bg-blue-50 border-blue-200' : ''
                          }`}
                          onClick={() => handleSelectBooking(searchBooking)}
                        >
                          <td className="py-3 px-2 font-medium">{searchBooking.id}</td>
                          <td className="py-3 px-2">{searchBooking.bookingDate}</td>
                          <td className="py-3 px-2 hidden md:table-cell">{searchBooking.consignorName}</td>
                          <td className="py-3 px-2">{searchBooking.deliveryDestination}</td>
                          <td className="py-3 px-2 hidden md:table-cell">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                searchBooking.bookingType === "PAID"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {searchBooking.bookingType}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(searchBooking.status)}`}>
                              {searchBooking.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSelectBooking(searchBooking)}
                                className="h-8 w-8 p-0"
                                title="View Details"
                              >
                                <Eye size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadInvoice(searchBooking)}
                                className="h-8 w-8 p-0"
                                disabled={isPdfLoading}
                                title="Download Invoice"
                              >
                                <FileDown size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditBooking(searchBooking.id)}
                                className="h-8 w-8 p-0"
                                title="Edit Booking"
                              >
                                <Edit size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Booking Details */}
          {booking && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <CardTitle>Booking Details</CardTitle>
                    <CardDescription>LR Number: {booking.id}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewInvoice(booking)}
                      className="gap-1"
                      disabled={isPdfLoading}
                    >
                      <Eye size={16} />
                      View Invoice
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadInvoice(booking)}
                      className="gap-1"
                      disabled={isPdfLoading}
                    >
                      <FileDown size={16} />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditBooking(booking.id)}
                      className="gap-1"
                    >
                      <Edit size={16} />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          disabled={deletingId === booking.id}
                        >
                          <Trash2 size={16} />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Booking</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete booking <strong>{booking.id}</strong>? 
                            This action cannot be undone. The booking ID will be made available for reuse.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteBooking(booking.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {deletingId === booking.id ? "Deleting..." : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
                        <div className="text-sm font-medium">{booking.bookingType}</div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="text-sm text-gray-500">Booking Date:</div>
                        <div className="text-sm font-medium">{booking.bookingDate}</div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="text-sm text-gray-500">Destination:</div>
                        <div className="text-sm font-medium">{booking.deliveryDestination}</div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="text-sm text-gray-500">Current Status:</div>
                        <div className="text-sm font-medium">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(booking.status)}`}>
                            {booking.status}
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
                        <div className="text-sm font-medium">{booking.totalArticles}</div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="text-sm text-gray-500">Said to Contain:</div>
                        <div className="text-sm font-medium">{booking.saidToContain}</div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="text-sm text-gray-500">Declared Value:</div>
                        <div className="text-sm font-medium">₹{booking.declaredValue.toFixed(2)}</div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="text-sm text-gray-500">Total Amount:</div>
                        <div className="text-sm font-medium">₹{booking.totalAmount.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Consignor Information */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-brand-primary" />
                      <h3 className="font-medium">Consignor (From)</h3>
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-1">
                        <div className="text-sm text-gray-500">Name:</div>
                        <div className="text-sm font-medium">{booking.consignorName}</div>
                      </div>

                      <div className="grid grid-cols-1">
                        <div className="text-sm text-gray-500">Mobile:</div>
                        <div className="text-sm font-medium">{booking.consignorMobile}</div>
                      </div>

                      <div className="grid grid-cols-1">
                        <div className="text-sm text-gray-500">Address:</div>
                        <div className="text-sm font-medium">{booking.consignorAddress}</div>
                      </div>
                    </div>
                  </div>

                  {/* Consignee Information */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-brand-primary" />
                      <h3 className="font-medium">Consignee (To)</h3>
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-1">
                        <div className="text-sm text-gray-500">Name:</div>
                        <div className="text-sm font-medium">{booking.consigneeName}</div>
                      </div>

                      <div className="grid grid-cols-1">
                        <div className="text-sm text-gray-500">Mobile:</div>
                        <div className="text-sm font-medium">{booking.consigneeMobile}</div>
                      </div>

                      <div className="grid grid-cols-1">
                        <div className="text-sm text-gray-500">Address:</div>
                        <div className="text-sm font-medium">{booking.consigneeAddress}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-brand-primary" />
                    <h3 className="font-medium">Booking Timeline</h3>
                  </div>

                  <div className="relative border-l-2 border-gray-200 pl-6 space-y-6 ml-2">
                    <div className="relative">
                      <div className="absolute -left-8 mt-1.5 h-4 w-4 rounded-full bg-brand-primary"></div>
                      <p className="font-medium">Booked</p>
                      <p className="text-sm text-gray-500">{booking.bookingDate}</p>
                    </div>

                    {booking.dispatchDate && (
                      <div className="relative">
                        <div className="absolute -left-8 mt-1.5 h-4 w-4 rounded-full bg-blue-500"></div>
                        <p className="font-medium">Dispatched</p>
                        <p className="text-sm text-gray-500">{booking.dispatchDate}</p>
                      </div>
                    )}

                    {booking.receiveDate && (
                      <div className="relative">
                        <div className="absolute -left-8 mt-1.5 h-4 w-4 rounded-full bg-indigo-500"></div>
                        <p className="font-medium">Received</p>
                        <p className="text-sm text-gray-500">{booking.receiveDate}</p>
                      </div>
                    )}

                    {booking.deliveryDate && (
                      <div className="relative">
                        <div className="absolute -left-8 mt-1.5 h-4 w-4 rounded-full bg-green-500"></div>
                        <p className="font-medium">Delivered</p>
                        <p className="text-sm text-gray-500">{booking.deliveryDate}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Recent Bookings</CardTitle>
                  <CardDescription>Last 10 bookings in the system</CardDescription>
                </div>
                <Button variant="outline" onClick={loadRecentBookings}>
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-3 px-2 text-left">LR No.</th>
                      <th className="py-3 px-2 text-left">Date</th>
                      <th className="py-3 px-2 text-left hidden md:table-cell">From</th>
                      <th className="py-3 px-2 text-left">To</th>
                      <th className="py-3 px-2 text-left hidden md:table-cell">Type</th>
                      <th className="py-3 px-2 text-left">Status</th>
                      <th className="py-3 px-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-gray-500">
                          No recent bookings found
                        </td>
                      </tr>
                    ) : (
                      recentBookings.map((recentBooking) => (
                        <tr key={recentBooking.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2 font-medium">{recentBooking.id}</td>
                          <td className="py-3 px-2">{recentBooking.bookingDate}</td>
                          <td className="py-3 px-2 hidden md:table-cell">{recentBooking.consignorName}</td>
                          <td className="py-3 px-2">{recentBooking.deliveryDestination}</td>
                          <td className="py-3 px-2 hidden md:table-cell">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                recentBooking.bookingType === "PAID"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {recentBooking.bookingType}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(recentBooking.status)}`}>
                              {recentBooking.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setBooking(recentBooking)
                                  setSearchResults([recentBooking])
                                  document.querySelector('[data-value="search"]')?.click()
                                }}
                                className="h-8 w-8 p-0"
                                title="View Details"
                              >
                                <SearchIcon size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewInvoice(recentBooking)}
                                className="h-8 w-8 p-0"
                                disabled={isPdfLoading}
                                title="View Invoice"
                              >
                                <Eye size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadInvoice(booking)}
                                className="h-8 w-8 p-0"
                                disabled={isPdfLoading}
                                title="Download Invoice"
                              >
                                <FileDown size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditBooking(booking.id)}
                                className="h-8 w-8 p-0"
                                title="Edit Booking"
                              >
                                <Edit size={16} />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    disabled={deletingId === booking.id}
                                    title="Delete Booking"
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Booking</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete booking <strong>{booking.id}</strong>? 
                                      This action cannot be undone. The booking ID will be made available for reuse.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteBooking(booking.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      {deletingId === booking.id ? "Deleting..." : "Delete"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Search