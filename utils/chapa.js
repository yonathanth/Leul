const axios = require("axios");
const prisma = require("../prisma/client");

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;
const CHAPA_BASE_URL = "https://api.chapa.co/v1"; // Test mode URL

const chapa = axios.create({
  baseURL: CHAPA_BASE_URL,
  headers: {
    Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

// Create subaccount for admin (run this once)
const createAdminSubaccount = async () => {
  try {
    const existingAdmin = await prisma.chapaSubaccount.findFirst({
      where: { type: "ADMIN" },
    });

    if (!existingAdmin) {
      const response = await chapa.post("/subaccount", {
        business_name: "Platform Admin",
        account_name: "Admin Test Account",
        bank_code: "946", // Example bank code (Zemen Bank)
        account_number: "1001477728147", // Test account number
        split_type: "percentage",
        split_value: 0.1, // 10% for admin
      });

      await prisma.chapaSubaccount.create({
        data: {
          accountId: response.data.data.subaccount_id,
          type: "ADMIN",
        },
      });
    }
  } catch (error) {
    console.error("Error creating admin subaccount:", error.response?.data);
  }
};

// Create subaccount for vendor
const createVendorSubaccount = async (vendorId) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { user: true },
    });

    // Test mode requires specific values
    const response = await chapa.post("/subaccount", {
      business_name: vendor.businessName,
      account_name: vendor.firstName + " " + vendor.lastName,
      bank_code: "946", // Use slug from bank list
      account_number: vendor.bankAccountNumber || 1000488928147, // 13 zeros for CBE test
      split_type: "percentage",
      split_value: 0.9, // String value required
    });

    console.log(response.data);
    await prisma.vendor.update({
      where: { id: vendorId },

      data: { chapaSubaccountId: response.data.data.subaccount_id },
    });

    return response.data.data.id;
  } catch (error) {
    console.error("Full Chapa API Error:", {
      message: error.message,
      response: error.response?.data || "No response data",
      stack: error.stack,
    });

    // Extract Chapa's error message if available
    const chapaError = error.response?.data?.message || error.message;
    throw new Error(`Chapa Error: ${chapaError}`);
  }
};

module.exports = { chapa, createAdminSubaccount, createVendorSubaccount };
