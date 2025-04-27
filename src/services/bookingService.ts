import type { Article, BookingType, Booking } from "@/models/booking";
import { db } from "@/lib/firebase";
import {
  collection,
  setDoc,
  doc,
  getDocs,
  query,
  where,
  updateDoc,
  getDoc,
  orderBy,
  limit,
  arrayUnion,
} from "firebase/firestore";

// Function to calculate weight amount based on weight and rate
export const calculateWeightAmount = (article: Article): number => {
  if (!article.actualWeight || !article.weightRate) return 0;
  return article.actualWeight * article.weightRate;
};

// Function to calculate total article amount
export const calculateTotalArticleAmount = (articles: Article[]): number => {
  return articles.reduce((total, article) => total + (article.weightAmount || 0), 0);
};

// Helper function to generate custom booking id starting with PT100 and incrementing
// Helper function to generate sequential booking IDs starting with PT100
export const generateBookingId = async (): Promise<string> => {
  try {
    // Use imported db instance instead of calling getFirestore()
    // Get the latest booking to determine the next ID
    const bookingsRef = collection(db, "bookings");
    const q = query(bookingsRef, orderBy("id", "desc"), limit(1));
    const querySnapshot = await getDocs(q);
    
    let nextNumber = 100; // Start with PT100 if no bookings exist
    
    if (!querySnapshot.empty) {
      const latestBooking = querySnapshot.docs[0].data();
      const latestId = latestBooking.id as string;
      
      // Extract the number part from the ID (assuming format PT100, PT101, etc.)
      if (latestId && latestId.startsWith("PT")) {
        const numberPart = latestId.substring(2);
        const currentNumber = parseInt(numberPart, 10);
        
        if (!isNaN(currentNumber)) {
          nextNumber = currentNumber + 1;
        }
      }
    }
    
    return `PT${nextNumber}`;
  } catch (error) {
    console.error("Error generating booking ID:", error);
    // Fallback to a static ID if there's an error
    return `PT100`; // Default to PT100 in case of error
  }
};

// Function to create a new booking
export const createBooking = async (bookingData: Partial<Booking>): Promise<string> => {
  try {
    // Use imported db instance instead of calling getFirestore()
    const bookingId = await generateBookingId();
    
    const newBooking: Booking = {
      id: bookingId,
      ...bookingData,
    };

    // Save to Firestore
    const bookingRef = doc(db, "bookings", bookingId);
    await setDoc(bookingRef, newBooking);
    
    return bookingId;
  } catch (error) {
    console.error("Error creating booking:", error);
    throw error;
  }
};

// Function to add a new dropdown option to Firestore
export const addDropdownOption = async (type: "destinations" | "articleTypes", value: string) => {
  try {
    const docRef = doc(db, "dropdownOptions", "options");

    // First check if the document exists
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      // Document exists, update it
      await updateDoc(docRef, {
        [type]: arrayUnion(value),
      });
    } else {
      // Document doesn't exist, create it
      await setDoc(docRef, {
        [type]: [value],
      });
    }

    return true;
  } catch (error) {
    console.error("Error adding dropdown option:", error);
    throw error;
  }
};

// Function to get previous field values from Firestore
export const getPreviousValues = async (): Promise<{ [fieldName: string]: string[] }> => {
  try {
    const docRef = doc(db, "fieldHistory", "values");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as { [fieldName: string]: string[] };
    } else {
      // If document does not exist, create with empty object
      await setDoc(docRef, {});
      return {};
    }
  } catch (error) {
    console.error("Error getting previous values:", error);
    return {};
  }
};

// Function to save field values to Firestore
export const savePreviousValues = async (values: { [fieldName: string]: string[] }): Promise<boolean> => {
  try {
    const docRef = doc(db, "fieldHistory", "values");
    await setDoc(docRef, values);
    return true;
  } catch (error) {
    console.error("Error saving previous values:", error);
    return false;
  }
};

// Function to get bookings by type
export const getBookingsByType = async (bookingType: BookingType) => {
  try {
    const bookingDocs = await getDocs(query(collection(db, "bookings"), where("type", "==", bookingType)));
    return bookingDocs.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error getting bookings:", error);
    throw error;
  }
};

// Function to get a booking by ID
export const getBookingById = async (bookingId: string) => {
  try {
    const docRef = doc(db, "bookings", bookingId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() }
    } else {
      return null // Changed from throwing an error to returning null for better error handling
    }
  } catch (error) {
    console.error("Error getting booking:", error)
    throw error
  }
};

// Function to get recent bookings
export const getRecentBookings = async (limitCount = 10) => {
  try {
    const bookingDocs = await getDocs(query(collection(db, "bookings"), orderBy("createdAt", "desc"), limit(limitCount)));
    return bookingDocs.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error getting bookings:", error);
    throw error;
  }
};

// Add any other missing exports here
export const updateBookingStatus = async (bookingId: string, status: string, dateField?: string) => {
  try {
    const docRef = doc(db, "bookings", bookingId);
    const updateData: any = { 
      status, 
      updatedAt: new Date().toISOString() 
    };
    
    if (dateField) {
      updateData[dateField] = new Date().toISOString().split("T")[0];
    }
    
    await updateDoc(docRef, updateData);
    return true;
  } catch (error) {
    console.error("Error updating booking status:", error);
    throw error;
  }
};

// Function to fetch related address data for a given destination
export const fetchDestinationAddress = async (destination: string): Promise<{ consignorAddress: string; consigneeAddress: string } | null> => {
  try {
    const docRef = doc(db, "destinationAddresses", destination);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as { consignorAddress: string; consigneeAddress: string };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching destination address:", error);
    return null;
  }
};

// Function to save destination-address mapping
export const saveDestinationAddress = async (
  destination: string,
  addressData: { consignorAddress: string; consigneeAddress: string }
): Promise<boolean> => {
  try {
    const docRef = doc(db, "destinationAddresses", destination);
    await setDoc(docRef, addressData);
    return true;
  } catch (error) {
    console.error("Error saving destination address:", error);
    return false;
  }
};
