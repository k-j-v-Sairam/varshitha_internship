// src/services/emailService.js
import { Alert } from 'react-native';

// TODO: The user must fill these in from their EmailJS account
const EMAILJS_SERVICE_ID = "service_7vzcjeq";
const EMAILJS_TEMPLATE_ID = "template_zq540i3";
const EMAILJS_PUBLIC_KEY = "E38erk7giSBp1Bnjv";

export const sendCredentialEmail = async ({ name, email, password, role }) => {
  if (
    EMAILJS_SERVICE_ID === "YOUR_SERVICE_ID_HERE" ||
    EMAILJS_TEMPLATE_ID === "YOUR_TEMPLATE_ID_HERE" ||
    EMAILJS_PUBLIC_KEY === "YOUR_PUBLIC_KEY_HERE"
  ) {
    console.warn("EmailJS is not configured yet. Credentials not sent.");
    return false;
  }

  const payload = {
    service_id: EMAILJS_SERVICE_ID,
    template_id: EMAILJS_TEMPLATE_ID,
    user_id: EMAILJS_PUBLIC_KEY,
    template_params: {
      to_name: name,
      to_email: email,
      role: role,
      password: password,
    },
  };

  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log("Email dispatched successfully via EmailJS!");
      return true;
    } else {
      const errorText = await response.text();
      console.error("EmailJS Error:", errorText);
      Alert.alert("Email Delivery Failed", `EmailJS API Error: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error("Network error calling EmailJS:", error);
    Alert.alert("Network Error", `Could not reach EmailJS: ${error.message}`);
    return false;
  }
};
