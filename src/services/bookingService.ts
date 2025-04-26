import type { Article, BookingType } from "@/models/booking";
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

// Helper function to generate custom booking id starting with PT and timestamp
const generateBookingId = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `PT${year}${month}${day}${hours}${minutes}${seconds}`;
};

// Function to create a new booking
export const createBooking = async (bookingData: any) => {
  try {
    const bookingId = generateBookingId();

    // Replace empty strings with null values
    const sanitizedBookingData = Object.entries(bookingData).reduce((acc, [key, value]) => {
      // Convert empty strings to null (Firestore accepts null but not empty strings)
      acc[key] = value === "" ? null : value;
      return acc;
    }, {} as Record<string, any>);

    // Add booking to Firestore with custom id
    await setDoc(doc(db, "bookings", bookingId), {
      ...sanitizedBookingData,
      id: bookingId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Complete booking data to return
    const completeBooking = {
      ...bookingData, // Return original data with empty strings
      id: bookingId,
    };

    return completeBooking;
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
