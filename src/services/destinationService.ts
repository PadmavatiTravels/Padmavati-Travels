import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Function to save destination address data to Firestore
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

// Function to fetch destination address data from Firestore
export const fetchDestinationAddress = async (
  destination: string
): Promise<{ consignorAddress: string; consigneeAddress: string } | null> => {
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