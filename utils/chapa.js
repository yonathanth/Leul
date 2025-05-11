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
        business_name: "Wedding Planning Platform",
        account_name: "Wedding Planning Admin",
        bank_code: "946", // Zemen Bank
        account_number: "1000000000", // Test account for Zemen Bank
        split_type: "percentage",
        split_value: 10, // 10% for platform fee
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

    // Define default bank codes for Ethiopia
    const bankCodes = {
      CBE: "961", // Commercial Bank of Ethiopia
      DASHEN: "945", // Dashen Bank
      AWASH: "942", // Awash Bank
      ZEMEN: "946", // Zemen Bank
    };

    // Determine bank code from vendor's bank name or use Zemen Bank as default
    let bankCode = "946"; // Default to Zemen Bank

    if (vendor.bankName) {
      const bankNameUppercase = vendor.bankName.toUpperCase();

      if (
        bankNameUppercase.includes("CBE") ||
        bankNameUppercase.includes("COMMERCIAL")
      ) {
        bankCode = bankCodes.CBE;
      } else if (bankNameUppercase.includes("DASHEN")) {
        bankCode = bankCodes.DASHEN;
      } else if (bankNameUppercase.includes("AWASH")) {
        bankCode = bankCodes.AWASH;
      } else if (bankNameUppercase.includes("ZEMEN")) {
        bankCode = bankCodes.ZEMEN;
      }
    }

    // Use vendor's bank account number or generate a valid test account number
    // In production, this should ALWAYS be the vendor's real account number
    const accountNumber =
      vendor.bankAccountNumber ||
      (bankCode === "961" ? "1000000000000" : "1000000000");

    const response = await chapa.post("/subaccount", {
      business_name: vendor.businessName,
      account_name:
        `${vendor.firstName || ""} ${vendor.lastName || ""}`.trim() ||
        vendor.businessName,
      bank_code: bankCode,
      account_number: accountNumber,
      split_type: "percentage",
      split_value: 90, // 90% to vendor, 10% to platform
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

    // Extract Chapa's error message if available
    const chapaError = error.response?.data?.message || error.message;
    throw new Error(`Chapa Error: ${chapaError}`);
  }
};

module.exports = { chapa, createAdminSubaccount, createVendorSubaccount };
