"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, FileText, Download, Filter, FileSpreadsheet } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAppSelector } from "@/hooks/useAppSelector"
import { useIsMobile } from "@/hooks/use-mobile"
import { getBookingsByType, getRecentBookings } from "@/services/bookingService"
import { BookingType, type Booking } from "@/models/booking"
import { useToast } from "@/hooks/use-toast"
import { generateReportPDF } from "@/utils/pdfGenerator"
import { generateExcelReport } from "@/utils/excelgenerator"

const Reports = () => {
  const [date, setDate] = useState<Date>(new Date())
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date | undefined }>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date(),
  })
  const [reportType, setReportType] = useState("collection")
  const [destination, setDestination] = useState("all")
  const [isLoading, setIsLoading] = useState(false)
  const [reportData, setReportData] = useState<any[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const destinations = useAppSelector((state) => state.booking.destinations)
  const isMobile = useIsMobile()
  const { toast } = useToast()

  useEffect(() => {
    loadReportData()
  }, [reportType])

  const loadReportData = async () => {
    setIsLoading(true)
    try {
      let data: any[] = []

      switch (reportType) {
        case "collection":
        case "branchCollection":
          // Get PAID bookings for collection reports
          const paidBookings = await getBookingsByType(BookingType.PAID)
          data = paidBookings.map((booking: Booking) => ({
            id: booking.id,
            date: booking.bookingDate,
            branch: "Bangalore", // Default branch for demo
            destination: booking.deliveryDestination,
            amount: booking.totalAmount,
            type: booking.bookingType,
          }))
          break

        case "dispatched":
          // Get all bookings with "Dispatched" status
          const allBookings = await getRecentBookings(50)
          data = allBookings
            .filter((booking: Booking) => booking.status === "Dispatched")
            .map((booking: Booking) => ({
              id: booking.id,
              date: booking.bookingDate,
              from: booking.consignorName,
              to: booking.deliveryDestination,
              status: booking.status,
              dispatchDate: booking.dispatchDate || "",
            }))
          break

        case "pendingDispatch":
          // Get all bookings with "Booked" status
          const pendingDispatchBookings = await getRecentBookings(50)
          data = pendingDispatchBookings
            .filter((booking: Booking) => booking.status === "Booked")
            .map((booking: Booking) => ({
              id: booking.id,
              date: booking.bookingDate,
              from: booking.consignorName,
              to: booking.deliveryDestination,
              status: booking.status,
              dispatchDate: "",
            }))
          break

        case "delivered":
          // Get all bookings with "Delivered" status
          const deliveredBookings = await getRecentBookings(50)
          data = deliveredBookings
            .filter((booking: Booking) => booking.status === "Delivered")
            .map((booking: Booking) => ({
              id: booking.id,
              date: booking.bookingDate,
              from: booking.consignorName,
              to: booking.deliveryDestination,
              status: booking.status,
              deliveryDate: booking.deliveryDate || "",
            }))
          break

        case "pendingDelivery":
          // Get all bookings with "Received" status
          const pendingDeliveryBookings = await getRecentBookings(50)
          data = pendingDeliveryBookings
            .filter((booking: Booking) => booking.status === "Received")
            .map((booking: Booking) => ({
              id: booking.id,
              date: booking.bookingDate,
              from: booking.consignorName,
              to: booking.deliveryDestination,
              status: booking.status,
              deliveryDate: "",
            }))
          break

        default:
          data = []
      }

      setReportData(data)
    } catch (error) {
      console.error("Error loading report data:", error)
      toast({
        title: "Error",
        description: "Failed to load report data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    loadReportData()
  }

  // Filter function for the report data
  const getFilteredData = () => {
    let filtered = [...reportData]

    // Filter by date range
    if (dateRange.from && dateRange.to) {
      const fromDate = new Date(dateRange.from)
      fromDate.setHours(0, 0, 0, 0)

      const toDate = new Date(dateRange.to)
      toDate.setHours(23, 59, 59, 999)

      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.date)
        return itemDate >= fromDate && itemDate <= toDate
      })
    }

    // Filter by destination
    if (destination && destination !== "all") {
      filtered = filtered.filter((item) => item.destination === destination || item.to === destination)
    }

    return filtered
  }

  const filteredData = getFilteredData()

  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      const title = getReportTitle()
      const subtitle = getReportDateRange()

      await generateReportPDF({
        title,
        subtitle,
        data: filteredData,
        columns: getReportColumns(),
        reportType,
      })

      toast({
        title: "Export Successful",
        description: "PDF report has been generated and downloaded",
        variant: "default",
      })
    } catch (error) {
      console.error("Error exporting PDF:", error)
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportExcel = async () => {
    setIsExporting(true)
    try {
      const title = getReportTitle()

      await generateExcelReport({
        title,
        data: filteredData,
        columns: getReportColumns(),
        reportType,
      })

      toast({
        title: "Export Successful",
        description: "Excel report has been generated and downloaded",
        variant: "default",
      })
    } catch (error) {
      console.error("Error exporting Excel:", error)
      toast({
        title: "Export Failed",
        description: "Failed to generate Excel report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const getReportTitle = () => {
    switch (reportType) {
      case "collection":
        return "Daily Collection Report"
      case "branchCollection":
        return "Branch Collection Report"
      case "dispatched":
        return "Dispatched Stock Report"
      case "pendingDispatch":
        return "Pending Dispatch Report"
      case "delivered":
        return "Delivered Stock Report"
      case "pendingDelivery":
        return "Pending Delivery Report"
      default:
        return "Report"
    }
  }

  const getReportDateRange = () => {
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "PPP")} - ${format(dateRange.to, "PPP")}`
    }
    return "All time"
  }

  const getReportColumns = () => {
    switch (reportType) {
      case "collection":
      case "branchCollection":
        return ["LR No.", "Date", "Branch", "Destination", "Type", "Amount"]
      case "dispatched":
      case "pendingDispatch":
        return ["LR No.", "Booking Date", "From", "To", "Status", "Dispatch Date"]
      case "delivered":
      case "pendingDelivery":
        return ["LR No.", "Booking Date", "From", "To", "Status", "Delivery Date"]
      default:
        return []
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar with Report Types */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Report Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-2">
            <div className="font-medium text-sm text-gray-500 px-3">Collection Reports</div>
            <Button
              variant={reportType === "collection" ? "default" : "ghost"}
              className={`w-full justify-start ${reportType === "collection" ? "bg-brand-primary hover:bg-brand-primary/90" : ""}`}
              onClick={() => setReportType("collection")}
            >
              <FileText className="h-4 w-4 mr-2" />
              Daily Collection
            </Button>
            <Button
              variant={reportType === "branchCollection" ? "default" : "ghost"}
              className={`w-full justify-start ${reportType === "branchCollection" ? "bg-brand-primary hover:bg-brand-primary/90" : ""}`}
              onClick={() => setReportType("branchCollection")}
            >
              <FileText className="h-4 w-4 mr-2" />
              Branch Collection
            </Button>

            <div className="font-medium text-sm text-gray-500 px-3 mt-4">Dispatch Reports</div>
            <Button
              variant={reportType === "dispatched" ? "default" : "ghost"}
              className={`w-full justify-start ${reportType === "dispatched" ? "bg-brand-primary hover:bg-brand-primary/90" : ""}`}
              onClick={() => setReportType("dispatched")}
            >
              <FileText className="h-4 w-4 mr-2" />
              Dispatched Stock
            </Button>
            <Button
              variant={reportType === "pendingDispatch" ? "default" : "ghost"}
              className={`w-full justify-start ${reportType === "pendingDispatch" ? "bg-brand-primary hover:bg-brand-primary/90" : ""}`}
              onClick={() => setReportType("pendingDispatch")}
            >
              <FileText className="h-4 w-4 mr-2" />
              Pending Dispatch
            </Button>

            <div className="font-medium text-sm text-gray-500 px-3 mt-4">Delivery Reports</div>
            <Button
              variant={reportType === "delivered" ? "default" : "ghost"}
              className={`w-full justify-start ${reportType === "delivered" ? "bg-brand-primary hover:bg-brand-primary/90" : ""}`}
              onClick={() => setReportType("delivered")}
            >
              <FileText className="h-4 w-4 mr-2" />
              Delivered Stock
            </Button>
            <Button
              variant={reportType === "pendingDelivery" ? "default" : "ghost"}
              className={`w-full justify-start ${reportType === "pendingDelivery" ? "bg-brand-primary hover:bg-brand-primary/90" : ""}`}
              onClick={() => setReportType("pendingDelivery")}
            >
              <FileText className="h-4 w-4 mr-2" />
              Pending Delivery
            </Button>
          </CardContent>
        </Card>

        {/* Main Report Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Report Filters</CardTitle>
              <CardDescription>Customize your report view</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`grid ${isMobile ? "grid-cols-1 gap-4" : "md:grid-cols-2 lg:grid-cols-3 gap-4"}`}>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "justify-start text-left font-normal",
                            !dateRange.from && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.from ? format(dateRange.from, "PPP") : <span>From date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateRange.from}
                          onSelect={(date) => setDateRange({ ...dateRange, from: date as Date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "justify-start text-left font-normal",
                            !dateRange.to && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.to ? format(dateRange.to, "PPP") : <span>To date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateRange.to}
                          onSelect={(date) => setDateRange({ ...dateRange, to: date as Date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Destination</label>
                  <Select value={destination} onValueChange={setDestination}>
                    <SelectTrigger id="destination">
                      <SelectValue placeholder="All Destinations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Destinations</SelectItem>
                      {destinations.map((dest, index) => (
                        <SelectItem key={index} value={dest}>
                          {dest}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end space-x-2">
                  <Button className="flex-1 bg-brand-primary hover:bg-brand-primary/90" onClick={applyFilters}>
                    <Filter className="h-4 w-4 mr-2" />
                    Apply Filters
                  </Button>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" disabled={isExporting || filteredData.length === 0}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-0">
                      <div className="p-2 space-y-1">
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={handleExportPDF}
                          disabled={isExporting || filteredData.length === 0}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Export as PDF
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={handleExportExcel}
                          disabled={isExporting || filteredData.length === 0}
                        >
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Export as Excel
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Content */}
          <Card>
            <CardHeader>
              <CardTitle>{getReportTitle()}</CardTitle>
              <CardDescription>
                {getReportDateRange()}
                {destination && destination !== "all" ? `| Destination: ${destination}` : null}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <p>Loading report data...</p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No data found for the selected filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {(reportType === "collection" || reportType === "branchCollection") && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-3 px-2 text-left">LR No.</th>
                          <th className="py-3 px-2 text-left">Date</th>
                          <th className="py-3 px-2 text-left">Branch</th>
                          <th className="py-3 px-2 text-left">Destination</th>
                          <th className="py-3 px-2 text-left">Type</th>
                          <th className="py-3 px-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-2">{item.id}</td>
                            <td className="py-3 px-2">{item.date}</td>
                            <td className="py-3 px-2">{item.branch}</td>
                            <td className="py-3 px-2">{item.destination}</td>
                            <td className="py-3 px-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs 
                                ${item.type === "PAID" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}
                              >
                                {item.type}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right">₹{item.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-medium">
                          <td className="py-3 px-2" colSpan={5}>
                            Total
                          </td>
                          <td className="py-3 px-2 text-right">
                            ₹{filteredData.reduce((total, item) => total + item.amount, 0).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}

                  {(reportType === "dispatched" || reportType === "pendingDispatch") && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-3 px-2 text-left">LR No.</th>
                          <th className="py-3 px-2 text-left">Booking Date</th>
                          <th className="py-3 px-2 text-left">From</th>
                          <th className="py-3 px-2 text-left">To</th>
                          <th className="py-3 px-2 text-left">Status</th>
                          <th className="py-3 px-2 text-left">Dispatch Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-2">{item.id}</td>
                            <td className="py-3 px-2">{item.date}</td>
                            <td className="py-3 px-2">{item.from}</td>
                            <td className="py-3 px-2">{item.to}</td>
                            <td className="py-3 px-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs 
                              ${
                                item.status === "Dispatched"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="py-3 px-2">{item.dispatchDate || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {(reportType === "delivered" || reportType === "pendingDelivery") && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-3 px-2 text-left">LR No.</th>
                          <th className="py-3 px-2 text-left">Booking Date</th>
                          <th className="py-3 px-2 text-left">From</th>
                          <th className="py-3 px-2 text-left">To</th>
                          <th className="py-3 px-2 text-left">Status</th>
                          <th className="py-3 px-2 text-left">Delivery Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-2">{item.id}</td>
                            <td className="py-3 px-2">{item.date}</td>
                            <td className="py-3 px-2">{item.from}</td>
                            <td className="py-3 px-2">{item.to}</td>
                            <td className="py-3 px-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs 
                              ${
                                item.status === "Delivered"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="py-3 px-2">{item.deliveryDate || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Reports
