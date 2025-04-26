import { doc, setDoc, collection, query, getDocs, where, getDoc } from 'firebase/firestore';
import { db } from 'src/lib/firebase';

export type ConsigneeDetails = {
  name: string;
  mobile: string;
  address: string;
  gstNo?: string;
};

/**
 * Save consignee details to Firebase for future autofill
 */
export const saveConsigneeDetails = async (
  destination: string, 
  consigneeDetails: ConsigneeDetails
) => {
  try {
    const consigneeRef = doc(db, 'consignees', destination);
    await setDoc(consigneeRef, consigneeDetails, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving consignee details:', error);
    throw error;
  }
};

/**
 * Search for consignees by partial name match
 */
export const searchConsigneesByName = async (searchTerm: string) => {
  try {
    const consigneesRef = collection(db, 'consignees');
    // This is a simplified approach - in a real app you'd use proper indexing
    // or a third-party search solution for better text search
    const snapshot = await getDocs(consigneesRef);
    
    const results: Record<string, ConsigneeDetails> = {};
    
    snapshot.forEach(doc => {
      const data = doc.data() as ConsigneeDetails;
      if (data.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        results[doc.id] = data;
      }
    });
    
    return results;
  } catch (error) {
    console.error('Error searching consignees:', error);
    throw error;
  }
};

/**
 * Get consignee details for a specific destination
 */
export const getConsigneeByDestination = async (destination: string) => {
  try {
    const consigneeRef = doc(db, 'consignees', destination);
    const snapshot = await getDoc(consigneeRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    return snapshot.data() as ConsigneeDetails;
  } catch (error) {
    console.error('Error getting consignee details:', error);
    throw error;
  }
};
