import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
  companyLogo: string;
  invoiceHeader: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  bankName: string;
  bankAccount: string;
  invoicePrefix: string;
  branchName: string;
  branchAddress: string;
}

// Default images
const defaultLogo = "https://i.postimg.cc/X72njpf6/Blue-and-Yellow-Illustrative-Travel-Agency-Logo.png";
const defaultHeader = "https://i.postimg.cc/P5thQd25/Blue-Modern-Company-Email-Header.png";

// Try to get saved settings from localStorage
const getSavedSettings = (): SettingsState => {
  try {
    const savedSettings = localStorage.getItem('companySettings');
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
  } catch (error) {
    console.error('Error loading settings from localStorage:', error);
  }
  
  return {
    companyLogo: defaultLogo,
    invoiceHeader: defaultHeader,
    companyName: "Padmavati Travels",
    companyAddress: "123 Anywhere St., Any City",
    companyPhone: "+123-456-7890",
    companyEmail: "info@padmavatitravels.com",
    bankName: "Name Bank",
    bankAccount: "123-456-7890",
    invoicePrefix: "INV",
    branchName: "",
    branchAddress: ""
  };
};

const initialState: SettingsState = getSavedSettings();

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateCompanyLogo: (state, action: PayloadAction<string>) => {
      state.companyLogo = action.payload;
      localStorage.setItem('companySettings', JSON.stringify(state));
    },
    updateInvoiceHeader: (state, action: PayloadAction<string>) => {
      state.invoiceHeader = action.payload;
      localStorage.setItem('companySettings', JSON.stringify(state));
    },
    updateCompanyDetails: (state, action: PayloadAction<{
      companyName?: string;
      companyAddress?: string;
      companyPhone?: string;
      companyEmail?: string;
      branchName?: string;
      branchAddress?: string;
    }>) => {
      if (action.payload.companyName !== undefined) state.companyName = action.payload.companyName;
      if (action.payload.companyAddress !== undefined) state.companyAddress = action.payload.companyAddress;
      if (action.payload.companyPhone !== undefined) state.companyPhone = action.payload.companyPhone;
      if (action.payload.companyEmail !== undefined) state.companyEmail = action.payload.companyEmail;
      if (action.payload.branchName !== undefined) state.branchName = action.payload.branchName;
      if (action.payload.branchAddress !== undefined) state.branchAddress = action.payload.branchAddress;
      localStorage.setItem('companySettings', JSON.stringify(state));
    },
    updateBankDetails: (state, action: PayloadAction<{
      bankName?: string;
      bankAccount?: string;
    }>) => {
      if (action.payload.bankName !== undefined) state.bankName = action.payload.bankName;
      if (action.payload.bankAccount !== undefined) state.bankAccount = action.payload.bankAccount;
      localStorage.setItem('companySettings', JSON.stringify(state));
    },
    updateInvoicePrefix: (state, action: PayloadAction<string>) => {
      state.invoicePrefix = action.payload;
      localStorage.setItem('companySettings', JSON.stringify(state));
    },
    resetToDefaults: (state) => {
      state.companyLogo = defaultLogo;
      state.invoiceHeader = defaultHeader;
      state.companyName = "Padmavati Travels";
      state.companyAddress = "123 Anywhere St., Any City";
      state.companyPhone = "+123-456-7890";
      state.companyEmail = "info@padmavatitravels.com";
      state.bankName = "Name Bank";
      state.bankAccount = "123-456-7890";
      state.invoicePrefix = "INV";
      state.branchName = "";
      state.branchAddress = "";
      localStorage.setItem('companySettings', JSON.stringify(state));
    }
  },
});

export const { 
  updateCompanyLogo, 
  updateInvoiceHeader,
  updateCompanyDetails,
  updateBankDetails,
  updateInvoicePrefix,
  resetToDefaults 
} = settingsSlice.actions;
export default settingsSlice.reducer;
