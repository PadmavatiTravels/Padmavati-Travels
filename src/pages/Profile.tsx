
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, ImageIcon, FileImage, Building, CreditCard, Mail, Phone } from "lucide-react";
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
import { useIsMobile } from "@/hooks/use-mobile";

const Profile = () => {
  const { currentUser, changePassword } = useAuth();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const isMobile = useIsMobile();
  
  const { 
    companyLogo, 
    invoiceHeader, 
    companyName, 
    companyAddress, 
    companyPhone, 
    companyEmail,
    bankName,
    bankAccount,
    invoicePrefix
  } = useAppSelector(state => state.settings);
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoUrl, setLogoUrl] = useState(companyLogo);
  const [headerUrl, setHeaderUrl] = useState(invoiceHeader);
  
  // New form states for company details
  const [companyForm, setCompanyForm] = useState({
    companyName,
    companyAddress,
    companyPhone,
    companyEmail,
    invoicePrefix
  });
  
  // New form states for bank details
  const [bankForm, setBankForm] = useState({
    bankName,
    bankAccount
  });

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
      companyEmail: companyForm.companyEmail
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
      invoicePrefix
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>
      
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="invoice">Invoice Details</TabsTrigger>
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
            </Card>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResetDefaults}
              >
                Reset All Settings to Default
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
