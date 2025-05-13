export interface Article {
  id: string
  articleName: string
  artType: string
  quantity: number
  rate: number
  saidToContain?: string
  articleAmount: number // calculated
}

export enum BookingType {
  PAID = "PAID",
  TO_PAY = "TO PAY",
}

export interface Booking {
  id: string
  bookingType: BookingType
  invoiceType?: string // Add this field to store "paid" or "to pay"
  bookingDate: string
  deliveryDestination: string

  // Consignor (From)
  consignorName: string
  consignorMobile: string
  consignorAddress?: string

  // Consignee (To)
  consigneeName: string
  consigneeMobile: string
  consigneeAddress?: string
  consigneeCompanyName?: string
  deliveryContact?: string

  articles: Article[]
  totalArticles: number

  formType: string // Eway Bill
  invoiceNo: string
  declaredValue: number
  saidToContain: string
  remarks: string

  fixAmount: number
  articleAmount: number // calculated from articles
  totalAmount: number // calculated (fixAmount + articleAmount)

  // Status fields
  status: "Booked" | "Dispatched" | "In Transit" | "Received" | "Delivered" | "Not Received" | "Not Dispatched"
  dispatchDate?: string
  receiveDate?: string
  deliveryDate?: string

  // PDF Invoice
  invoiceUrl?: string
  pdfUrl?: string // For backward compatibility

  bookedBy?: string
}
