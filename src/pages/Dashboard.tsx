
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Truck, Archive, FileText, BarChart2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  const stats = [
    {
      title: "Today's Bookings",
      value: "24",
      description: "↗︎ 12% from yesterday",
      icon: <FileText className="h-5 w-5 text-brand-primary" />,
      onClick: () => navigate("/booking/paid")
    },
    {
      title: "Pending Dispatch",
      value: "12",
      description: "↘︎ 3% from yesterday",
      icon: <Truck className="h-5 w-5 text-brand-primary" />,
      onClick: () => navigate("/dispatch")
    },
    {
      title: "Pending Delivery",
      value: "7",
      description: "↗︎ 15% from yesterday",
      icon: <Package className="h-5 w-5 text-brand-primary" />,
      onClick: () => navigate("/delivery")
    },
    {
      title: "Monthly Revenue",
      value: "₹42,500",
      description: "↗︎ 8% from last month",
      icon: <BarChart2 className="h-5 w-5 text-brand-primary" />,
      onClick: () => navigate("/reports")
    },
  ];

  const recentBookings = [
    { id: "LR00123", from: "Bangalore", to: "Kundapur", status: "Booked", date: "2025-04-12", type: "PAID" },
    { id: "LR00122", from: "Bangalore", to: "Shivammoga", status: "Dispatched", date: "2025-04-12", type: "TO PAY" },
    { id: "LR00121", from: "Bijapur", to: "Kundapur", status: "Delivered", date: "2025-04-11", type: "PAID" },
    { id: "LR00120", from: "Bangalore", to: "Bijapur", status: "In Transit", date: "2025-04-11", type: "TO PAY" },
    { id: "LR00119", from: "Shivammoga", to: "Bangalore", status: "Delivered", date: "2025-04-10", type: "PAID" },
  ];

  const pendingDeliveries = [
    { id: "LR00118", from: "Bangalore", to: "Kundapur", status: "In Transit", date: "2025-04-10", type: "PAID" },
    { id: "LR00117", from: "Bijapur", to: "Shivammoga", status: "Received", date: "2025-04-09", type: "TO PAY" },
    { id: "LR00116", from: "Bangalore", to: "Bijapur", status: "Dispatched", date: "2025-04-09", type: "PAID" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      
      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={stat.onClick}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {stat.title}
              </CardTitle>
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
              <CardDescription>
                Bookings from the last 3 days
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((booking) => (
                      <tr key={booking.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">{booking.id}</td>
                        <td className="py-3 px-2">{booking.from}</td>
                        <td className="py-3 px-2">{booking.to}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${booking.type === "PAID" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                            {booking.type}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs 
                            ${booking.status === "Delivered" ? "bg-green-100 text-green-800" : 
                              booking.status === "In Transit" ? "bg-yellow-100 text-yellow-800" : 
                              booking.status === "Booked" ? "bg-purple-100 text-purple-800" : 
                              "bg-blue-100 text-blue-800"}`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="py-3 px-2">{booking.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="deliveries" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Deliveries</CardTitle>
              <CardDescription>
                Bookings awaiting delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                    </tr>
                  </thead>
                  <tbody>
                    {pendingDeliveries.map((delivery) => (
                      <tr key={delivery.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">{delivery.id}</td>
                        <td className="py-3 px-2">{delivery.from}</td>
                        <td className="py-3 px-2">{delivery.to}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${delivery.type === "PAID" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                            {delivery.type}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs 
                            ${delivery.status === "Delivered" ? "bg-green-100 text-green-800" : 
                              delivery.status === "In Transit" ? "bg-yellow-100 text-yellow-800" : 
                              delivery.status === "Booked" ? "bg-purple-100 text-purple-800" : 
                              "bg-blue-100 text-blue-800"}`}>
                            {delivery.status}
                          </span>
                        </td>
                        <td className="py-3 px-2">{delivery.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
