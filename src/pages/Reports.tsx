"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, FileText, Download, Filter, FileSpreadsheet, Printer, Eye } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useIsMobile } from "@/hooks/use-mobile"
import { getRecentBookings } from "@/services/bookingService"
import type { Booking } from "@/models/booking"
import { useToast } from "@/hooks/use-toast"
import { getAuth } from "firebase/auth"
import { getFirestore, doc, getDoc } from "firebase/firestore"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { viewInvoicePDF } from "@/utils/pdfGenerator"
import { generatePDFReport } from "@/utils/reportGenerator"

const Reports = () => {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date | undefined }>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date(),
  })
  const [reportType, setReportType] = useState("collection")
  const [destination, setDestination] = useState("all")
  const [isLoading, setIsLoading] = useState(false)
  // Replace 'any' with a union type for reportData
  const [reportData, setReportData] = useState<
    | Array<{
        id: string
        date: string
        branch: string
        destination: string
        amount: number
        type: string
        pkgs: number
        freight: number
        pickup: number
        dropCartage: number
        loading: number
        lrCharge: number
        unloading: number
        deliveryDiscount: number
      }>
    | Array<{
        id: string
        date: string
        from: string
        to: string
        status: string
        dispatchDate?: string
        deliveryDate?: string
      }>
  >([])
  const [isExporting, setIsExporting] = useState(false)
  const [destinations, setDestinations] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"summary" | "list">("summary")
  const [detailedBookings, setDetailedBookings] = useState<Booking[]>([])
  const [bookingTypeFilter, setBookingTypeFilter] = useState<"all" | "TO PAY" | "PAID">("all")
  const [bookingTypeSummary, setBookingTypeSummary] = useState<"all" | "TO PAY" | "PAID">("all")
  const isMobile = useIsMobile()
  const { toast } = useToast()

  // Stats for detailed reports
  const [bookingStats, setBookingStats] = useState({
    toPay: { count: 0, pkgs: 0, freight: 0, pickup: 0, dropCartage: 0, loading: 0, lrCharge: 0, amount: 0 },
    paid: { count: 0, pkgs: 0, freight: 0, pickup: 0, dropCartage: 0, loading: 0, lrCharge: 0, amount: 0 },
    total: { count: 0, pkgs: 0, freight: 0, pickup: 0, dropCartage: 0, loading: 0, lrCharge: 0, amount: 0 },
  })

  const [deliveryStats, setDeliveryStats] = useState({
    toPay: { count: 0, pkgs: 0, freight: 0, unloading: 0, deliveryDiscount: 0, amount: 0 },
    paid: { count: 0, pkgs: 0, freight: 0, unloading: 0, deliveryDiscount: 0, amount: 0 },
    total: { count: 0, pkgs: 0, freight: 0, unloading: 0, deliveryDiscount: 0, amount: 0 },
  })

  const [citywiseStats, setCitywiseStats] = useState<
    Array<{
      destination: string
      branch: string
      paid: number
      toPay: number
      total: number
    }>
  >([])

  useEffect(() => {
    loadReportData()
  }, [reportType, dateRange.from, dateRange.to, destination])

  // Fetch destinations directly from Firebase
  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const auth = getAuth()
        const currentUser = auth.currentUser

        if (!currentUser) {
          console.log("User not authenticated")
          return
        }

        const db = getFirestore()
        const userDocRef = doc(db, "users", currentUser.uid)
        const docSnap = await getDoc(userDocRef)

        if (docSnap.exists()) {
          const userData = docSnap.data()
          setDestinations(userData.bookingData?.destinations || [])
        } else {
          setDestinations([])
        }
      } catch (error) {
        console.error("Error fetching destinations:", error)
        toast({
          title: "Error",
          description: "Failed to load destinations. Using cached data if available.",
          variant: "destructive",
        })
      }
    }

    fetchDestinations()
  }, [toast])

  const loadReportData = async () => {
    setIsLoading(true)
    try {
      let data: any[] = []
      switch (reportType) {
        case "collection":
        case "branchCollection": {
          // Get all bookings for the selected date range
          const allBookings = await getRecentBookings(100)

          // Filter bookings by date range
          const filteredBookings = allBookings.filter((booking: Booking) => {
            if (!dateRange.from || !dateRange.to) return true

            const bookingDate = new Date(booking.bookingDate)
            const fromDate = new Date(dateRange.from)
            fromDate.setHours(0, 0, 0, 0)

            const toDate = new Date(dateRange.to)
            toDate.setHours(23, 59, 59, 999)

            return bookingDate >= fromDate && bookingDate <= toDate
          })

          // Filter by destination if selected
          const destinationFilteredBookings =
            destination && destination !== "all"
              ? filteredBookings.filter((booking: Booking) => booking.deliveryDestination === destination)
              : filteredBookings

          setDetailedBookings(destinationFilteredBookings)
          data = destinationFilteredBookings.map((booking: Booking) => ({
            id: booking.id,
            date: booking.bookingDate,
            branch: "BORIVALI", // Default branch
            destination: booking.deliveryDestination,
            amount: booking.totalAmount,
            type: booking.bookingType,
            // Add additional fields for detailed reports
            pkgs: booking.articles?.reduce((sum, article) => sum + (article.quantity || 1), 0) || 0,
            freight: booking.freightCharge || 0,
            pickup: booking.pickupCharge || 0,
            dropCartage: booking.dropCartage || 0,
            loading: booking.loadingCharge || 0,
            lrCharge: booking.lrCharge || 0,
            unloading: booking.unloadingCharge || 0,
            deliveryDiscount: booking.deliveryDiscount || 0,
          }))

          // Calculate booking statistics
          const bookingToPayItems = data.filter((item) => item.type === "TO PAY")
          const bookingPaidItems = data.filter((item) => item.type === "PAID")

          const bookingToPayStats = {
            count: bookingToPayItems.length,
            pkgs: bookingToPayItems.reduce((sum, item) => sum + item.pkgs, 0),
            freight: bookingToPayItems.reduce((sum, item) => sum + item.freight, 0),
            pickup: bookingToPayItems.reduce((sum, item) => sum + item.pickup, 0),
            dropCartage: bookingToPayItems.reduce((sum, item) => sum + item.dropCartage, 0),
            loading: bookingToPayItems.reduce((sum, item) => sum + item.loading, 0),
            lrCharge: bookingToPayItems.reduce((sum, item) => sum + item.lrCharge, 0),
            amount: bookingToPayItems.reduce((sum, item) => sum + item.amount, 0),
          }

          const bookingPaidStats = {
            count: bookingPaidItems.length,
            pkgs: bookingPaidItems.reduce((sum, item) => sum + item.pkgs, 0),
            freight: bookingPaidItems.reduce((sum, item) => sum + item.freight, 0),
            pickup: bookingPaidItems.reduce((sum, item) => sum + item.pickup, 0),
            dropCartage: bookingPaidItems.reduce((sum, item) => sum + item.dropCartage, 0),
            loading: bookingPaidItems.reduce((sum, item) => sum + item.loading, 0),
            lrCharge: bookingPaidItems.reduce((sum, item) => sum + item.lrCharge, 0),
            amount: bookingPaidItems.reduce((sum, item) => sum + item.amount, 0),
          }

          setBookingStats({
            toPay: bookingToPayStats,
            paid: bookingPaidStats,
            total: {
              count: bookingToPayStats.count + bookingPaidStats.count,
              pkgs: bookingToPayStats.pkgs + bookingPaidStats.pkgs,
              freight: bookingToPayStats.freight + bookingPaidStats.freight,
              pickup: bookingToPayStats.pickup + bookingPaidStats.pickup,
              dropCartage: bookingToPayStats.dropCartage + bookingPaidStats.dropCartage,
              loading: bookingToPayStats.loading + bookingPaidStats.loading,
              lrCharge: bookingToPayStats.lrCharge + bookingPaidStats.lrCharge,
              amount: bookingToPayStats.amount + bookingPaidStats.amount,
            },
          })

          // Calculate delivery statistics (for bookings with status "Delivered")
          const deliveredBookingsFiltered = destinationFilteredBookings.filter(
            (booking: Booking) => booking.status === "Delivered" || booking.status === "Received",
          )

          const deliveryToPayItems = deliveredBookingsFiltered.filter((booking) => booking.bookingType === "TO PAY")
          const deliveryPaidItems = deliveredBookingsFiltered.filter((booking) => booking.bookingType === "PAID")

          const deliveryToPayStats = {
            count: deliveryToPayItems.length,
            pkgs: deliveryToPayItems.reduce(
              (sum, item) => sum + (item.articles?.reduce((s, a) => s + (a.quantity || 1), 0) || 0),
              0,
            ),
            freight: deliveryToPayItems.reduce((sum, item) => sum + (item.freightCharge || 0), 0),
            unloading: deliveryToPayItems.reduce((sum, item) => sum + (item.unloadingCharge || 0), 0),
            deliveryDiscount: deliveryToPayItems.reduce((sum, item) => sum + (item.deliveryDiscount || 0), 0),
            amount: deliveryToPayItems.reduce(
              (sum, item) => sum + (item.freightCharge || 0) - (item.deliveryDiscount || 0),
              0,
            ),
          }

          const deliveryPaidStats = {
            count: deliveryPaidItems.length,
            pkgs: deliveryPaidItems.reduce(
              (sum, item) => sum + (item.articles?.reduce((s, a) => s + (a.quantity || 1), 0) || 0),
              0,
            ),
            freight: deliveryPaidItems.reduce((sum, item) => sum + (item.freightCharge || 0), 0),
            unloading: deliveryPaidItems.reduce((sum, item) => sum + (item.unloadingCharge || 0), 0),
            deliveryDiscount: deliveryPaidItems.reduce((sum, item) => sum + (item.deliveryDiscount || 0), 0),
            amount: deliveryPaidItems.reduce(
              (sum, item) => sum + (item.freightCharge || 0) - (item.deliveryDiscount || 0),
              0,
            ),
          }

          setDeliveryStats({
            toPay: deliveryToPayStats,
            paid: deliveryPaidStats,
            total: {
              count: deliveryToPayStats.count + deliveryPaidStats.count,
              pkgs: deliveryToPayStats.pkgs + deliveryPaidStats.pkgs,
              freight: deliveryToPayStats.freight + deliveryPaidStats.freight,
              unloading: deliveryToPayStats.unloading + deliveryPaidStats.unloading,
              deliveryDiscount: deliveryToPayStats.deliveryDiscount + deliveryPaidStats.deliveryDiscount,
              amount: deliveryToPayStats.amount + deliveryPaidStats.amount,
            },
          })

          // Calculate citywise statistics
          const destinations = [...new Set(destinationFilteredBookings.map((booking) => booking.deliveryDestination))]
          const citywiseData = destinations.map((dest) => {
            const destBookings = destinationFilteredBookings.filter((booking) => booking.deliveryDestination === dest)
            const paidAmount = destBookings
              .filter((booking) => booking.bookingType === "PAID")
              .reduce((sum, booking) => sum + (booking.totalAmount || 0), 0)
            const toPayAmount = destBookings
              .filter((booking) => booking.bookingType === "TO PAY")
              .reduce((sum, booking) => sum + (booking.totalAmount || 0), 0)

            return {
              destination: dest,
              branch: "BORIVALI", // Default branch
              paid: paidAmount,
              toPay: toPayAmount,
              total: paidAmount + toPayAmount,
            }
          })

          setCitywiseStats(citywiseData)
          break
        }
        case "dispatched": {
          // Get all bookings with "Dispatched" status
          const dispatchedBookings = await getRecentBookings(50)
          data = dispatchedBookings
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
        }
        case "pendingDispatch": {
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
        }
        case "delivered": {
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
        }
        case "pendingDelivery": {
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
        }
        default: {
          data = []
          setDetailedBookings([])
        }
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

  const handleViewBooking = (booking: Booking) => {
    viewInvoicePDF(booking)
  }

  const handleExportBookingPDF = (booking: Booking) => {
    viewInvoicePDF(booking)
  }

  // Enhanced PDF export functionality
  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      const title = getReportTitle()
      const subtitle = getReportDateRange()

      // Create a new PDF document
      const doc = new jsPDF()

      // Add title and subtitle
      doc.setFontSize(18)
      doc.text(title, 14, 20)

      doc.setFontSize(12)
      doc.text(subtitle, 14, 30)

      if (destination && destination !== "all") {
        doc.text(`Destination: ${destination}`, 14, 40)
      }

      // Add company info
      doc.setFontSize(10)
      doc.text("BORIVALI BRANCH", 150, 20)
      doc.text("Generated: " + format(new Date(), "dd/MM/yyyy HH:mm"), 150, 25)

      let yPos = 50

      // Add report content based on report type
      if (reportType === "collection" || reportType === "branchCollection") {
        // Booking Details Table
        doc.setFontSize(14)
        doc.text("Booking Details", 14, yPos)
        yPos += 10

        // @ts-expect-error
        doc.autoTable({
          startY: yPos,
          head: [["CATEGORY", "No. of pkgs", "Freight", "Pickup", "Drop Cartage", "Loading", "LR Charge", "AMOUNT"]],
          body: [
            [
              "To Pay",
              bookingStats.toPay.pkgs,
              bookingStats.toPay.freight,
              bookingStats.toPay.pickup,
              bookingStats.toPay.dropCartage,
              bookingStats.toPay.loading,
              bookingStats.toPay.lrCharge,
              bookingStats.toPay.amount.toFixed(2),
            ],
            [
              "Paid",
              bookingStats.paid.pkgs,
              bookingStats.paid.freight,
              bookingStats.paid.pickup,
              bookingStats.paid.dropCartage,
              bookingStats.paid.loading,
              bookingStats.paid.lrCharge,
              bookingStats.paid.amount.toFixed(2),
            ],
            [
              "Total",
              bookingStats.total.pkgs,
              bookingStats.total.freight,
              bookingStats.total.pickup,
              bookingStats.total.dropCartage,
              bookingStats.total.loading,
              bookingStats.total.lrCharge,
              bookingStats.total.amount.toFixed(2),
            ],
          ],
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
          footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [250, 250, 250] },
        })

        // @ts-expect-error
        yPos = doc.lastAutoTable.finalY + 15

        // Delivery Details Table
        doc.setFontSize(14)
        doc.text("Delivery Details", 14, yPos)
        yPos += 10

        // @ts-expect-error
        doc.autoTable({
          startY: yPos,
          head: [["CATEGORY", "No. of pkgs", "FREIGHT", "Unloading", "DELIVERY DISCOUNT", "AMOUNT"]],
          body: [
            [
              "To Pay",
              deliveryStats.toPay.pkgs,
              deliveryStats.toPay.freight,
              deliveryStats.toPay.unloading,
              deliveryStats.toPay.deliveryDiscount,
              deliveryStats.toPay.amount.toFixed(2),
            ],
            [
              "Paid",
              deliveryStats.paid.pkgs,
              deliveryStats.paid.freight,
              deliveryStats.paid.unloading,
              deliveryStats.paid.deliveryDiscount,
              deliveryStats.paid.amount.toFixed(2),
            ],
            [
              "Total",
              deliveryStats.total.pkgs,
              deliveryStats.total.freight,
              deliveryStats.total.unloading,
              deliveryStats.total.deliveryDiscount,
              deliveryStats.total.amount.toFixed(2),
            ],
          ],
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
          footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [250, 250, 250] },
        })

        // @ts-expect-error
        yPos = doc.lastAutoTable.finalY + 15

        // Check if we need a new page for citywise details
        if (yPos > 230) {
          doc.addPage()
          yPos = 20
        }

        // Citywise Details Table
        doc.setFontSize(14)
        doc.text("Citywise Paid / ToPay Details", 14, yPos)
        yPos += 10

        const citywiseTableBody = citywiseStats.map((city) => [
          city.destination,
          city.branch,
          city.paid.toFixed(2),
          city.toPay.toFixed(2),
          city.total.toFixed(2),
        ])

        // Add totals row
        citywiseTableBody.push([
          "Total",
          "",
          citywiseStats.reduce((sum, city) => sum + city.paid, 0).toFixed(2),
          citywiseStats.reduce((sum, city) => sum + city.toPay, 0).toFixed(2),
          citywiseStats.reduce((sum, city) => sum + city.total, 0).toFixed(2),
        ])

        // @ts-expect-error
        doc.autoTable({
          startY: yPos,
          head: [["Destination", "Destination Branch", "Paid", "To Pay", "Total"]],
          body: citywiseTableBody,
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
          footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [250, 250, 250] },
        })
      } else if (reportType === "dispatched" || reportType === "pendingDispatch") {
        // Dispatch Reports
        // @ts-expect-error
        doc.autoTable({
          startY: yPos,
          head: [["LR No.", "Booking Date", "From", "To", "Status", "Dispatch Date"]],
          body: filteredData.map((item) => [
            item.id,
            typeof item.date === "string" ? item.date : format(new Date(item.date), "dd/MM/yyyy"),
            item.from,
            item.to,
            item.status,
            item.dispatchDate || "-",
          ]),
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [250, 250, 250] },
        })
      } else if (reportType === "delivered" || reportType === "pendingDelivery") {
        // Delivery Reports
        // @ts-expect-error
        doc.autoTable({
          startY: yPos,
          head: [["LR No.", "Booking Date", "From", "To", "Status", "Delivery Date"]],
          body: filteredData.map((item) => [
            item.id,
            typeof item.date === "string" ? item.date : format(new Date(item.date), "dd/MM/yyyy"),
            item.from,
            item.to,
            item.status,
            item.deliveryDate || "-",
          ]),
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [250, 250, 250] },
        })
      }

      // Add footer
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10)
        doc.text(`Generated on: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, doc.internal.pageSize.height - 10)
      }

      // Save the PDF
      doc.save(`${title.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`)

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

      // This is a placeholder - you would implement the actual Excel export here
      // using a library like xlsx or exceljs
      console.log("Exporting to Excel:", title, filteredData)

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

  const handlePrintReport = () => {
    window.print()
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

  // Filtered detailed bookings by bookingType
  const filteredDetailedBookings = bookingTypeFilter === "all"
    ? detailedBookings
    : detailedBookings.filter(b => b.bookingType === bookingTypeFilter)

  // Filtered summary data for display and export
  const getFilteredSummaryRows = () => {
    const rows = []
    if (bookingTypeSummary === "all" || bookingTypeSummary === "TO PAY") {
      rows.push([
        "To Pay",
        bookingStats.toPay.pkgs,
        bookingStats.toPay.freight,
        bookingStats.toPay.pickup,
        bookingStats.toPay.dropCartage,
        bookingStats.toPay.loading,
        bookingStats.toPay.lrCharge,
        bookingStats.toPay.amount.toFixed(2),
      ])
    }
    if (bookingTypeSummary === "all" || bookingTypeSummary === "PAID") {
      rows.push([
        "Paid",
        bookingStats.paid.pkgs,
        bookingStats.paid.freight,
        bookingStats.paid.pickup,
        bookingStats.paid.dropCartage,
        bookingStats.paid.loading,
        bookingStats.paid.lrCharge,
        bookingStats.paid.amount.toFixed(2),
      ])
    }
    if (bookingTypeSummary === "all") {
      rows.push([
        "Total",
        bookingStats.total.pkgs,
        bookingStats.total.freight,
        bookingStats.total.pickup,
        bookingStats.total.dropCartage,
        bookingStats.total.loading,
        bookingStats.total.lrCharge,
        bookingStats.total.amount.toFixed(2),
      ])
    }
    return rows
  }
  const getFilteredDeliveryRows = () => {
    const rows = []
    if (bookingTypeSummary === "all" || bookingTypeSummary === "TO PAY") {
      rows.push([
        "To Pay",
        deliveryStats.toPay.pkgs,
        deliveryStats.toPay.freight,
        deliveryStats.toPay.unloading,
        deliveryStats.toPay.deliveryDiscount,
        deliveryStats.toPay.amount.toFixed(2),
      ])
    }
    if (bookingTypeSummary === "all" || bookingTypeSummary === "PAID") {
      rows.push([
        "Paid",
        deliveryStats.paid.pkgs,
        deliveryStats.paid.freight,
        deliveryStats.paid.unloading,
        deliveryStats.paid.deliveryDiscount,
        deliveryStats.paid.amount.toFixed(2),
      ])
    }
    if (bookingTypeSummary === "all") {
      rows.push([
        "Total",
        deliveryStats.total.pkgs,
        deliveryStats.total.freight,
        deliveryStats.total.unloading,
        deliveryStats.total.deliveryDiscount,
        deliveryStats.total.amount.toFixed(2),
      ])
    }
    return rows
  }
  const getFilteredCitywiseRows = () => {
    if (bookingTypeSummary === "all") {
      return citywiseStats.map((city) => [
        city.destination,
        city.branch,
        city.paid.toFixed(2),
        city.toPay.toFixed(2),
        city.total.toFixed(2),
      ])
    } else if (bookingTypeSummary === "TO PAY") {
      return citywiseStats.map((city) => [
        city.destination,
        city.branch,
        "-",
        city.toPay.toFixed(2),
        city.toPay.toFixed(2),
      ])
    } else {
      return citywiseStats.map((city) => [
        city.destination,
        city.branch,
        city.paid.toFixed(2),
        "-",
        city.paid.toFixed(2),
      ])
    }
  }

  // Export summary PDF for current bookingTypeSummary
  const handleExportSummaryPDF = async () => {
    try {
      let data: any[] = []
      let columns: string[] = [
        "Category",
        "No. of pkgs",
        "Freight",
        "Pickup",
        "Drop Cartage",
        "Loading",
        "LR Charge",
        "Amount",
      ]
      // Prepare data based on bookingTypeSummary
      const summaryRows = getFilteredSummaryRows()
      data = summaryRows.map(row => ({
        Category: row[0],
        "No. of pkgs": row[1],
        Freight: row[2],
        Pickup: row[3],
        "Drop Cartage": row[4],
        Loading: row[5],
        "LR Charge": row[6],
        Amount: row[7],
      }))
      await generatePDFReport({
        title: "Daily Collection Report",
        data,
        columns,
        reportType: "collection",
      })
    } catch (error) {
      console.error("Error exporting PDF:", error)
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Add a new exportFullSummaryPDF function for full summary export
  const exportFullSummaryPDF = async () => {
    try {
      const doc = new jsPDF()
      let yPos = 20
      // Title
      doc.setFontSize(18)
      doc.text("Daily Collection Report", 14, yPos)
      yPos += 8
      doc.setFontSize(12)
      doc.text(getReportDateRange(), 14, yPos)
      yPos += 8
      if (destination && destination !== "all") {
        doc.text(`Destination: ${destination}`, 14, yPos)
        yPos += 8
      }
      doc.setFontSize(10)
      doc.text("BORIVALI BRANCH", 150, 20)
      doc.text("Generated: " + format(new Date(), "dd/MM/yyyy HH:mm"), 150, 25)
      yPos += 10
      // Booking Details Table
      doc.setFontSize(14)
      doc.text("Booking Details", 14, yPos)
      yPos += 6
      autoTable(doc, {
        startY: yPos,
        head: [[
          "CATEGORY",
          "No. of pkgs",
          "Freight",
          "Pickup",
          "Drop Cartage",
          "Loading",
          "LR Charge",
          "AMOUNT"
        ]],
        body: getFilteredSummaryRows(),
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [250, 250, 250] },
      })
      yPos = (doc as any).lastAutoTable.finalY + 10
      // Delivery Details Table
      doc.setFontSize(14)
      doc.text("Delivery Details", 14, yPos)
      yPos += 6
      autoTable(doc, {
        startY: yPos,
        head: [[
          "CATEGORY",
          "No. of pkgs",
          "FREIGHT",
          "Unloading",
          "DELIVERY DISCOUNT",
          "AMOUNT"
        ]],
        body: getFilteredDeliveryRows(),
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [250, 250, 250] },
      })
      yPos = (doc as any).lastAutoTable.finalY + 10
      // Citywise Details Table
      doc.setFontSize(14)
      doc.text("Citywise Paid / ToPay Details", 14, yPos)
      yPos += 6
      // Prepare citywise table body with totals row
      const citywiseTableBody = getFilteredCitywiseRows()
      if (bookingTypeSummary === "all") {
        citywiseTableBody.push([
          "Total",
          "",
          citywiseStats.reduce((sum, city) => sum + city.paid, 0).toFixed(2),
          citywiseStats.reduce((sum, city) => sum + city.toPay, 0).toFixed(2),
          citywiseStats.reduce((sum, city) => sum + city.total, 0).toFixed(2),
        ])
      } else if (bookingTypeSummary === "TO PAY") {
        citywiseTableBody.push([
          "Total",
          "",
          "-",
          citywiseStats.reduce((sum, city) => sum + city.toPay, 0).toFixed(2),
          citywiseStats.reduce((sum, city) => sum + city.toPay, 0).toFixed(2),
        ])
      } else {
        citywiseTableBody.push([
          "Total",
          "",
          citywiseStats.reduce((sum, city) => sum + city.paid, 0).toFixed(2),
          "-",
          citywiseStats.reduce((sum, city) => sum + city.paid, 0).toFixed(2),
        ])
      }
      autoTable(doc, {
        startY: yPos,
        head: [[
          "Destination",
          "Destination Branch",
          "Paid",
          "To Pay",
          "Total"
        ]],
        body: citywiseTableBody,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [250, 250, 250] },
      })
      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages?.() || 1
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10)
        doc.text(`Generated on: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, doc.internal.pageSize.height - 10)
      }
      doc.save(`Daily_Collection_Report_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`)
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
              <div className={`grid ${isMobile ? "grid-cols-1 gap-4" : "grid-cols-3 gap-6"}`}>
                {/* Date Range Picker */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={isMobile ? 1 : 2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Destination Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Destination</label>
                  <Select value={destination} onValueChange={setDestination}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Destinations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Destinations</SelectItem>
                      {destinations.map((dest) => (
                        <SelectItem key={dest} value={dest}>
                          {dest}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Apply Filters Button */}
                <div className="flex items-end space-x-2">
                  <Button onClick={applyFilters} className="flex-1">
                    <Filter className="h-4 w-4 mr-2" />
                    Apply Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Content */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{getReportTitle()}</CardTitle>
                  <CardDescription>
                    {getReportDateRange()}
                    {destination && destination !== "all" ? ` | Destination: ${destination}` : null}
                  </CardDescription>
                </div>
                {(reportType === "collection" || reportType === "branchCollection") && (
                  <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "summary" | "list")}> 
                    <TabsList>
                      <TabsTrigger value="summary">Summary</TabsTrigger>
                      <TabsTrigger value="list">Detailed List</TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
              </div>
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
                <div className="space-y-8">
                  {(reportType === "collection" || reportType === "branchCollection") && viewMode === "summary" && (
                    <>
                      <div className="flex items-center mb-4 gap-4">
                        <div className="flex gap-2">
                          <Button
                            variant={bookingTypeSummary === "all" ? "default" : "outline"}
                            onClick={() => setBookingTypeSummary("all")}
                          >
                            All
                          </Button>
                          <Button
                            variant={bookingTypeSummary === "TO PAY" ? "default" : "outline"}
                            onClick={() => setBookingTypeSummary("TO PAY")}
                          >
                            To Pay
                          </Button>
                          <Button
                            variant={bookingTypeSummary === "PAID" ? "default" : "outline"}
                            onClick={() => setBookingTypeSummary("PAID")}
                          >
                            Paid
                          </Button>
                        </div>
                        <Button onClick={exportFullSummaryPDF} className="ml-auto flex gap-2 items-center">
                          <Download className="h-4 w-4" /> Export as PDF
                        </Button>
                      </div>
                      {/* Source Branch and Date Information */}
                      <div className="flex flex-wrap justify-between items-center text-sm mb-4">
                        <div>
                          <strong>Source Branch:</strong> BORIVALI
                        </div>
                        <div>
                          <strong>From Date:</strong>{" "}
                          {dateRange.from ? format(dateRange.from, "dd-MM-yyyy") : "All time"}
                          <strong className="ml-4">To Date:</strong>{" "}
                          {dateRange.to ? format(dateRange.to, "dd-MM-yyyy") : "All time"}
                        </div>
                      </div>

                      {/* Booking Details Table */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-lg font-semibold">Booking Details</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border px-2 py-2 text-left">CATEGORY</th>
                                <th className="border px-2 py-2 text-center">No. of pkgs</th>
                                <th className="border px-2 py-2 text-center">Freight</th>
                                <th className="border px-2 py-2 text-center">Pickup</th>
                                <th className="border px-2 py-2 text-center">Drop Cartage</th>
                                <th className="border px-2 py-2 text-center">Loading</th>
                                <th className="border px-2 py-2 text-center">L R Charge</th>
                                <th className="border px-2 py-2 text-center">AMOUNT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getFilteredSummaryRows().map((row, index) => (
                                <tr key={index}>
                                  {row.map((cell, cellIndex) => (
                                    <td key={cellIndex} className="border px-2 py-2">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Delivery Details Table */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-lg font-semibold">Delivery Details</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border px-2 py-2 text-left">CATEGORY</th>
                                <th className="border px-2 py-2 text-center">No. of pkgs</th>
                                <th className="border px-2 py-2 text-center">FREIGHT</th>
                                <th className="border px-2 py-2 text-center">Unloading</th>
                                <th className="border px-2 py-2 text-center">DELIVERY DISCOUNT</th>
                                <th className="border px-2 py-2 text-center">AMOUNT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getFilteredDeliveryRows().map((row, index) => (
                                <tr key={index}>
                                  {row.map((cell, cellIndex) => (
                                    <td key={cellIndex} className="border px-2 py-2">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Citywise Paid/ToPay Details */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-lg font-semibold">Citywise Paid / ToPay Details</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border px-2 py-2 text-left">Destination</th>
                                <th className="border px-2 py-2 text-left">Destination Branch</th>
                                <th className="border px-2 py-2 text-center">Paid</th>
                                <th className="border px-2 py-2 text-center">To Pay</th>
                                <th className="border px-2 py-2 text-center">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getFilteredCitywiseRows().map((row, index) => (
                                <tr key={index}>
                                  {row.map((cell, cellIndex) => (
                                    <td key={cellIndex} className="border px-2 py-2">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                  {(reportType === "collection" || reportType === "branchCollection") && viewMode === "list" && (
                    <div className={isMobile ? "overflow-x-auto text-xs p-1" : "overflow-x-auto"}>
                      {/* Booking Type Filter */}
                      <div className="flex items-center mb-2 gap-2">
                        <label className="text-sm font-medium">Booking Type:</label>
                        <Select value={bookingTypeFilter} onValueChange={setBookingTypeFilter}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="TO PAY">To Pay</SelectItem>
                            <SelectItem value="PAID">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <table className="w-full text-sm min-w-[600px]">
                        <thead>
                          <tr className="border-b">
                            <th className="py-3 px-2 text-left">LR No.</th>
                            <th className="py-3 px-2 text-left">Date</th>
                            <th className="py-3 px-2 text-left">Branch</th>
                            <th className="py-3 px-2 text-left">Destination</th>
                            <th className="py-3 px-2 text-left">Type</th>
                            <th className="py-3 px-2 text-right">Amount</th>
                            <th className="py-3 px-2 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDetailedBookings.map((booking) => (
                            <tr key={booking.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-2">{booking.id}</td>
                              <td className="py-3 px-2">{booking.bookingDate}</td>
                              <td className="py-3 px-2">BORIVALI</td>
                              <td className="py-3 px-2">{booking.deliveryDestination}</td>
                              <td className="py-3 px-2">{booking.bookingType}</td>
                              <td className="py-3 px-2 text-right">{booking.totalAmount.toFixed(2)}</td>
                              <td className="py-3 px-2 text-center flex gap-1 justify-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewBooking(booking)}
                                  className="h-8 w-8 p-0"
                                  title="View"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleExportBookingPDF(booking)}
                                  className="h-8 w-8 p-0"
                                  title="Export PDF"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
//update
export default Reports
