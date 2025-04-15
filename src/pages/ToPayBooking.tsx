
import React from "react";
import BookingForm from "@/components/BookingForm";
import { BookingType } from "@/models/booking";

const ToPayBooking = () => {
  return <BookingForm formType={BookingType.TO_PAY} />;
};

export default ToPayBooking;
