
import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Home, 
  Package, 
  Truck, 
  Archive, 
  FileText, 
  BarChart2, 
  LogOut, 
  User, 
  Search,
  BookOpen, 
  Menu, 
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

const MainLayout = () => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      // Only handle shortcuts if not in an input field
      if (document.activeElement instanceof HTMLInputElement || 
          document.activeElement instanceof HTMLTextAreaElement) {
        return;
      }
      
      // F7 - PAID Form
      if (e.key === "F7") {
        e.preventDefault();
        navigate("/booking/paid");
        toast({
          title: "Shortcut Used",
          description: "Navigated to PAID form",
        });
      }
      
      // F8 - TO PAY Form
      if (e.key === "F8") {
        e.preventDefault();
        navigate("/booking/topay");
        toast({
          title: "Shortcut Used",
          description: "Navigated to TO PAY form",
        });
      }
      
      // Alt + X - Delivery
      if (e.key === "x" && e.altKey) {
        e.preventDefault();
        navigate("/delivery");
        toast({
          title: "Shortcut Used",
          description: "Navigated to Delivery page",
        });
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcuts);
    
    return () => {
      window.removeEventListener("keydown", handleKeyboardShortcuts);
    };
  }, [navigate]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navItems = [
    { to: "/", label: "Home", icon: <Home size={20} /> },
    { 
      to: "#", 
      label: "Booking", 
      icon: <BookOpen size={20} />,
      children: [
        { to: "/booking/paid", label: "PAID (F7)", icon: <FileText size={20} /> },
        { to: "/booking/topay", label: "TO PAY (F8)", icon: <FileText size={20} /> },
      ] 
    },
    { to: "/dispatch", label: "Dispatch", icon: <Truck size={20} /> },
    { to: "/receive", label: "Receive", icon: <Archive size={20} /> },
    { to: "/delivery", label: "Delivery", icon: <Package size={20} /> },
    { to: "/search", label: "Search", icon: <Search size={20} /> },
    { to: "/reports", label: "Reports", icon: <BarChart2 size={20} /> },
    { to: "/profile", label: "Profile", icon: <User size={20} /> },
  ];

  interface NavItem {
    to: string;
    label: string;
    icon: React.ReactNode;
    children?: NavItem[];
  }

  const renderNavItem = (item: NavItem, index: number) => {
    // If item has children, render a dropdown
    if (item.children) {
      return (
        <div key={index} className="relative group">
          <div className={`nav-link cursor-pointer`}>
            {item.icon}
            <span>{item.label}</span>
          </div>
          <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 hidden group-hover:block z-50">
            <div className="py-1">
              {item.children.map((child: NavItem, childIndex: number) => (
                <NavLink
                  key={childIndex}
                  to={child.to}
                  className={({ isActive }) => 
                    `block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${isActive ? 'bg-gray-100' : ''}`
                  }
                >
                  <div className="flex items-center gap-2">
                    {child.icon}
                    <span>{child.label}</span>
                  </div>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      );
    }
    
    // Regular nav item
    return (
      <NavLink
        key={index}
        to={item.to}
        className={({ isActive }) => 
          `nav-link ${isActive ? 'active' : ''}`
        }
      >
        {item.icon}
        <span>{item.label}</span>
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-brand-primary text-white shadow-md z-10">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {isMobile && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="text-white mr-2"
                >
                  {menuOpen ? <X size={24} /> : <Menu size={24} />}
                </Button>
              )}
              <h1 className="text-xl font-bold">Padmavati Travels</h1>
            </div>
            <div className="flex items-center gap-4">
              {currentUser && (
                <>
                  <span className="hidden md:block">
                    {currentUser.email?.split('@')[0]}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleLogout}
                    className="text-white hover:bg-white/20"
                  >
                    <LogOut size={20} className="mr-2" />
                    <span className="hidden md:inline">Logout</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className={`flex flex-col md:flex-row flex-1`}>
        {/* Navigation sidebar - only shown on desktop or when menu is open on mobile */}
        {(!isMobile || (isMobile && menuOpen)) && (
          <nav className={`
            ${isMobile ? 'fixed inset-0 z-50 bg-white/95 w-full pt-16' : 'w-64 bg-gray-50 shadow-md'}
          `}>
            <div className="p-4 space-y-1">
              {navItems.map(renderNavItem)}
            </div>
          </nav>
        )}

        {/* Main content area */}
        <main className={`flex-1 p-4 bg-gray-100`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
