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
  timeout: 10000, // Added timeout to prevent hanging requests
});

// Create subaccount for admin (run this once)
const createAdminSubaccount = async () => {
  try {
    const existingAdmin = await prisma.chapaSubaccount.findFirst({
      where: { type: "ADMIN" },
    });

    if (!existingAdmin) {
      const response = await chapa.post("/subaccount", {
        business_name: "Wedding Planning Platform",
        account_name: "Wedding Planning Admin",
        bank_code: "946", // Zemen Bank
        account_number: "1000000000", // Test account for Zemen Bank
        split_type: "percentage",
        split_value: "0.1", // 10% as decimal string (fixed)
      });

      await prisma.chapaSubaccount.create({
        data: {
          accountId: response.data.data.subaccount_id,
          type: "ADMIN",
        },
      });

      console.log(
        "Admin subaccount created successfully:",
        response.data.data.subaccount_id
      );
      return response.data.data.subaccount_id;
    } else {
      console.log("Admin subaccount already exists:", existingAdmin.accountId);
      return existingAdmin.accountId;
    }
  } catch (error) {
    console.error(
      "Error creating admin subaccount:",
      error.response?.data || error.message
    );
    throw new Error(`Failed to create admin subaccount: ${error.message}`);
  }
};

// Create subaccount for vendor
const createVendorSubaccount = async (vendorId) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { user: true },
    });

    if (!vendor) {
      throw new Error(`Vendor with ID ${vendorId} not found`);
    }

    // Commercial Bank of Ethiopia details
    const CBE_BANK_CODE = "946"; // Correct CBE bank code
    const REQUIRED_LENGTH = 13;

    // Get account number and validate
    const accountNumber = vendor.accountNumber?.toString() || "";

    // Validate account number
    if (
      !accountNumber ||
      accountNumber.length !== REQUIRED_LENGTH ||
      !/^\d+$/.test(accountNumber)
    ) {
      console.error("Invalid CBE account number for vendor", {
        vendorId,
        accountNumber,
        expectedLength: REQUIRED_LENGTH,
      });
      throw new Error(
        `Invalid CBE account number. Must be ${REQUIRED_LENGTH} digits.`
      );
    }

    console.log(
      `Creating Chapa subaccount for vendor: ${vendor.businessName}, Account: ${accountNumber}`
    );

    const response = await chapa.post("/subaccount", {
      business_name: vendor.businessName,
      account_name: vendor.businessName, // Use business name for account name
      bank_code: CBE_BANK_CODE,
      account_number: accountNumber,
      split_type: "percentage",
      split_value: "0.9", // 90% as decimal string
    });

    console.log("Chapa subaccount created:", response.data);

    await prisma.vendor.update({
      where: { id: vendorId },
      data: { chapaSubaccountId: response.data.data.subaccount_id },
    });

    return response.data.data.subaccount_id;
  } catch (error) {
    console.error("Full Chapa API Error:", {
      message: error.message,
      response: error.response?.data || "No response data",
      stack: error.stack,
    });

    // More detailed error extraction
    const chapaError =
      error.response?.data?.message ||
      (error.response?.data?.errors
        ? Object.values(error.response.data.errors).join(", ")
        : error.message);
    throw new Error(`Chapa Error: ${chapaError}`);
  }
};

module.exports = { chapa, createAdminSubaccount, createVendorSubaccount };
