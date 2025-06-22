"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
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
import { Package, Truck, FileText, BarChart2, Trash2, Edit, Eye } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { getRecentBookings, deleteBooking } from "@/services/bookingService"
import type { Booking } from "@/models/booking"
import { useToast } from "@/hooks/use-toast"
import { viewInvoicePDF } from "@/utils/pdfGenerator"

const Dashboard = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [recentBookings, setRecentBookings] = useState<Booking[]>([])
  const [pendingDeliveries, setPendingDeliveries] = useState<Booking[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    todayBookings: 0,
    pendingDispatch: 0,
    pendingDelivery: 0,
    monthlyRevenue: 0,
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      // Get recent bookings (last 50)
      const bookings = await getRecentBookings(50)

      // Filter for recent bookings (last 5)
      const recent = bookings.slice(0, 5)
      setRecentBookings(recent)

      // Filter for pending deliveries (status = "Received")
      const pendingDelivery = bookings.filter((booking) => booking.status === "Received").slice(0, 5)
      setPendingDeliveries(pendingDelivery)

      // Calculate stats
      const today = new Date().toISOString().split("T")[0]
      const todayBookings = bookings.filter((booking) => booking.bookingDate === today).length

      const pendingDispatch = bookings.filter((booking) => booking.status === "Booked").length
      const pendingDeliveryCount = bookings.filter((booking) => booking.status === "Received").length

      // Calculate monthly revenue
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const monthlyRevenue = bookings
        .filter((booking) => {
          const bookingDate = new Date(booking.bookingDate)
          return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear
        })
        .reduce((total, booking) => total + (booking.totalAmount || 0), 0)

      setStats({
        todayBookings,
        pendingDispatch,
        pendingDelivery: pendingDeliveryCount,
        monthlyRevenue,
      })
    } catch (error) {
      console.error("Error loading dashboard data:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
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
      
      // Refresh the dashboard data
      await loadDashboardData()
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

  const handleViewBooking = (booking: Booking) => {
    viewInvoicePDF(booking)
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

  const dashboardStats = [
    {
      title: "Today's Bookings",
      value: stats.todayBookings.toString(),
      description: "New bookings today",
      icon: <FileText className="h-5 w-5 text-brand-primary" />,
      onClick: () => navigate("/booking/paid"),
    },
    {
      title: "Pending Dispatch",
      value: stats.pendingDispatch.toString(),
      description: "Bookings to dispatch",
      icon: <Truck className="h-5 w-5 text-brand-primary" />,
      onClick: () => navigate("/dispatch"),
    },
    {
      title: "Pending Delivery",
      value: stats.pendingDelivery.toString(),
      description: "Bookings to deliver",
      icon: <Package className="h-5 w-5 text-brand-primary" />,
      onClick: () => navigate("/delivery"),
    },
    {
      title: "Monthly Revenue",
      value: `₹${stats.monthlyRevenue.toFixed(0)}`,
      description: "Revenue this month",
      icon: <BarChart2 className="h-5 w-5 text-brand-primary" />,
      onClick: () => navigate("/reports"),
    },
  ]

  const BookingRow = ({ booking, showActions = true }: { booking: Booking; showActions?: boolean }) => (
    <tr key={booking.id} className="border-b hover:bg-gray-50">
      <td className="py-3 px-2">{booking.id}</td>
      <td className="py-3 px-2">{booking.consignorName}</td>
      <td className="py-3 px-2">{booking.deliveryDestination}</td>
      <td className="py-3 px-2">
        <span
          className={`px-2 py-1 rounded-full text-xs ${booking.bookingType === "PAID" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}
        >
          {booking.bookingType}
        </span>
      </td>
      <td className="py-3 px-2">
        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(booking.status)}`}>
          {booking.status}
        </span>
      </td>
      <td className="py-3 px-2">{booking.bookingDate}</td>
      {showActions && (
        <td className="py-3 px-2">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewBooking(booking)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditBooking(booking.id)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={deletingId === booking.id}
                >
                  <Trash2 className="h-4 w-4" />
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
      )}
    </tr>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardStats.map((stat, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={stat.onClick}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activities */}
      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bookings">Recent Bookings</TabsTrigger>
          <TabsTrigger value="deliveries">Pending Deliveries</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>Latest bookings in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-primary"></div>
                </div>
              ) : recentBookings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No recent bookings found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-3 px-2 text-left">LR No.</th>
                        <th className="py-3 px-2 text-left">From</th>
                        <th className="py-3 px-2 text-left">To</th>
                        <th className="py-3 px-2 text-left">Type</th>
                        <th className="py-3 px-2 text-left">Status</th>
                        <th className="py-3 px-2 text-left">Date</th>
                        <th className="py-3 px-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBookings.map((booking) => (
                        <BookingRow key={booking.id} booking={booking} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Deliveries</CardTitle>
              <CardDescription>Bookings awaiting delivery</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-primary"></div>
                </div>
              ) : pendingDeliveries.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No pending deliveries found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-3 px-2 text-left">LR No.</th>
                        <th className="py-3 px-2 text-left">From</th>
                        <th className="py-3 px-2 text-left">To</th>
                        <th className="py-3 px-2 text-left">Type</th>
                        <th className="py-3 px-2 text-left">Status</th>
                        <th className="py-3 px-2 text-left">Date</th>
                        <th className="py-3 px-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingDeliveries.map((delivery) => (
                        <BookingRow key={delivery.id} booking={delivery} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Dashboard