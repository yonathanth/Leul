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

    // Define default bank codes and required account number lengths
    const bankDetails = {
      CBE: { code: "946", length: 13, testAccount: "1000474468444" }, // Commercial Bank of Ethiopia
      DASHEN: { code: "945", length: 10, testAccount: "1000000000" }, // Dashen Bank
      AWASH: { code: "942", length: 10, testAccount: "1000000000" }, // Awash Bank
      ZEMEN: { code: "946", length: 10, testAccount: "1000000000" }, // Zemen Bank
    };

    // Determine bank details from vendor's bank name or use Zemen Bank as default
    let bankInfo = bankDetails.CBE; // Default to Zemen Bank

    if (vendor.bankName) {
      const bankNameUppercase = vendor.bankName.toUpperCase();

      if (
        bankNameUppercase.includes("CBE") ||
        bankNameUppercase.includes("COMMERCIAL")
      ) {
        bankInfo = bankDetails.CBE;
      } else if (bankNameUppercase.includes("DASHEN")) {
        bankInfo = bankDetails.DASHEN;
      } else if (bankNameUppercase.includes("AWASH")) {
        bankInfo = bankDetails.AWASH;
      } else if (bankNameUppercase.includes("ZEMEN")) {
        bankInfo = bankDetails.ZEMEN;
      }
    }

    // Validate or generate account number
    let accountNumber = vendor.bankAccountNumber || bankInfo.testAccount;

    // Ensure account number has correct length for the bank
    if (accountNumber.length !== bankInfo.length) {
      console.warn(
        `Account number length doesn't match bank requirements. Using test account.`
      );
      accountNumber = bankInfo.testAccount;
    }

    // Ensure account number contains only digits
    if (!/^\d+$/.test(accountNumber)) {
      console.warn(
        `Account number contains non-digit characters. Using test account.`
      );
      accountNumber = bankInfo.testAccount;
    }

    console.log(
      `Using bank code: ${bankInfo.code}, account number: ${accountNumber}`
    );

    const response = await chapa.post("/subaccount", {
      business_name: vendor.businessName,
      account_name:
        `${vendor.firstName || ""} ${vendor.lastName || ""}`.trim() ||
        "Vendor Account",
      bank_code: bankInfo.code,
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
