import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, ImageIcon, FileImage, Building, CreditCard, Mail, Phone, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { 
  updateCompanyLogo, 
  updateInvoiceHeader, 
  updateCompanyDetails, 
  updateBankDetails,
  updateInvoicePrefix,
  resetToDefaults 
} from "@/store/settingsSlice";
import { addDestinationAsync, addArticleTypeAsync } from "@/store/bookingSlice";
import { useIsMobile } from "@/hooks/use-mobile";
import { doc, updateDoc, arrayUnion, getFirestore, setDoc } from "firebase/firestore";

const Profile = () => {
  const { currentUser, changePassword } = useAuth();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const isMobile = useIsMobile();
  const db = getFirestore();
  
  const { 
    companyLogo, 
    invoiceHeader, 
    companyName, 
    companyAddress, 
    companyPhone, 
    companyEmail,
    bankName,
    bankAccount,
    invoicePrefix,
    branchName,
    branchAddress
  } = useAppSelector(state => state.settings);

  const destinations = useAppSelector(state => state.booking.destinations);
  const articleTypes = useAppSelector(state => state.booking.articleTypes);
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoUrl, setLogoUrl] = useState(companyLogo);
  const [headerUrl, setHeaderUrl] = useState(invoiceHeader);
  
  // Loading states for async operations
  const [isAddingDestination, setIsAddingDestination] = useState(false);
  const [isAddingArticleType, setIsAddingArticleType] = useState(false);
  
  // New form states for company details
  const [companyForm, setCompanyForm] = useState({
    companyName,
    companyAddress,
    companyPhone,
    companyEmail,
    invoicePrefix,
    branchName,
    branchAddress
  });
  
  // New form states for bank details
  const [bankForm, setBankForm] = useState({
    bankName,
    bankAccount
  });

  // States for managing dropdown options
  const [newDestination, setNewDestination] = useState("");
  const [newArticleType, setNewArticleType] = useState("");

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleCompanyFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCompanyForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleBankFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBankForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New password and confirm password do not match",
        variant: "destructive",
      });
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password should be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setIsChangingPassword(false);
      
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
    } catch (error) {
      console.error("Password change error:", error);
      toast({
        title: "Error",
        description: "Failed to change password. Please check your current password.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSaveCompanyLogo = () => {
    dispatch(updateCompanyLogo(logoUrl));
    toast({
      title: "Success",
      description: "Company logo updated successfully",
    });
  };
  
  const handleSaveInvoiceHeader = () => {
    dispatch(updateInvoiceHeader(headerUrl));
    toast({
      title: "Success",
      description: "Invoice header updated successfully",
    });
  };
  
  const handleSaveCompanyDetails = () => {
    dispatch(updateCompanyDetails({
      companyName: companyForm.companyName,
      companyAddress: companyForm.companyAddress,
      companyPhone: companyForm.companyPhone,
      companyEmail: companyForm.companyEmail,
      branchName: companyForm.branchName,
      branchAddress: companyForm.branchAddress
    }));
    
    dispatch(updateInvoicePrefix(companyForm.invoicePrefix));
    
    toast({
      title: "Success",
      description: "Company details updated successfully",
    });
  };
  
  const handleSaveBankDetails = () => {
    dispatch(updateBankDetails({
      bankName: bankForm.bankName,
      bankAccount: bankForm.bankAccount
    }));
    
    toast({
      title: "Success",
      description: "Bank details updated successfully",
    });
  };
  
  const handleResetDefaults = () => {
    dispatch(resetToDefaults());
    setLogoUrl(companyLogo);
    setHeaderUrl(invoiceHeader);
    setCompanyForm({
      companyName,
      companyAddress,
      companyPhone,
      companyEmail,
      invoicePrefix,
      branchName,
      branchAddress
    });
    setBankForm({
      bankName,
      bankAccount
    });
    toast({
      title: "Reset Complete",
      description: "All settings reset to defaults",
    });
  };

  const handleAddDestination = async () => {
    if (newDestination.trim() === "") {
      toast({
        title: "Error",
        description: "Destination cannot be empty",
        variant: "destructive",
      });
      return;
    }
    if (destinations.includes(newDestination.trim())) {
      toast({
        title: "Error",
        description: "Destination already exists",
        variant: "destructive",
      });
      return;
    }
    
    setIsAddingDestination(true);
    
    try {
      // Direct Firebase update as a fallback if Redux thunk is failing
      if (currentUser) {
        const userDoc = doc(db, "users", currentUser.uid);
        await setDoc(userDoc, {
          "bookingData.destinations": arrayUnion(newDestination.trim())
        }, { merge: true });
        
        // Also dispatch the Redux action to keep state in sync
        await dispatch(addDestinationAsync(newDestination.trim())).unwrap();
      } else {
        throw new Error("No user authenticated");
      }
      
      setNewDestination("");
      toast({
        title: "Success",
        description: "Destination added successfully",
      });
    } catch (error) {
      console.error("Error adding destination:", error);
      toast({
        title: "Error",
        description: "Failed to add destination. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingDestination(false);
    }
  };

  const handleAddArticleType = async () => {
    if (newArticleType.trim() === "") {
      toast({
        title: "Error",
        description: "Article type cannot be empty",
        variant: "destructive",
      });
      return;
    }
    if (articleTypes.includes(newArticleType.trim())) {
      toast({
        title: "Error",
        description: "Article type already exists",
        variant: "destructive",
      });
      return;
    }
    
    setIsAddingArticleType(true);
    
    try {
      // Direct Firebase update as a fallback if Redux thunk is failing
      if (currentUser) {
        const userDoc = doc(db, "users", currentUser.uid);
        await setDoc(userDoc, {
          "bookingData.articleTypes": arrayUnion(newArticleType.trim())
        }, { merge: true });
        
        // Also dispatch the Redux action to keep state in sync
        await dispatch(addArticleTypeAsync(newArticleType.trim())).unwrap();
      } else {
        throw new Error("No user authenticated");
      }
      
      setNewArticleType("");
      toast({
        title: "Success",
        description: "Article type added successfully",
      });
    } catch (error) {
      console.error("Error adding article type:", error);
      toast({
        title: "Error",
        description: "Failed to add article type. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingArticleType(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>
      
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="invoice">Invoice Details</TabsTrigger>
          <TabsTrigger value="dropdowns">Dropdown Options</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-brand-primary" />
                  <CardTitle>User Information</CardTitle>
                </div>
                <CardDescription>Your account details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Email</Label>
                    <div className="mt-1 p-2 bg-gray-50 rounded border">
                      {currentUser?.email}
                    </div>
                  </div>
                  
                  <div>
                    <Label>User ID</Label>
                    <div className="mt-1 p-2 bg-gray-50 rounded border truncate">
                      {currentUser?.uid}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Account Created</Label>
                    <div className="mt-1 p-2 bg-gray-50 rounded border">
                      {currentUser?.metadata.creationTime ? 
                        new Date(currentUser.metadata.creationTime).toLocaleDateString() : 
                        "Not available"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Password Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-brand-primary" />
                  <CardTitle>Password Management</CardTitle>
                </div>
                <CardDescription>
                  Change your account password
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isChangingPassword ? (
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        className="bg-brand-primary hover:bg-brand-primary/90"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Changing..." : "Change Password"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setIsChangingPassword(false)}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <p className="text-gray-500 mb-4">
                      You can change your password for security reasons or reset it if you forget it.
                    </p>
                    <Button 
                      className="bg-brand-primary hover:bg-brand-primary/90"
                      onClick={() => setIsChangingPassword(true)}
                    >
                      Change Password
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="branding" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Logo */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-brand-primary" />
                  <CardTitle>Company Logo</CardTitle>
                </div>
                <CardDescription>
                  Update your company logo for invoices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border p-4 rounded flex justify-center">
                  <img 
                    src={logoUrl} 
                    alt="Company Logo Preview" 
                    className="max-h-32 object-contain"
                    onError={() => setLogoUrl("https://i.postimg.cc/X72njpf6/Blue-and-Yellow-Illustrative-Travel-Agency-Logo.png")} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    placeholder="Enter image URL for logo"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">Enter a direct URL to your company logo image</p>
                </div>
                
                <Button
                  className="bg-brand-primary hover:bg-brand-primary/90 w-full"
                  onClick={handleSaveCompanyLogo}
                >
                  Save Logo
                </Button>
              </CardContent>
            </Card>
            
            {/* Invoice Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileImage className="h-5 w-5 text-brand-primary" />
                  <CardTitle>Invoice Header</CardTitle>
                </div>
                <CardDescription>
                  Customize the header image for your invoices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border p-4 rounded flex justify-center">
                  <img 
                    src={headerUrl} 
                    alt="Invoice Header Preview" 
                    className="w-full object-contain"
                    onError={() => setHeaderUrl("https://i.postimg.cc/P5thQd25/Blue-Modern-Company-Email-Header.png")} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="headerUrl">Header URL</Label>
                  <Input
                    id="headerUrl"
                    placeholder="Enter image URL for invoice header"
                    value={headerUrl}
                    onChange={(e) => setHeaderUrl(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">Enter a direct URL to your invoice header image</p>
                </div>
                
                <Button
                  className="bg-brand-primary hover:bg-brand-primary/90 w-full"
                  onClick={handleSaveInvoiceHeader}
                >
                  Save Header
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="invoice" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-brand-primary" />
                  <CardTitle>Company Details</CardTitle>
                </div>
                <CardDescription>
                  Update your company information that appears on invoices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    placeholder="Your Company Name"
                    value={companyForm.companyName}
                    onChange={handleCompanyFormChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Address</Label>
                  <Input
                    id="companyAddress"
                    name="companyAddress"
                    placeholder="Company Address"
                    value={companyForm.companyAddress}
                    onChange={handleCompanyFormChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="branchName">Branch Name</Label>
                  <Input
                    id="branchName"
                    name="branchName"
                    placeholder="Branch Name"
                    value={companyForm.branchName}
                    onChange={handleCompanyFormChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="branchAddress">Branch Address</Label>
                  <Input
                    id="branchAddress"
                    name="branchAddress"
                    placeholder="Branch Address"
                    value={companyForm.branchAddress}
                    onChange={handleCompanyFormChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Phone</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <Input
                      id="companyPhone"
                      name="companyPhone"
                      placeholder="Phone Number"
                      value={companyForm.companyPhone}
                      onChange={handleCompanyFormChange}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Email</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <Input
                      id="companyEmail"
                      name="companyEmail"
                      placeholder="Email Address"
                      value={companyForm.companyEmail}
                      onChange={handleCompanyFormChange}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="invoicePrefix">Invoice Number Prefix</Label>
                  <Input
                    id="invoicePrefix"
                    name="invoicePrefix"
                    placeholder="INV"
                    value={companyForm.invoicePrefix}
                    onChange={handleCompanyFormChange}
                  />
                  <p className="text-xs text-gray-500">This prefix will be used for all invoice numbers (e.g., INV-12345)</p>
                </div>
                
                <Button
                  className="bg-brand-primary hover:bg-brand-primary/90 w-full"
                  onClick={handleSaveCompanyDetails}
                >
                  Save Company Details
                </Button>
              </CardContent>
            </Card>
            
            {/* Payment Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-brand-primary" />
                  <CardTitle>Payment Information</CardTitle>
                </div>
                <CardDescription>
                  Update your payment information that appears on invoices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    name="bankName"
                    placeholder="Bank Name"
                    value={bankForm.bankName}
                    onChange={handleBankFormChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bankAccount">Account Number / UPI ID</Label>
                  <Input
                    id="bankAccount"
                    name="bankAccount"
                    placeholder="Account Number or UPI ID"
                    value={bankForm.bankAccount}
                    onChange={handleBankFormChange}
                  />
                </div>
                
                <Button
                  className="bg-brand-primary hover:bg-brand-primary/90 w-full mt-4"
                  onClick={handleSaveBankDetails}
                >
                  Save Payment Details
                </Button>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-center">
                <Button
                  variant="outline"
                  className="text-red-500 border-red-300 hover:bg-red-50"
                  onClick={handleResetDefaults}
                >
                  Reset All Settings to Default
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="dropdowns" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage Destinations</CardTitle>
              <CardDescription>Add new delivery destinations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="New Destination"
                  value={newDestination}
                  onChange={(e) => setNewDestination(e.target.value)}
                  disabled={isAddingDestination}
                />
                <Button 
                  onClick={handleAddDestination} 
                  className="bg-brand-primary hover:bg-brand-primary/90"
                  disabled={isAddingDestination}
                >
                  {isAddingDestination ? (
                    <span className="flex items-center gap-1">
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </span>
                  ) : (
                    <>
                      <Plus size={16} />
                      Add
                    </>
                  )}
                </Button>
              </div>
              <ul className="mt-2 list-disc list-inside">
                {destinations.map((dest, idx) => (
                  <li key={idx}>{dest}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manage Article Types</CardTitle>
              <CardDescription>Add new article types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="New Article Type"
                  value={newArticleType}
                  onChange={(e) => setNewArticleType(e.target.value)}
                  disabled={isAddingArticleType}
                />
                <Button 
                  onClick={handleAddArticleType} 
                  className="bg-brand-primary hover:bg-brand-primary/90"
                  disabled={isAddingArticleType}
                >
                  {isAddingArticleType ? (
                    <span className="flex items-center gap-1">
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </span>
                  ) : (
                    <>
                      <Plus size={16} />
                      Add
                    </>
                  )}
                </Button>
              </div>
              <ul className="mt-2 list-disc list-inside">
                {articleTypes.map((type, idx) => (
                  <li key={idx}>{type}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;