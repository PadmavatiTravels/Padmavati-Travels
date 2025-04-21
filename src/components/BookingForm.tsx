"use client"

import type React from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import type { Article, BookingType } from "@/models/booking"
import { createBooking, calculateWeightAmount, calculateTotalArticleAmount } from "@/services/bookingService"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { downloadInvoicePDF } from "@/utils/pdfGenerator"
import { useAppSelector } from "@/hooks/useAppSelector"

const BookingForm: React.FC<{ formType: BookingType }> = ({ formType }) => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const destinations = useAppSelector(state => state.booking.destinations)
  const articleTypes = useAppSelector(state => state.booking.articleTypes)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    deliveryDestination: "",
    consignorName: "",
    consignorMobile: "",
    consignorAddress: "",
    consigneeName: "",
    consigneeMobile: "",
    consigneeAddress: "",
    formType: "Eway Bill",
    invoiceNo: "",
    declaredValue: 0,
    saidToContain: "",
    remarks: "",
    fixAmount: 0,
    status: "Booked"
  })

  const [articles, setArticles] = useState<Article[]>([
    {
      id: uuidv4(),
      articleName: "",
      actualWeight: 0,
      artType: articleTypes.length > 0 ? articleTypes[0] : "Box",
      weightRate: 0,
      weightAmount: 0,
    },
  ])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: name.includes("Amount") || name === "declaredValue" ? Number.parseFloat(value) || 0 : value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleArticleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const updatedArticles = [...articles]

    if (name === "actualWeight" || name === "weightRate") {
      updatedArticles[index] = {
        ...updatedArticles[index],
        [name]: Number.parseFloat(value) || 0,
      }

      // Recalculate weight amount
      updatedArticles[index].weightAmount = calculateWeightAmount(updatedArticles[index])
    } else {
      updatedArticles[index] = {
        ...updatedArticles[index],
        [name]: value,
      }
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
  }

  const addArticle = () => {
    setArticles([
      ...articles,
      {
        id: uuidv4(),
        articleName: "",
        actualWeight: 0,
        artType: articleTypes.length > 0 ? articleTypes[0] : "Box",
        weightRate: 0,
        weightAmount: 0,
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

    // Validate form data
    if (!formData.deliveryDestination) {
      toast({
        title: "Validation Error",
        description: "Please select a delivery destination",
        variant: "destructive",
      })
      return
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

      const bookingData = {
        bookingType: formType,
        bookingDate: today,
        ...formData,
        articles,
        articleAmount,
        totalAmount,
        totalArticles: articles.length,
        status: formData.status,
      }

      toast({
        title: "Creating Booking",
        description: "Please wait while we create your booking...",
        variant: "default",
      })

      const newBooking = await createBooking(bookingData)

      toast({
        title: "Booking Created",
        description: `Booking with LR #${newBooking.id} created successfully`,
        variant: "default",
      })

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
      setTimeout(() => {
        navigate("/")
      }, 1000)
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{formType} Booking Form</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Delivery Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deliveryDestination">Delivery Destination</Label>
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
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Consignor (From) Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Consignor (From)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="consignorName">Name</Label>
                <Input
                  id="consignorName"
                  name="consignorName"
                  value={formData.consignorName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consignorMobile">Mobile No</Label>
                <Input
                  id="consignorMobile"
                  name="consignorMobile"
                  value={formData.consignorMobile}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consignorAddress">Address</Label>
                <Textarea
                  id="consignorAddress"
                  name="consignorAddress"
                  value={formData.consignorAddress}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Consignee (To) Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Consignee (To)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="consigneeName">Name</Label>
                <Input
                  id="consigneeName"
                  name="consigneeName"
                  value={formData.consigneeName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consigneeMobile">Mobile No</Label>
                <Input
                  id="consigneeMobile"
                  name="consigneeMobile"
                  value={formData.consigneeMobile}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consigneeAddress">Address</Label>
                <Textarea
                  id="consigneeAddress"
                  name="consigneeAddress"
                  value={formData.consigneeAddress}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Article Details */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Article Details</CardTitle>
            <Button type="button" onClick={addArticle} size="sm" className="bg-brand-primary hover:bg-brand-primary/90">
              <Plus size={16} className="mr-1" />
              Add Article
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {articles.map((article, index) => (
              <div key={article.id} className="article-item">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Article #{index + 1}</h3>
                  <Button
                    type="button"
                    onClick={() => removeArticle(index)}
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`articleName-${index}`}>Article</Label>
                    <Input
                      id={`articleName-${index}`}
                      name="articleName"
                      value={article.articleName}
                      onChange={(e) => handleArticleChange(index, e)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`artType-${index}`}>Art Type</Label>
                    <Select value={article.artType} onValueChange={(value) => handleArticleTypeChange(index, value)}>
                      <SelectTrigger id={`artType-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {articleTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`actualWeight-${index}`}>Actual Weight (kg)</Label>
                    <Input
                      id={`actualWeight-${index}`}
                      name="actualWeight"
                      type="number"
                      step="0.01"
                      min="0"
                      value={article.actualWeight || ""}
                      onChange={(e) => handleArticleChange(index, e)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`weightRate-${index}`}>Weight Rate (₹)</Label>
                    <Input
                      id={`weightRate-${index}`}
                      name="weightRate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={article.weightRate || ""}
                      onChange={(e) => handleArticleChange(index, e)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`weightAmount-${index}`}>Weight Amount (₹)</Label>
                    <Input
                      id={`weightAmount-${index}`}
                      name="weightAmount"
                      type="number"
                      value={article.weightAmount.toFixed(2)}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-end">
              <div className="text-sm">
                Total Articles: <span className="font-bold">{articles.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Additional Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="formType">Form Type</Label>
                <Input id="formType" name="formType" value={formData.formType} onChange={handleInputChange} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceNo">Invoice No</Label>
                <Input id="invoiceNo" name="invoiceNo" value={formData.invoiceNo} onChange={handleInputChange} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="declaredValue">Declared Value (₹)</Label>
                <Input
                  id="declaredValue"
                  name="declaredValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.declaredValue || ""}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                value={formData.status}
                onValueChange={(value) => handleSelectChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Booked">Booked</SelectItem>
                  <SelectItem value="Dispatched">Dispatched</SelectItem>
                  <SelectItem value="Received">Received</SelectItem>
                  <SelectItem value="Not Dispatched">Not Dispatched</SelectItem>
                  <SelectItem value="Not Received">Not Received</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fixAmount">Fix Amount (₹)</Label>
                <Input
                  id="fixAmount"
                  name="fixAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.fixAmount || ""}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="articleAmount">Article Amount (₹)</Label>
                <Input
                  id="articleAmount"
                  type="number"
                  value={articleAmount.toFixed(2)}
                  readOnly
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Amount (₹)</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  value={totalAmount.toFixed(2)}
                  readOnly
                  className="bg-gray-50 font-bold"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate("/")}>
            Cancel
          </Button>
          <Button type="submit" className="bg-brand-primary hover:bg-brand-primary/90" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Booking"}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default BookingForm
