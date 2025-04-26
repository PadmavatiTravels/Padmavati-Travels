'use client'

import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2, X } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import type { Article, BookingType } from "@/models/booking"
import { 
  createBooking, 
  calculateWeightAmount, 
  calculateTotalArticleAmount, 
  addDropdownOption, 
  getPreviousValues,
  savePreviousValues
} from "@/services/bookingService"
import {
  saveConsigneeDetails,
  getConsigneeByDestination
} from "@/services/consigneeService"
import {
  saveDestinationAddress,
  fetchDestinationAddress
} from "@/services/destinationService"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { downloadInvoicePDF } from "@/utils/pdfGenerator"
import { useAppSelector } from "@/hooks/useAppSelector"

// Define field history type for storing previous entries
type FieldHistory = {
  [fieldName: string]: string[];
}

const BookingForm: React.FC<{ formType: BookingType; onBookingCreated?: (id: string) => void }> = ({ formType, onBookingCreated }) => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const destinations = useAppSelector(state => state.booking.destinations)
  const articleTypes = useAppSelector(state => state.booking.articleTypes)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTypingDestination, setIsTypingDestination] = useState(false)
  const [isTypingArticleType, setIsTypingArticleType] = useState(false)
  const customDestinationRef = useRef<HTMLInputElement>(null)
  const customArticleTypeRef = useRef<HTMLInputElement>(null)
  const [bookingId, setBookingId] = useState("1B/12535")
  
  // State for field history and suggestions
  const [fieldHistory, setFieldHistory] = useState<FieldHistory>({})
  const [activeSuggestionField, setActiveSuggestionField] = useState<string | null>(null)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  const [formData, setFormData] = useState({
    deliveryDestination: "",
    consignorName: "",
    consignorMobile: "",
    consignorAddress: "",
    consigneeName: "",
    consigneeMobile: "",
    consigneeAddress: "",
    consignorGST: "",
    consigneeGST: "",
    formType: "E-Waybill",
    invoiceNo: "",
    declaredValue: 0,
    saidToContain: "",
    remarks: "",
    fixAmount: 0,
    godown: "",
    status: "Booked"
  })

  // Autofill related address when deliveryDestination changes
  useEffect(() => {
    const autofillAddress = async () => {
      if (formData.deliveryDestination) {
        const addressData = await fetchDestinationAddress(formData.deliveryDestination);
        if (addressData) {
          setFormData(prev => ({
            ...prev,
            consignorAddress: addressData.consignorAddress || prev.consignorAddress,
            consigneeAddress: addressData.consigneeAddress || prev.consigneeAddress,
          }));
        }
      }
    };
    autofillAddress();
  }, [formData.deliveryDestination]);


  const [charges, setCharges] = useState({
    freight: 0,
    pickup: 0,
    dropCartage: 0,
    loading: 0,
    lrCharge: 0,
    sgst: 0,
    cgst: 0,
    igst: 0,
    grandTotal: 0
  })

  const [articles, setArticles] = useState<Article[]>([
    {
      id: uuidv4(),
      articleName: "",
      actualWeight: 0,
      chargedWeight: 0,
      artType: articleTypes.length > 0 ? articleTypes[0] : "Box",
      weightRate: 0,
      weightAmount: 0,
      quantity: 1,
      saidToContain: "",
      articleAmount: 0
    },
  ])

  // Load field history from Firebase on component mount
  useEffect(() => {
    const loadFieldHistory = async () => {
      try {
        const history = await getPreviousValues();
        console.log("Field history structure:", history);
        setFieldHistory(history);
      } catch (error) {
        console.error("Error loading field history:", error);
      }
    };
    
    loadFieldHistory();
  }, []);

  // Update suggestions when a field is being typed in
  useEffect(() => {
    if (activeSuggestionField && searchTerm) {
      const fieldValues = fieldHistory[activeSuggestionField] || [];
      // Ensure fieldValues is an array before calling filter
      const values = Array.isArray(fieldValues) ? fieldValues : [];
      const matches = values.filter(value => 
        value.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSuggestions(matches);
    } else {
      setFilteredSuggestions([]);
    }
  }, [activeSuggestionField, searchTerm, fieldHistory]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: name.includes("Amount") || name === "declaredValue" ? Number.parseFloat(value) || 0 : value,
    }))

    // Set active suggestion field and search term
    setActiveSuggestionField(name);
    setSearchTerm(value);
  }

  const handleChargesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const numValue = Number.parseFloat(value) || 0

    // Update active suggestion for charges fields too
    setActiveSuggestionField(name);
    setSearchTerm(value);

    setCharges(prev => {
      const newCharges = {
        ...prev,
        [name]: numValue
      }

      
      // Calculate taxes including article amount
      const baseAmount = newCharges.freight + newCharges.pickup + newCharges.dropCartage + 
                         newCharges.loading + newCharges.lrCharge + articleAmount

      // Assuming 2.5% for SGST and CGST, 5% for IGST
      newCharges.sgst = formData.deliveryDestination !== "Interstate" ? baseAmount * 0.025 : 0
      newCharges.cgst = formData.deliveryDestination !== "Interstate" ? baseAmount * 0.025 : 0
      newCharges.igst = formData.deliveryDestination === "Interstate" ? baseAmount * 0.05 : 0
      
      // Calculate grand total including fixed amount
      newCharges.grandTotal = baseAmount + newCharges.sgst + newCharges.cgst + newCharges.igst + formData.fixAmount
      
      return newCharges
    })
  }

  const handleSelectChange = (name: string, value: string) => {
    if (name === "deliveryDestination" && value === "add-new") {
      setIsTypingDestination(true)
      setTimeout(() => {
        customDestinationRef.current?.focus()
      }, 100)
      return
    }

    if (name === "artType" && value === "add-new") {
      setIsTypingArticleType(true)
      setTimeout(() => {
        customArticleTypeRef.current?.focus()
      }, 100)
      return
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Save the selected value to field history
    saveToFieldHistory(name, value);
    
    // If destination is selected, fetch consignee details
    if (name === "deliveryDestination" && value && value !== "add-new") {
      fetchConsigneeDetails(value);
    }
  }

  // Add this new function to fetch and populate consignee details
  const fetchConsigneeDetails = async (destination: string) => {
    try {
      const consigneeDetails = await getConsigneeByDestination(destination);
      if (consigneeDetails) {
        // Update form with consignee details
        setFormData(prev => ({
          ...prev,
          consigneeName: consigneeDetails.name || prev.consigneeName,
          consigneeMobile: consigneeDetails.mobile || prev.consigneeMobile,
          consigneeAddress: consigneeDetails.address || prev.consigneeAddress,
          consigneeGST: consigneeDetails.gstNo || prev.consigneeGST
        }));
        
        toast({
          title: "Consignee Details Loaded",
          description: `Loaded details for ${consigneeDetails.name}`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error fetching consignee details:", error);
    }
  };

  const handleCustomDestinationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      deliveryDestination: e.target.value,
    }))

    // Update search for custom destinations
    setActiveSuggestionField("deliveryDestination");
    setSearchTerm(e.target.value);
  }

  const selectSuggestion = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
    setFilteredSuggestions([]);
    setActiveSuggestionField(null);
  }

  const saveToFieldHistory = (fieldName: string, value: string) => {
    if (!value.trim()) return;
    
    setFieldHistory(prev => {
      // Check if this value is already in the history
      const existingValues = prev[fieldName] || [];
      if (!existingValues.includes(value)) {
        const newHistory = {
          ...prev,
          [fieldName]: [...existingValues, value]
        };
        // Save to Firebase
        savePreviousValues(newHistory);
        return newHistory;
      }
      return prev;
    });
  }

  const cancelCustomDestination = () => {
    setIsTypingDestination(false)
    setFormData((prev) => ({
      ...prev,
      deliveryDestination: "",
    }))
  }

  const handleArticleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const updatedArticles = [...articles]

    if (name === "actualWeight" || name === "chargedWeight" || name === "weightRate" || name === "articleAmount" || name === "quantity") {
      updatedArticles[index] = {
        ...updatedArticles[index],
        [name]: Number.parseFloat(value) || 0,
      }

      // Recalculate weight amount
      if (name === "actualWeight" || name === "chargedWeight" || name === "weightRate") {
        updatedArticles[index].weightAmount = calculateWeightAmount(updatedArticles[index])
      }
    } else {
      updatedArticles[index] = {
        ...updatedArticles[index],
        [name]: value,
      }

      // Save value to field history
      saveToFieldHistory(`article_${name}`, value);
    }

    setArticles(updatedArticles)
  }

  const handleArticleTypeChange = (index: number, value: string) => {
    const updatedArticles = [...articles]
    updatedArticles[index] = {
      ...updatedArticles[index],
      artType: value,
    }
    setArticles(updatedArticles)
    
    // Save selected article type to history
    saveToFieldHistory("articleType", value);
  }

  const addArticle = () => {
    setArticles([
      ...articles,
      {
        id: uuidv4(),
        articleName: "",
        actualWeight: 0,
        chargedWeight: 0,
        artType: articleTypes.length > 0 ? articleTypes[0] : "Box",
        weightRate: 0,
        weightAmount: 0,
        quantity: 1,
        saidToContain: "",
        articleAmount: 0
      },
    ])
  }

  const removeArticle = (index: number) => {
    if (articles.length === 1) {
      toast({
        title: "Cannot Remove",
        description: "At least one article is required",
        variant: "destructive",
      })
      return
    }

    const updatedArticles = [...articles]
    updatedArticles.splice(index, 1)
    setArticles(updatedArticles)
  }

  const calculateTotals = () => {
    const articleAmount = calculateTotalArticleAmount(articles)
    const totalAmount = formData.fixAmount + articleAmount

    return {
      articleAmount,
      totalAmount,
    }
  }

  const { articleAmount, totalAmount } = calculateTotals()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!formData.deliveryDestination) {
      toast({
        title: "Validation Error",
        description: "Please select or enter a delivery destination",
        variant: "destructive",
      })
      return
    }

    // Save destination-address mapping when booking is created
    if (formData.deliveryDestination) {
      await saveDestinationAddress(formData.deliveryDestination, {
        consignorAddress: formData.consignorAddress,
        consigneeAddress: formData.consigneeAddress,
      });
    }
    
    // Save consignee details for future autofill
    if (formData.deliveryDestination && formData.consigneeName && formData.consigneeMobile) {
      try {
        await saveConsigneeDetails(formData.deliveryDestination, {
          name: formData.consigneeName,
          mobile: formData.consigneeMobile,
          address: formData.consigneeAddress || "",
          gstNo: formData.consigneeGST || ""
        });
      } catch (saveError) {
        console.error("Error saving consignee details:", saveError);
      }
    }

    if (!formData.consignorName || !formData.consignorMobile) {
      toast({
        title: "Validation Error",
        description: "Consignor name and mobile are required",
        variant: "destructive",
      })
      return
    }

    if (!formData.consigneeName || !formData.consigneeMobile) {
      toast({
        title: "Validation Error",
        description: "Consignee name and mobile are required",
        variant: "destructive",
      })
      return
    }

    // Validate articles
    const invalidArticles = articles.filter((a) => !a.articleName || a.actualWeight <= 0 || a.weightRate <= 0)
    if (invalidArticles.length > 0) {
      toast({
        title: "Validation Error",
        description: "All articles must have a name, weight, and rate",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const today = new Date().toISOString().split("T")[0]

      // Check if destination is new and save it to Firebase
      const isNewDestination = !destinations.includes(formData.deliveryDestination)
      if (isNewDestination && formData.deliveryDestination) {
        await addDropdownOption("destinations", formData.deliveryDestination)
      }

      // Check for new article types and save them to Firebase
      const newArticleTypes: string[] = []
      for (const article of articles) {
        if (article.artType && !articleTypes.includes(article.artType)) {
          if (!newArticleTypes.includes(article.artType)) {
            newArticleTypes.push(article.artType)
            await addDropdownOption("articleTypes", article.artType)
          }
        }
      }

      // Save all form values to field history
      const formDataToSave = {
        ...formData,
        consignorName: formData.consignorName,
        consignorMobile: formData.consignorMobile,
        consignorAddress: formData.consignorAddress,
        consignorGST: formData.consignorGST || "",
        consigneeName: formData.consigneeName,
        consigneeMobile: formData.consigneeMobile,
        consigneeAddress: formData.consigneeAddress,
        consigneeGST: formData.consigneeGST || "",
        invoiceNo: formData.invoiceNo,
        remarks: formData.remarks,
        godown: formData.godown
      };

      // Save all values to field history in Firebase
      await savePreviousValues(formDataToSave);

      // Save article values too
      for (const article of articles) {
        if (article.articleName) saveToFieldHistory("articleName", article.articleName);
        if (article.saidToContain) saveToFieldHistory("saidToContain", article.saidToContain);
      }

      const bookingData = {
        bookingType: formType,
        bookingDate: today,
        ...formData,
        articles,
        articleAmount,
        totalAmount: charges.grandTotal,
        totalArticles: articles.length,
        charges,
        status: formData.status,
      }

      toast({
        title: "Creating Booking",
        description: "Please wait while we create your booking...",
        variant: "default",
      })

      const newBooking = await createBooking(bookingData)

      toast({
        title: "Success",
        description: `Booking created successfully with LR number: ${newBooking.id}`,
        variant: "default",
      })

      if (onBookingCreated) {
        onBookingCreated(newBooking.id)
      }

      if (isNewDestination) {
        toast({
          title: "New Destination Added",
          description: `"${formData.deliveryDestination}" has been added to destinations`,
          variant: "default",
        })
      }

      // Show toast for new article types
      if (newArticleTypes.length > 0) {
        toast({
          title: "New Article Type(s) Added",
          description: `Added: ${newArticleTypes.join(", ")}`,
          variant: "default",
        })
      }

      // Generate and download the invoice
      try {
        await downloadInvoicePDF(newBooking)
        toast({
          title: "Invoice Generated",
          description: "Invoice has been generated and download started",
          variant: "default",
        })
      } catch (pdfError) {
        console.error("Error generating PDF:", pdfError)
        toast({
          title: "PDF Generation Issue",
          description: "Booking was created but there was an issue generating the PDF",
          variant: "warning",
        })
      }

      // Navigate to dashboard
      navigate("/")
    } catch (error) {
      console.error("Error creating booking:", error)
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render the suggestions dropdown
  const renderSuggestions = () => {
    if (!activeSuggestionField || filteredSuggestions.length === 0) return null;
    
    return (
      <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-40 overflow-y-auto">
        {filteredSuggestions.map((suggestion, index) => (
          <div 
            key={index}
            className="p-2 hover:bg-gray-100 cursor-pointer"
            onClick={() => selectSuggestion(activeSuggestionField, suggestion)}
          >
            {suggestion}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
        
          <Select   
            
            onValueChange={(value) => handleSelectChange("bookingType", value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Sundry">Sundry</SelectItem>
              <SelectItem value="Part Load">Part Load</SelectItem>
              <SelectItem value="Full Load">Full Load</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {/* Left Side - Main Form */}
          <div className="col-span-3 space-y-4">
            {/* Delivery Information */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-2">
                <div className="flex items-center">
                  <Label htmlFor="deliveryDestination">Delivery Destination</Label>
                  <span className="text-red-600 ml-1">*</span>
                </div>
                {isTypingDestination ? (
                  <div className="flex space-x-2 relative">
                    <Input
                      ref={customDestinationRef}
                      id="customDestination"
                      name="deliveryDestination"
                      value={formData.deliveryDestination}
                      onChange={handleCustomDestinationChange}
                      placeholder="Enter new destination"
                      className="flex-grow"
                      autoComplete="off"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="shrink-0"
                      onClick={cancelCustomDestination}
                    >
                      <X size={16} />
                    </Button>
                    {activeSuggestionField === "deliveryDestination" && renderSuggestions()}
                  </div>
                ) : (
                  <Select
                    value={formData.deliveryDestination}
                    onValueChange={(value) => handleSelectChange("deliveryDestination", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinations.map((dest) => (
                        <SelectItem key={dest} value={dest}>
                          {dest}
                        </SelectItem>
                      ))}
                      <SelectItem value="add-new" className="text-blue-600 font-medium">
                        + Add New Destination
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2 relative">
                <Label htmlFor="ewaybillNumber">E-Waybill Number</Label>
                <Input
                  id="ewaybillNumber"
                  name="invoiceNo"
                  value={formData.formType === "E-Waybill" ? formData.invoiceNo : ""}
                  onChange={handleInputChange}
                  placeholder="Enter e-waybill number"
                  autoComplete="off"
                />
                {activeSuggestionField === "invoiceNo" && renderSuggestions()}
              </div>
            </div>

            {/* Consignor/Consignee Information */}
            <div className="grid grid-cols-2 gap-4">
              {/* Consignor (From) Information */}
              <div className="space-y-3 border rounded p-3">
                <div className="font-medium">Consignor (From)</div>
                <div className="space-y-2 relative">
                  <div className="flex items-center">
                    <Label htmlFor="consignorName">Name</Label>
                    <span className="text-red-600 ml-1">*</span>
                  </div>
                  <Input
                    id="consignorName"
                    name="consignorName"
                    value={formData.consignorName}
                    onChange={handleInputChange}
                    required
                    autoComplete="off"
                  />
                  {activeSuggestionField === "consignorName" && renderSuggestions()}
                </div>

                <div className="space-y-2 relative">
                  <div className="flex items-center">
                    <Label htmlFor="consignorMobile">Mobile No</Label>
                    <span className="text-red-600 ml-1">*</span>
                  </div>
                  <Input
                    id="consignorMobile"
                    name="consignorMobile"
                    value={formData.consignorMobile}
                    onChange={handleInputChange}
                    required
                    autoComplete="off"
                  />
                  {activeSuggestionField === "consignorMobile" && renderSuggestions()}
                </div>

                <div className="space-y-2 relative">
                  <Label htmlFor="consignorGST">GST No</Label>
                  <Input
                    id="consignorGST"
                    name="consignorGST"
                    value={formData.consignorGST || ""}
                    onChange={handleInputChange}
                    autoComplete="off"
                  />
                  {activeSuggestionField === "consignorGST" && renderSuggestions()}
                </div>

                <div className="space-y-2 relative">
                  <Label htmlFor="consignorAddress">Address</Label>
                  <Textarea
                    id="consignorAddress"
                    name="consignorAddress"
                    value={formData.consignorAddress}
                    onChange={handleInputChange}
                    rows={3}
                    className="resize-none h-24"
                  />
                  {activeSuggestionField === "consignorAddress" && renderSuggestions()}
                </div>
              </div>

              {/* Consignee (To) Information */}
              <div className="space-y-3 border rounded p-3">
                <div className="font-medium">Consignee (To)</div>
                <div className="space-y-2 relative">
                  <div className="flex items-center">
                    <Label htmlFor="consigneeName">Name</Label>
                    <span className="text-red-600 ml-1">*</span>
                  </div>
                  <Input
                    id="consigneeName"
                    name="consigneeName"
                    value={formData.consigneeName}
                    onChange={handleInputChange}
                    required
                    autoComplete="off"
                  />
                  {activeSuggestionField === "consigneeName" && renderSuggestions()}
                </div>

                <div className="space-y-2 relative">
                  <div className="flex items-center">
                    <Label htmlFor="consigneeMobile">Mobile No</Label>
                    <span className="text-red-600 ml-1">*</span>
                  </div>
                  <Input
                    id="consigneeMobile"
                    name="consigneeMobile"
                    value={formData.consigneeMobile}
                    onChange={handleInputChange}
                    required
                    autoComplete="off"
                  />
                  {activeSuggestionField === "consigneeMobile" && renderSuggestions()}
                </div>

                <div className="space-y-2 relative">
                  <Label htmlFor="consigneeGST">GST No</Label>
                  <Input
                    id="consigneeGST"
                    name="consigneeGST"
                    value={formData.consigneeGST || ""}
                    onChange={handleInputChange}
                    autoComplete="off"
                  />
                  {activeSuggestionField === "consigneeGST" && renderSuggestions()}
                </div>

                <div className="space-y-2 relative">
                  <Label htmlFor="consigneeAddress">Address</Label>
                  <Textarea
                    id="consigneeAddress"
                    name="consigneeAddress"
                    value={formData.consigneeAddress}
                    onChange={handleInputChange}
                    rows={3}
                    className="resize-none h-24"
                  />
                  {activeSuggestionField === "consigneeAddress" && renderSuggestions()}
                </div>
              </div>
            </div>

            {/* Article Details */}
            <div className="border rounded p-3">
              <div className="flex justify-between items-center mb-3">
                <div className="font-medium">Article Details</div>
                <div>Total Art: {articles.length}</div>
              </div>
              
              <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-2">Article</div>
                <div className="col-span-1">Art</div>
                <div className="col-span-2">Art Type</div>
                <div className="col-span-2">Said To Cont</div>
                <div className="col-span-1">Art Amt</div>
                <div className="col-span-3"></div>
              </div>
              
              <div className="space-y-2">
                {articles.map((article, index) => (
                  <div key={article.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-2 relative">
                      <Input
                        name="articleName"
                        value={article.articleName}
                        onChange={(e) => handleArticleChange(index, e)}
                        placeholder="Article name"
                        autoComplete="off"
                        onFocus={() => {
                          setActiveSuggestionField(`article_articleName`);
                          setSearchTerm(article.articleName);
                        }}
                      />
                      {activeSuggestionField === `article_articleName` && renderSuggestions()}
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        name="quantity"
                        value={article.quantity || 0}
                        onChange={(e) => handleArticleChange(index, e)}
                        className="w-full"
                        min="0"
                      />
                    </div>
                    <div className="col-span-2">
                      {isTypingArticleType ? (
                        <div className="flex space-x-2 relative">
                          <Input
                            ref={customArticleTypeRef}
                            id={`customArticleType-${index}`}
                            value={article.artType}
                            onChange={(e) => handleArticleChange(index, e)}
                            placeholder="Enter new article type"
                            className="flex-grow"
                            autoComplete="off"
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="shrink-0"
                            onClick={() => setIsTypingArticleType(false)}
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      ) : (
  <Select
    value={article.artType}
    onValueChange={(value) => {
      if (value === "add-new") {
        setIsTypingArticleType(true);
      } else {
        handleArticleTypeChange(index, value);
      }
    }}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select type" />
    </SelectTrigger>
    <SelectContent>
      {articleTypes.map((type) => (
        <SelectItem key={type} value={type}>
          {type}
        </SelectItem>
      ))}
      <SelectItem value="add-new" className="text-blue-600 font-medium">
        + Add New Article Type
      </SelectItem>
    </SelectContent>
  </Select>
)}
                    </div>
                    <div className="col-span-2 relative">
                      <Input
                        name="saidToContain"
                        placeholder="Said to contain"
                        value={article.saidToContain || ""}
                        onChange={(e) => handleArticleChange(index, e)}
                        autoComplete="off"
                        onFocus={() => {
                          setActiveSuggestionField(`article_saidToContain`);
                          setSearchTerm(article.saidToContain || "");
                        }}
                      />
                      {activeSuggestionField === `article_saidToContain` && renderSuggestions()}
                    </div>
                    <div className="col-span-1">
                      <Input
                        name="articleAmount"
                        type="number"
                        value={article.articleAmount || 0}
                        onChange={(e) => handleArticleChange(index, e)}
                        className="w-full"
                        min="0"
                      />
                    </div>
                    <div className="col-span-3 flex justify-end">
                      <Button
                        type="button"
                        onClick={() => removeArticle(index)}
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 mr-2"
                      >
                        <Trash2 size={16} />
                      </Button>
                      <Button
                        type="button"
                        onClick={addArticle}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 h-8"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Weight details */}
              <div className="grid grid-cols-6 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="actualWeight">Actual Wt</Label>
                  <Input
                    id="actualWeight"
                    name="actualWeight"
                    type="number"
                    step="0.01"
                    min="0"
                    value={articles[0].actualWeight || ""}
                    onChange={(e) => handleArticleChange(0, e)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="chargedWeight">Charged Wt</Label>
                  <Input
                    id="chargedWeight"
                    name="chargedWeight"
                    type="number"
                    step="0.01"
                    min="0"
                    value={articles[0].chargedWeight || ""}
                    onChange={(e) => handleArticleChange(0, e)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="weightRate">Wt Rate</Label>
                  <Input
                    id="weightRate"
                    name="weightRate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={articles[0].weightRate || ""}
                    onChange={(e) => handleArticleChange(0, e)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="weightAmount">Wt Amt</Label>
                  <div className="space-y-2">
                    <Label htmlFor="weightAmount">Wt Amt</Label>
                    <Input
                      id="weightAmount"
                      name="weightAmount"
                      type="number"
                      readOnly
                      value={articles[0].weightAmount || 0}
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="declaredValue">Declared Value</Label>
                    <Input
                      id="declaredValue"
                      name="declaredValue"
                      type="number"
                      value={formData.declaredValue || 0}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fixAmount">Fixed Amount</Label>
                    <Input
                      id="fixAmount"
                      name="fixAmount"
                      type="number"
                      value={formData.fixAmount || 0}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2 relative">
                  <Label htmlFor="godown">Godown</Label>
                  <Input
                    id="godown"
                    name="godown"
                    value={formData.godown || ""}
                    onChange={handleInputChange}
                    autoComplete="off"
                  />
                  {activeSuggestionField === "godown" && renderSuggestions()}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleSelectChange("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Booked">Booked</SelectItem>
                      <SelectItem value="In Transit">In Transit</SelectItem>
                      <SelectItem value="Delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-2 relative">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  name="remarks"
                  value={formData.remarks || ""}
                  onChange={handleInputChange}
                  rows={2}
                  className="resize-none"
                />
                {activeSuggestionField === "remarks" && renderSuggestions()}
              </div>
            </div>
          </div>

          {/* Right Side - Calculation Card */}
          <div className="col-span-1">
            <Card className="h-full">
              <CardContent className="pt-4">
                <div className="text-lg font-semibold mb-4">Charges</div>
                
                <div className="space-y-3">
                  <div className="space-y-2 relative">
                    <Label htmlFor="freight">Freight</Label>
                    <Input
                      id="freight"
                      name="freight"
                      type="number"
                      value={charges.freight || 0}
                      onChange={handleChargesChange}
                      min="0"
                      autoComplete="off"
                    />
                    {activeSuggestionField === "freight" && renderSuggestions()}
                  </div>
                  
                  <div className="space-y-2 relative">
                    <Label htmlFor="pickup">Pickup</Label>
                    <Input
                      id="pickup"
                      name="pickup"
                      type="number"
                      value={charges.pickup || 0}
                      onChange={handleChargesChange}
                      min="0"
                      autoComplete="off"
                    />
                    {activeSuggestionField === "pickup" && renderSuggestions()}
                  </div>
                  
                  <div className="space-y-2 relative">
                    <Label htmlFor="dropCartage">Drop Cartage</Label>
                    <Input
                      id="dropCartage"
                      name="dropCartage"
                      type="number"
                      value={charges.dropCartage || 0}
                      onChange={handleChargesChange}
                      min="0"
                      autoComplete="off"
                    />
                    {activeSuggestionField === "dropCartage" && renderSuggestions()}
                  </div>
                  
                  <div className="space-y-2 relative">
                    <Label htmlFor="loading">Loading/Unloading</Label>
                    <Input
                      id="loading"
                      name="loading"
                      type="number"
                      value={charges.loading || 0}
                      onChange={handleChargesChange}
                      min="0"
                      autoComplete="off"
                    />
                    {activeSuggestionField === "loading" && renderSuggestions()}
                  </div>
                  
                  <div className="space-y-2 relative">
                    <Label htmlFor="lrCharge">LR Charge</Label>
                    <Input
                      id="lrCharge"
                      name="lrCharge"
                      type="number"
                      value={charges.lrCharge || 0}
                      onChange={handleChargesChange}
                      min="0"
                      autoComplete="off"
                    />
                    {activeSuggestionField === "lrCharge" && renderSuggestions()}
                  </div>
                  
                  <div className="border-t pt-2">
                    <div className="flex justify-between py-1">
                      <span>SGST:</span>
                      <span>₹ {charges.sgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>CGST:</span>
                      <span>₹ {charges.cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>IGST:</span>
                      <span>₹ {charges.igst.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="border-t pt-2">
                    <div className="flex justify-between py-1 font-bold">
                      <span>Grand Total:</span>
                      <span>₹ {charges.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate("/")}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Booking"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default BookingForm;
