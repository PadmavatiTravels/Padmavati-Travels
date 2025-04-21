import type { Article, BookingType } from "@/models/booking"
import { db } from "@/lib/firebase"
import { collection, setDoc, doc, getDocs, query, where, updateDoc, getDoc, orderBy, limit, arrayUnion } from "firebase/firestore"

// Function to calculate weight amount based on weight and rate
export const calculateWeightAmount = (article: Article): number => {
  if (!article.actualWeight || !article.weightRate) return 0
  return article.actualWeight * article.weightRate
}

// Function to calculate total article amount
export const calculateTotalArticleAmount = (articles: Article[]): number => {
  return articles.reduce((total, article) => total + (article.weightAmount || 0), 0)
}

// Helper function to generate custom booking id starting with PT and timestamp
const generateBookingId = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  const hours = String(now.getHours()).padStart(2, "0")
  const minutes = String(now.getMinutes()).padStart(2, "0")
  const seconds = String(now.getSeconds()).padStart(2, "0")
  return `PT${year}${month}${day}${hours}${minutes}${seconds}`
}

// Function to create a new booking
export const createBooking = async (bookingData: any) => {
  try {
    const bookingId = generateBookingId()

    // Add booking to Firestore with custom id
    await setDoc(doc(db, "bookings", bookingId), {
      ...bookingData,
      id: bookingId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    // Complete booking data to return
    const completeBooking = {
      ...bookingData,
      id: bookingId,
    }

    return completeBooking
  } catch (error) {
    console.error("Error creating booking:", error)
    throw error
  }
}

// Function to get bookings by type
export const getBookingsByType = async (bookingType: BookingType) => {
  try {
    const q = query(collection(db, "bookings"), where("bookingType", "==", bookingType), orderBy("createdAt", "desc"))

    const querySnapshot = await getDocs(q)
    const bookings: any[] = []

    querySnapshot.forEach((doc) => {
      bookings.push({ id: doc.id, ...doc.data() })
    })

    return bookings
  } catch (error) {
    console.error("Error getting bookings:", error)
    throw error
  }
}

// Function to get a booking by ID
export const getBookingById = async (bookingId: string) => {
  try {
    const docRef = doc(db, "bookings", bookingId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() }
    } else {
      throw new Error("Booking not found")
    }
  } catch (error) {
    console.error("Error getting booking:", error)
    throw error
  }
}

// Function to update booking status
export const updateBookingStatus = async (bookingId: string, status: string, dateField?: string) => {
  try {
    const updateData: Record<string, any> = {
      status,
      updatedAt: new Date().toISOString(),
    }

    // If dateField is provided, add the current date to that field
    if (dateField) {
      updateData[dateField] = new Date().toISOString().split("T")[0]
    }

    const docRef = doc(db, "bookings", bookingId)
    await updateDoc(docRef, updateData)

    return true
  } catch (error) {
    console.error("Error updating booking status:", error)
    throw error
  }
}

// Get recent bookings for dashboard
export const getRecentBookings = async (limitCount = 10) => {
  try {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"), limit(limitCount))

    const querySnapshot = await getDocs(q)
    const bookings: any[] = []

    querySnapshot.forEach((doc) => {
      bookings.push({ id: doc.id, ...doc.data() })
    })

    return bookings
  } catch (error) {
    console.error("Error getting recent bookings:", error)
    throw error
  }
}

// Function to get dropdown options from Firestore
export const getDropdownOptions = async () => {
  try {
    const docRef = doc(db, "dropdownOptions", "options")
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      return {
        destinations: data.destinations || [],
        articleTypes: data.articleTypes || [],
      }
    } else {
      // If document does not exist, create with default empty arrays
      await setDoc(docRef, { destinations: [], articleTypes: [] })
      return { destinations: [], articleTypes: [] }
    }
  } catch (error) {
    console.error("Error getting dropdown options:", error)
    throw error
  }
}

// Function to add a new dropdown option to Firestore
export const addDropdownOption = async (type: "destinations" | "articleTypes", value: string) => {
  try {
    const docRef = doc(db, "dropdownOptions", "options")
    await updateDoc(docRef, {
      [type]: arrayUnion(value)
    })
    return true
  } catch (error) {
    console.error("Error adding dropdown option:", error)
    throw error
  }
}
