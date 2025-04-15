"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getBookingById, updateBookingStatus } from "@/services/bookingService"
import type { Booking } from "@/models/booking"
import { useToast } from "@/hooks/use-toast"
import { Package, FileDown, Eye } from "lucide-react"
import { downloadInvoicePDF, viewInvoicePDF } from "@/utils/pdfGenerator"
import { useIsMobile } from "@/hooks/use-mobile"

const Delivery = () => {
  const [lrNumber, setLrNumber] = useState("")
  const [booking, setBooking] = useState<Booking | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isPdfLoading, setIsPdfLoading] = useState(false)
  const { toast } = useToast()
  const isMobile = useIsMobile()

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
    setBooking(null)

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

      setBooking(foundBooking as Booking)
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

  const handleDeliverBooking = async () => {
    if (!booking) return

    setIsUpdating(true)

    try {
      await updateBookingStatus(booking.id, "Delivered", "deliveryDate")

      // Update the local booking state
      setBooking({
        ...booking,
        status: "Delivered",
        deliveryDate: new Date().toISOString().split("T")[0],
      })

      toast({
        title: "Delivery Completed",
        description: `Booking ${booking.id} has been marked as delivered`,
        variant: "default",
      })
    } catch (error) {
      console.error("Error updating booking status:", error)
      toast({
        title: "Error",
        description: "Failed to update booking status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDownloadInvoice = async () => {
    if (!booking) return

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

  const handleViewInvoice = async () => {
    if (!booking) return

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Delivery (Alt + X)</h1>

      {/* Search Box */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Enter LR Number</CardTitle>
          <CardDescription>Enter the LR Number to find and deliver the booking</CardDescription>
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
            <Button onClick={handleSearch} disabled={isLoading} className="bg-brand-primary hover:bg-brand-primary/90">
              {isLoading ? "Searching..." : "Find LR"}
            </Button>
          </div>
        </CardContent>
      </Card>

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
                  onClick={handleViewInvoice}
                  className="gap-1"
                  disabled={isPdfLoading}
                >
                  <Eye size={16} />
                  View Invoice
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadInvoice}
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
                      <span
                        className={`px-2 py-1 rounded-full text-xs 
                        ${
                          booking.status === "Delivered"
                            ? "bg-green-100 text-green-800"
                            : booking.status === "In Transit"
                              ? "bg-yellow-100 text-yellow-800"
                              : booking.status === "Booked"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                        }`}
                      >
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

            <div className="flex justify-end">
              <Button
                className="bg-brand-primary hover:bg-brand-primary/90"
                onClick={handleDeliverBooking}
                disabled={booking.status === "Delivered" || isUpdating}
              >
                {isUpdating
                  ? "Updating..."
                  : booking.status === "Delivered"
                    ? "Already Delivered"
                    : "Mark as Delivered"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Delivery
