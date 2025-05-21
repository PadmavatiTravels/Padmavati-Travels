"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Card, CardContent } from "./ui/card"
import { Trash2 } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import type { Article } from "../models/booking"
import { BookingType } from "../models/booking"
import {
  createBooking,
  calculateTotalArticleAmount,
  getPreviousValues,
  savePreviousValues,
  getBookingById,
} from "../services/bookingService"
import { saveConsigneeDetails, getConsigneeByDestination } from "../services/consigneeService"
import { saveDestinationAddress, fetchDestinationAddress } from "../services/destinationService"
import { useToast } from "../hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Textarea } from "./ui/textarea"
import { downloadInvoicePDF } from "../utils/pdfGenerator"
import { useAppSelector } from "../hooks/useAppSelector"
import { useAppDispatch } from "../hooks/useAppDispatch"
import { fetchDropdownOptions, addDestinationAsync, addArticleTypeAsync } from "../store/bookingSlice"
import { CustomSelect } from "./ui/custom-select"
import { useAuth } from "../contexts/AuthContext"
import { getAuth } from "firebase/auth"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "../lib/firebase"

// Define field history type for storing previous entries
type FieldHistory = {
  [fieldName: string]: string[]
}

const BookingForm: React.FC<{ formType: BookingType; onBookingCreated?: (id: string) => void }> = ({
  formType,
  onBookingCreated,
}) => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const dispatch = useAppDispatch()
  const { currentUser } = useAuth()

  // Fallback to direct Firebase auth if context fails
  const firebaseAuth = getAuth()
  const firebaseUser = firebaseAuth.currentUser

  const effectiveUser = currentUser || firebaseUser

  // Check if user is authenticated
  useEffect(() => {
    if (!effectiveUser) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to access this page",
        variant: "destructive",
      })
      navigate("/login")
    }
  }, [effectiveUser, navigate, toast])

  // Default locations and article types to ensure they're always available
  const defaultDestinations = ["Hyderabad", "Latur", "Nagpur", "Hingoli"]
  const defaultArticleTypes = ["BOX", "AUTO PARTS"]

  // Dispatch fetchDropdownOptions on mount to load destinations and articleTypes
  useEffect(() => {
    dispatch(fetchDropdownOptions())
  }, [dispatch])

  // Fix: Use effectiveUser instead of trying to access Redux state
  const userId = effectiveUser?.uid || ""
  const userEmail = effectiveUser?.email || ""

  // Get destinations and article types from Redux
  const destinations = useAppSelector((state) => state.booking.destinations || [])
  const articleTypes = useAppSelector((state) => state.booking.articleTypes || [])

  // Combine default destinations with those from Redux
  const allDestinations = [...new Set([...(destinations?.filter(Boolean).map(String) || []), ...defaultDestinations])]

  // Combine default article types with those from Redux
  const allArticleTypes = [...new Set([...(articleTypes || []), ...defaultArticleTypes])]

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTypingDestination, setIsTypingDestination] = useState(false)
  const [isTypingArticleType, setIsTypingArticleType] = useState(false)
  const customDestinationRef = useRef<HTMLInputElement>(null)
  const customArticleTypeRef = useRef<HTMLInputElement>(null)
  const [bookingId, setBookingId] = useState("PT100")

  // State for field history and suggestions
  const [fieldHistory, setFieldHistory] = useState<FieldHistory>({})
  const [activeSuggestionField, setActiveSuggestionField] = useState<string | null>(null)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  // Convert BookingType enum to simple string for invoice type
  const invoiceTypeValue = formType === BookingType.PAID ? "paid" : "to pay"

  const [formData, setFormData] = useState({
    deliveryDestination: "",
    consignorName: "",
    consignorMobile: "",
    consignorAddress: "",
    consigneeCompanyName: "",
    consigneeName: "",
    consigneeMobile: "",
    consigneeAddress: "",
    deliveryContact: "", // Added delivery contact field
    formType: "E-Waybill",
    saidToContain: "",
    remarks: "",
    godown: "",
    status: "Booked",
  })
  // Define ConsigneeDetails type for Firestore data
  type ConsigneeDetails = {
    name?: string
    CompanyName?: string
    mobile?: string
    address?: string
    deliveryContact?: string
  }

  useEffect(() => {
    const autofillConsigneeDetails = async () => {
      if (formData.consigneeCompanyName) {
        try {
          // Search for consignees with matching company name
          const consigneesRef = collection(db, "consignees")
          const q = query(consigneesRef, where("CompanyName", "==", formData.consigneeCompanyName))
          const snapshot = await getDocs(q)

          if (!snapshot.empty) {
            // Use the first matching consignee
            const consigneeData = snapshot.docs[0].data() as ConsigneeDetails
            setFormData((prev) => ({
              ...prev,
              consigneeName: consigneeData.name || prev.consigneeName,
              consigneeMobile: consigneeData.mobile || prev.consigneeMobile,
              consigneeAddress: consigneeData.address || prev.consigneeAddress,
              deliveryContact: consigneeData.deliveryContact || prev.deliveryContact,
            }))
          }
        } catch (error) {
          console.error("Error auto-filling consignee details:", error)
        }
      }
    }

    autofillConsigneeDetails()
  }, [formData.consigneeCompanyName])
  // Autofill related address when deliveryDestination changes
  useEffect(() => {
    const autofillAddress = async () => {
      if (formData.deliveryDestination) {
        const addressData = await fetchDestinationAddress(formData.deliveryDestination)
        if (addressData) {
          setFormData((prev) => ({
            ...prev,
            consignorAddress: addressData.consignorAddress || prev.consignorAddress,
            consigneeAddress: addressData.consigneeAddress || prev.consigneeAddress,
          }))
        }
      }
    }
    autofillAddress()
  }, [formData.deliveryDestination])

  const [charges, setCharges] = useState({
    freight: 0,
    pickup: 0,
    dropCartage: 0,
    loading: 0,
    lrCharge: 0,
    grandTotal: 0,
  })

  const [articles, setArticles] = useState<Article[]>([
    {
      id: uuidv4(),
      artType: allArticleTypes.length > 0 ? allArticleTypes[0] : "Box",
      quantity: 1,
      rate: 0,
      saidToContain: "",
      articleAmount: 0,
    },
  ])

  // Load field history from Firebase on component mount
  useEffect(() => {
    const loadFieldHistory = async () => {
      try {
        const history = await getPreviousValues()
        console.log("Field history structure:", history)
        setFieldHistory(history)
      } catch (error) {
        console.error("Error loading field history:", error)
      }
    }

    loadFieldHistory()
  }, [])

  // Update suggestions when a field is being typed in
  useEffect(() => {
    if (activeSuggestionField && searchTerm) {
      const fieldValues = fieldHistory[activeSuggestionField] || []
      // Ensure fieldValues is an array before calling filter
      const values = Array.isArray(fieldValues) ? fieldValues : []
      const matches = values.filter((value) => value.toLowerCase().includes(searchTerm.toLowerCase()))
      setFilteredSuggestions(matches)
    } else {
      setFilteredSuggestions([])
    }
  }, [activeSuggestionField, searchTerm, fieldHistory])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: name.includes("Amount") ? Number.parseFloat(value) || 0 : value,
    }))

    // Set active suggestion field and search term
    setActiveSuggestionField(name)
    setSearchTerm(value)
  }

  const handleChargesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const numValue = Number.parseFloat(value) || 0

    // Update active suggestion for charges fields too
    setActiveSuggestionField(name)
    setSearchTerm(value)

    setCharges((prev) => {
      const newCharges = {
        ...prev,
        [name]: numValue,
      }

      // Calculate total amount including article amount
      const baseAmount =
        newCharges.freight +
        newCharges.pickup +
        newCharges.dropCartage +
        newCharges.loading +
        newCharges.lrCharge +
        articleAmount

      // Calculate grand total
      newCharges.grandTotal = baseAmount

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
    saveToFieldHistory(name, value)

    // Enable auto-fill of consignee details when destination is selected
    if (name === "deliveryDestination" && value && value !== "add-new") {
      fetchConsigneeDetails(value)
    }
  }

  // Add this new function to fetch and populate consignee details
  const fetchConsigneeDetails = async (destination: string) => {
    try {
      const consigneeDetails = await getConsigneeByDestination(destination)
      if (consigneeDetails) {
        // Update form with consignee details
        setFormData((prev) => ({
          ...prev,
          consigneeName: consigneeDetails.name || prev.consigneeName,
          consigneeCompanyName: consigneeDetails.CompanyName || prev.consigneeCompanyName,
          consigneeMobile: consigneeDetails.mobile || prev.consigneeMobile,
          consigneeAddress: consigneeDetails.address || prev.consigneeAddress,
          deliveryContact: consigneeDetails.deliveryContact || prev.deliveryContact, // Added delivery contact
        }))

        toast({
          title: "Consignee Details Loaded",
          description: `Loaded details for ${consigneeDetails.name}`,
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Error fetching consignee details:", error)
    }
  }

  const handleCustomDestinationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      deliveryDestination: e.target.value,
    }))

    // Update search for custom destinations
    setActiveSuggestionField("deliveryDestination")
    setSearchTerm(e.target.value)
  }

  const selectSuggestion = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    setFilteredSuggestions([])
    setActiveSuggestionField(null)
  }

  const saveToFieldHistory = (fieldName: string, value: string) => {
    if (!value.trim()) return

    setFieldHistory((prev) => {
      // Check if this value is already in the history
      const existingValues = prev[fieldName] || []
      if (!existingValues.includes(value)) {
        const newHistory = {
          ...prev,
          [fieldName]: [...existingValues, value],
        }
        // Save to Firebase
        savePreviousValues(newHistory)
        return newHistory
      }
      return prev
    })
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

    if (name === "rate" || name === "quantity") {
      updatedArticles[index] = {
        ...updatedArticles[index],
        [name]: Number.parseFloat(value) || 0,
      }

      // Calculate article amount based on rate and quantity
      const article = updatedArticles[index]
      updatedArticles[index].articleAmount = (article.quantity || 1) * (article.rate || 0)
    } else if (name === "articleAmount") {
      // Directly use the article amount entered by the user
      updatedArticles[index] = {
        ...updatedArticles[index],
        articleAmount: Number.parseFloat(value) || 0,
      }
    } else {
      updatedArticles[index] = {
        ...updatedArticles[index],
        [name]: value,
      }

      // Save value to field history
      saveToFieldHistory(`article_${name}`, value)
    }

    setArticles(updatedArticles)

    // Recalculate total charges whenever articles change
    const articleAmount = calculateTotalArticleAmount(updatedArticles)
    setCharges((prev) => {
      const baseAmount = prev.freight + prev.pickup + prev.dropCartage + prev.loading + prev.lrCharge + articleAmount

      return {
        ...prev,
        grandTotal: baseAmount,
      }
    })
  }

  const handleArticleTypeChange = (index: number, value: string) => {
    const updatedArticles = [...articles]
    updatedArticles[index] = {
      ...updatedArticles[index],
      artType: value,
    }
    setArticles(updatedArticles)

    // Save selected article type to history
    saveToFieldHistory("articleType", value)
  }

  const addArticle = () => {
    const newArticle = {
      id: uuidv4(),
      artType: allArticleTypes.length > 0 ? allArticleTypes[0] : "Box",
      quantity: 1,
      rate: 0,
      saidToContain: "",
      articleAmount: 0,
    }

    setArticles([...articles, newArticle])
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
    const totalAmount = articleAmount

    return {
      articleAmount,
      totalAmount,
    }
  }

  // Calculate the total amount from all articles
  const calculateTotalArticleAmount = (articles: Article[]): number => {
    return articles.reduce((total, article) => {
      // If articleAmount is directly provided, use it
      if (article.articleAmount && article.articleAmount > 0) {
        return total + article.articleAmount
      }

      // Otherwise calculate from quantity and rate
      const articleAmount = (article.quantity || 1) * (article.rate || 0)
      return total + articleAmount
    }, 0)
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
      })
    }

    // Save consignee details for future autofill
    if (formData.deliveryDestination && formData.consigneeName) {
      try {
        await saveConsigneeDetails(formData.deliveryDestination, {
          name: formData.consigneeName,
          CompanyName: formData.consigneeCompanyName,
          mobile: formData.consigneeMobile,
          address: formData.consigneeAddress,
          deliveryContact: formData.deliveryContact, // Include delivery contact
        })
      } catch (saveError) {
        console.error("Error saving consignee details:", saveError)
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
    const invalidArticles = articles.filter((a) => a.rate <= 0)
    if (invalidArticles.length > 0) {
      toast({
        title: "Validation Error",
        description: "All articles must have a rate",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const today = new Date().toISOString().split("T")[0]

      // Check if destination is new and save it to Firestore via redux thunk
      const isNewDestination = !allDestinations.includes(formData.deliveryDestination)
      if (isNewDestination && formData.deliveryDestination && userId) {
        await dispatch(
          addDestinationAsync({
            destination: formData.deliveryDestination,
            userId,
            consigneeCompanyName: formData.consigneeCompanyName,
            deliveryContact: formData.deliveryContact,
          }),
        ).unwrap()
      }

      // Check for new article types and save them to Firestore via redux thunk
      const newArticleTypes: string[] = []
      for (const article of articles) {
        if (article.artType && !allArticleTypes.includes(article.artType)) {
          if (!newArticleTypes.includes(article.artType)) {
            newArticleTypes.push(article.artType)
            if (userId) {
              await dispatch(addArticleTypeAsync({ articleType: article.artType, userId })).unwrap()
            }
          }
        }
      }

      // Save all form values to field history
      const formDataToSave = {
        ...formData,
        consignorName: formData.consignorName,
        consignorMobile: formData.consignorMobile,
        consignorAddress: formData.consignorAddress,
        consigneeName: formData.consigneeName,
        consigneeCompanyName: formData.consigneeCompanyName,
        consigneeMobile: formData.consigneeMobile,
        consigneeAddress: formData.consigneeAddress,
        deliveryContact: formData.deliveryContact,
        remarks: formData.remarks,
        godown: formData.godown,
      }

      // Save all values to field history in Firebase
      await savePreviousValues(formDataToSave)

      // Save article values too
      for (const article of articles) {
        if (article.articleName) saveToFieldHistory("articleName", article.articleName)
        if (article.saidToContain) saveToFieldHistory("saidToContain", article.saidToContain)
      }

      const bookingData = {
        bookingType: formType,
        invoiceType: invoiceTypeValue, // Explicitly include the invoice type
        bookingDate: today,
        ...formData,
        deliveryContact: formData.deliveryContact, // Explicitly include deliveryContact
        articles,
        articleAmount,
        totalAmount: charges.grandTotal,
        totalArticles: articles.length,
        charges,
        status: formData.status,
        bookedBy: effectiveUser?.email || "ADMIN",
      }

      toast({
        title: "Creating Booking",
        description: "Please wait while we create your booking...",
        variant: "default",
      })

      const bookingId = await createBooking(bookingData)

      toast({
        title: "Success",
        description: `Booking created successfully with LR number: ${bookingId}`,
        variant: "default",
      })

      if (onBookingCreated) {
        onBookingCreated(bookingId)
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

      // Fetch full booking object before generating invoice PDF
      try {
        const fullBooking = await getBookingById(bookingId)
        if (fullBooking) {
          await downloadInvoicePDF(fullBooking)
          toast({
            title: "Invoice Generated",
            description: "Invoice has been generated and download started",
            variant: "default",
          })
        } else {
          toast({
            title: "Invoice Generation Failed",
            description: "Could not fetch booking details for invoice generation",
            variant: "destructive",
          })
        }
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
    if (!activeSuggestionField || filteredSuggestions.length === 0) return null

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
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Select onValueChange={(value) => handleSelectChange("bookingType", value)}>
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
                <CustomSelect
                  options={allDestinations}
                  value={formData.deliveryDestination}
                  onChange={(value) => handleSelectChange("deliveryDestination", value)}
                  placeholder="Select destination"
                  addNewItemType="destination"
                />
              </div>
              <div className="space-y-2 relative">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Booked">Booked</SelectItem>
                    <SelectItem value="Dispatched">Dispatched</SelectItem>
                    <SelectItem value="In Transit">In Transit</SelectItem>
                    <SelectItem value="Received">Received</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                    <SelectItem value="Not Received">Not Received</SelectItem>
                    <SelectItem value="Not Dispatched">Not Dispatched</SelectItem>
                  </SelectContent>
                </Select>
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
                  <Label htmlFor="consigneeCompanyName">Company Name</Label>
                  <Input
                    id="consigneeCompanyName"
                    name="consigneeCompanyName"
                    value={formData.consigneeCompanyName}
                    onChange={handleInputChange}
                    required
                    autoComplete="off"
                  />
                  {activeSuggestionField === "consigneeCompanyName" && renderSuggestions()}
                </div>
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
                <div className="mb-4">
                  <Label htmlFor="deliveryContact" className="block text-sm font-medium mb-1">
                    Delivery Contact
                  </Label>
                  <Input
                    id="deliveryContact"
                    name="deliveryContact"
                    value={formData.deliveryContact}
                    onChange={handleInputChange}
                    className="w-full"
                    placeholder="Delivery Contact Number"
                  />
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
                <div className="col-span-1">Art</div>
                <div className="col-span-2">Art Type</div>
                <div className="col-span-2">Said To Cont</div>
                <div className="col-span-1">Art Rate</div>
                <div className="col-span-1">Art Amt</div>
                <div className="col-span-2"></div>
              </div>

              <div className="space-y-2">
                {articles.map((article, index) => (
                  <div key={article.id} className="border p-3 rounded mb-3">
                    <div className="grid grid-cols-12 gap-2 items-center">
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
                        <CustomSelect
                          options={[
                            ...allArticleTypes,
                            { value: "AUTO PARTS", label: "AUTO PARTS" },
                            { value: "BAGS", label: "BAGS" },
                            { value: "Box", label: "Box" },
                            { value: "Bundel", label: "Bundel" },
                            { value: "Cartoon Box", label: "Cartoon Box" },
                            { value: "Envelope", label: "Envelope" },
                          ]}
                          value={article.artType}
                          onChange={(value) => handleArticleTypeChange(index, value)}
                          placeholder="Select article type"
                          addNewItemType="articleType"
                        />
                      </div>
                      <div className="col-span-2 relative">
                        <Input
                          name="saidToContain"
                          placeholder="Said to contain"
                          value={article.saidToContain || ""}
                          onChange={(e) => handleArticleChange(index, e)}
                          autoComplete="off"
                          onFocus={() => {
                            setActiveSuggestionField(`article_saidToContain`)
                            setSearchTerm(article.saidToContain || "")
                          }}
                        />
                        {activeSuggestionField === `article_saidToContain` && renderSuggestions()}
                      </div>
                      <div className="col-span-1">
                        <Input
                          name="rate"
                          type="number"
                          value={article.rate || 0}
                          onChange={(e) => handleArticleChange(index, e)}
                          className="w-full"
                          min="0"
                        />
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
                      <div className="col-span-2 flex justify-end">
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
                          variant="outline"
                          className="h-8 w-8 p-0"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
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
              <div className="space-y-2 relative">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  name="remarks"
                  value={formData.remarks || ""}
                  onChange={handleInputChange}
                  rows={2}
                  className="h-16 w-full resize-none"
                  placeholder="Enter any remarks"
                />
                {activeSuggestionField === "remarks" && renderSuggestions()}
              </div>
            </div>
          </div>

          {/* Right Side - Charges Card */}
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
          <Button type="button" variant="outline" onClick={() => navigate("/")}>
            Cancel
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Booking"}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default BookingForm
