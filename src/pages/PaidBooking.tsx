
import React from "react";
import BookingForm from "@/components/BookingForm";
import { BookingType } from "@/models/booking";

const PaidBooking = () => {
  return <BookingForm formType={BookingType.PAID} />;
};

export default PaidBooking;
