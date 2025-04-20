const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const CHAPA_API_URL = "https://api.chapa.co/v1";
const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;

// Initialize a payment with Chapa and split between admin (10%) and vendor (90%)
const initializePayment = async ({
  amount,
  email,
  firstName,
  lastName,
  callbackUrl,
  vendorAccount,
}) => {
  const tx_ref = `tx-${uuidv4()}`; // Generate a unique transaction reference

  // Define the split: 10% to admin, 90% to vendor
  const adminSplitPercentage = 0.1; // 10%
  const vendorSplitPercentage = 0.9; // 90%

  // Prepare the subaccount for the vendor (Chapa will send 90% to the vendor, 10% remains with the admin)
  const subaccounts = [
    {
      business_name: vendorAccount.businessName,
      account_name: vendorAccount.accountName,
      split_type: "percentage",
      split_value: vendorSplitPercentage, // Vendor gets 90%
    },
  ];

  const paymentData = {
    amount,
    currency: "ETB", // Chapa uses ETB for settlements by default[](https://developer.chapa.co/integrations/split-payment)
    email,
    first_name: firstName,
    last_name: lastName,
    tx_ref,
    callback_url: callbackUrl,
    subaccounts, // Split payment configuration
    customization: {
      title: "Event Payment",
      description: "Payment for event booking",
    },
  };

  try {
    const response = await axios.post(
      `${CHAPA_API_URL}/transaction/initialize`,
      paymentData,
      {
        headers: {
          Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.status !== "success") {
      throw new Error("Failed to initialize payment with Chapa");
    }

    return {
      checkoutUrl: response.data.data.checkout_url,
      tx_ref,
      adminSplit: amount * adminSplitPercentage,
      vendorSplit: amount * vendorSplitPercentage,
    };
  } catch (error) {
    console.error("Chapa payment initialization failed:", error.message);
    throw new Error("Payment initialization failed");
  }
};

// Verify a payment using the transaction reference
const verifyPayment = async (tx_ref) => {
  try {
    const response = await axios.get(
      `${CHAPA_API_URL}/transaction/verify/${tx_ref}`,
      {
        headers: {
          Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
        },
      }
    );

    if (response.data.status !== "success") {
      throw new Error("Payment verification failed");
    }

    return response.data;
  } catch (error) {
    console.error("Chapa payment verification failed:", error.message);
    throw new Error("Payment verification failed");
  }
};

module.exports = { initializePayment, verifyPayment };
