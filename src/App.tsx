
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Provider } from 'react-redux';
import { store } from '@/store/store';
import MainLayout from "@/components/MainLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import PaidBooking from "@/pages/PaidBooking";
import ToPayBooking from "@/pages/ToPayBooking";
import Delivery from "@/pages/Delivery";
import Dispatch from "@/pages/Dispatch";
import Receive from "@/pages/Receive";
import Reports from "@/pages/Reports";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";
import Search from "@/pages/Search";

const queryClient = new QueryClient();

const App = () => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/booking/paid" element={<PaidBooking />} />
                  <Route path="/booking/topay" element={<ToPayBooking />} />
                  <Route path="/dispatch" element={<Dispatch />} />
                  <Route path="/receive" element={<Receive />} />
                  <Route path="/delivery" element={<Delivery />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/search" element={<Search />} />
                </Route>
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </Provider>
);

export default App;
