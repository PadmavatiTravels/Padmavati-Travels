# Padmavati Travels ERP System

[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF.svg)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-10.x-orange.svg)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive Enterprise Resource Planning (ERP) system designed specifically for transport and logistics companies. This web application streamlines booking management, dispatch operations, delivery tracking, and financial reporting for Padmavati Travels.

## 🚀 Project Overview

Padmavati Travels ERP is a modern, cloud-based solution that digitizes and automates the entire logistics workflow - from initial booking creation to final delivery confirmation. The system provides real-time tracking, automated invoice generation, comprehensive reporting, and multi-user authentication to enhance operational efficiency.

## 🛠️ Tech Stack & Framework

### Core Technologies

- **React 18.x** - Modern UI library with hooks and concurrent features
- **TypeScript 5.x** - Type-safe JavaScript for better development experience
- **Vite 5.x** - Fast build tool and development server
- **React Router v6** - Client-side routing for SPA navigation

### Why These Choices?

**React over Vue/Angular**: 
- Larger ecosystem and community support
- Better performance with virtual DOM
- Extensive third-party library compatibility
- Industry standard for modern web applications

**TypeScript over JavaScript**:
- Compile-time error detection
- Better IDE support with IntelliSense
- Enhanced code maintainability
- Improved refactoring capabilities
- Self-documenting code through type definitions

**Vite over Create React App**:
- Significantly faster development server startup
- Hot Module Replacement (HMR) for instant updates
- Better build performance with esbuild
- Modern ES modules support
- Smaller bundle sizes

## ✨ Features

### 🔐 Authentication & Security
- Firebase Authentication integration
- Role-based access control
- Secure user session management
- Password change functionality

### 📋 Booking Management
- **PAID** and **TO PAY** booking types
- Multi-article booking support
- Real-time charge calculations
- Automatic LR number generation
- Consignee details auto-fill
- Historical data suggestions

### 🚛 Operations Management
- **Dispatch Management** - Track outgoing shipments
- **Receive Management** - Handle incoming deliveries
- **Delivery Tracking** - Monitor final delivery status
- Status-based workflow automation

### 📊 Reporting & Analytics
- Daily collection reports
- Branch-wise collection analysis
- Dispatch and delivery reports
- Citywise revenue breakdown
- PDF export functionality
- Date range filtering

### 🎨 User Experience
- Responsive design for all devices
- Keyboard shortcuts (F7, F8, Alt+X)
- Real-time search and filtering
- Toast notifications
- Loading states and error handling

### 📄 Document Generation
- Automated PDF invoice generation
- Professional invoice templates
- Bulk report exports
- Print-friendly layouts

## 📦 Libraries & Packages Used

### UI & Styling
- **Tailwind CSS** over Bootstrap
  - *Why*: Utility-first approach, smaller bundle size, better customization
- **shadcn/ui** over Material-UI
  - *Why*: Modern design system, better TypeScript support, customizable components
- **Lucide React** over Font Awesome
  - *Why*: Tree-shakable icons, consistent design, better performance

### State Management
- **Redux Toolkit** over Zustand
  - *Why*: Mature ecosystem, DevTools support, predictable state updates
- **React Query** over SWR
  - *Why*: Better caching strategies, background refetching, optimistic updates

### Form Handling
- **React Hook Form** over Formik
  - *Why*: Better performance, less re-renders, smaller bundle size

### Date Handling
- **date-fns** over Moment.js
  - *Why*: Tree-shakable, immutable, smaller bundle size, modern API

### PDF Generation
- **jsPDF** with **jsPDF-AutoTable**
  - *Why*: Client-side PDF generation, no server dependency, rich formatting options

### Backend & Database
- **Firebase Firestore** over traditional SQL
  - *Why*: Real-time updates, offline support, automatic scaling, no server management
- **Firebase Storage** for file uploads
  - *Why*: Integrated with authentication, CDN support, automatic optimization

### Development Tools
- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type checking

## 📁 Folder Structure & Modules

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui components
│   ├── BookingForm.tsx  # Main booking form component
│   ├── MainLayout.tsx   # Application layout wrapper
│   └── ProtectedRoute.tsx # Route protection component
├── contexts/            # React context providers
│   └── AuthContext.tsx  # Authentication context
├── hooks/               # Custom React hooks
│   ├── use-toast.ts     # Toast notification hook
│   ├── use-mobile.tsx   # Mobile detection hook
│   └── useAppSelector.ts # Redux selector hook
├── lib/                 # Core utilities and configurations
│   ├── firebase.ts      # Firebase configuration
│   └── utils.ts         # General utility functions
├── models/              # TypeScript type definitions
│   └── booking.ts       # Booking-related types
├── pages/               # Page components (routes)
│   ├── Dashboard.tsx    # Main dashboard
│   ├── Login.tsx        # Authentication page
│   ├── PaidBooking.tsx  # PAID booking form
│   ├── ToPayBooking.tsx # TO PAY booking form
│   ├── Reports.tsx      # Reporting interface
│   └── ...              # Other page components
├── services/            # API and business logic
│   ├── bookingService.ts    # Booking CRUD operations
│   ├── consigneeService.ts  # Consignee management
│   └── destinationService.ts # Destination handling
├── store/               # Redux store configuration
│   ├── store.ts         # Store setup
│   ├── bookingSlice.ts  # Booking state management
│   └── settingsSlice.ts # Application settings
├── utils/               # Utility functions
│   ├── pdfGenerator.ts  # PDF generation utilities
│   ├── dateUtils.ts     # Date manipulation helpers
│   └── reportGenerator.ts # Report generation logic
└── App.tsx              # Main application component
```

### Module Purposes

- **components/**: Reusable UI components following atomic design principles
- **contexts/**: React context providers for global state management
- **hooks/**: Custom hooks for shared logic and state management
- **lib/**: Core configurations and utility functions
- **models/**: TypeScript interfaces and type definitions
- **pages/**: Route-level components representing different application screens
- **services/**: Business logic and API interaction layers
- **store/**: Redux store configuration and slices
- **utils/**: Pure utility functions for data manipulation and formatting

## 🚀 Setup Instructions

### Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- Firebase project with Firestore and Authentication enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/padmavati-travels-erp.git
   cd padmavati-travels-erp
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database and Authentication
   - Copy your Firebase configuration
   - Update `src/lib/firebase.ts` with your configuration:
   
   ```typescript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "your-sender-id",
     appId: "your-app-id"
   };
   ```

4. **Set up Firestore Security Rules**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

### Development

1. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

2. **Open your browser**
   Navigate to `http://localhost:8080`

### Building for Production

1. **Create production build**
   ```bash
   npm run build
   # or
   yarn build
   ```

2. **Preview production build**
   ```bash
   npm run preview
   # or
   yarn preview
   ```

### Deployment

The application can be deployed to various platforms:

- **Vercel**: Connect your GitHub repository for automatic deployments
- **Netlify**: Drag and drop the `dist` folder or connect via Git
- **Firebase Hosting**: Use Firebase CLI for deployment

## 🤝 Contributing Guidelines

We welcome contributions to improve the Padmavati Travels ERP system!

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
   - Follow the existing code style
   - Add TypeScript types for new features
   - Include appropriate error handling
   - Update documentation if needed

4. **Test your changes**
   ```bash
   npm run build
   npm run preview
   ```

5. **Commit your changes**
   ```bash
   git commit -m "feat: add your feature description"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**

### Code Style Guidelines

- Use TypeScript for all new code
- Follow the existing component structure
- Use meaningful variable and function names
- Add comments for complex business logic
- Ensure responsive design for all new UI components

### Reporting Issues

Please use the GitHub Issues tab to report bugs or request features. Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable


## 🙏 Acknowledgments

- **shadcn/ui** for the beautiful component library
- **Firebase** for the robust backend infrastructure
- **Tailwind CSS** for the utility-first styling approach
- **React** community for the excellent ecosystem

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation in the `/docs` folder

---


```
