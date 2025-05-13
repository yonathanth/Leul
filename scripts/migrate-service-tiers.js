/**
 * Script to migrate service data from old price field to new basePrice field
 * and create default tiers for existing services
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function migrateServices() {
  console.log("Starting service tier migration...");

  try {
    // Get all services that need migration
    const services = await prisma.service.findMany();
    console.log(`Found ${services.length} services to migrate`);

    // Migrate each service
    for (const service of services) {
      console.log(`Migrating service: ${service.id} - ${service.name}`);

      // If basePrice is not set, use the price field
      if (service.basePrice === 0 && service.price !== null) {
        await prisma.service.update({
          where: { id: service.id },
          data: { basePrice: service.price },
        });
        console.log(`  Updated basePrice from price: ${service.price}`);
      }

      // Check if tiers already exist
      const existingTiers = await prisma.serviceTierPrice.findMany({
        where: { serviceId: service.id },
      });

      if (existingTiers.length === 0) {
        // Create default tiers based on the service price/basePrice
        const basePrice = service.basePrice || service.price || 0;

        const tiers = [
          {
            tier: "BRONZE",
            price: basePrice,
            description: "Basic package",
          },
          {
            tier: "SILVER",
            price: Math.round(basePrice * 1.5),
            description: "Standard package with additional features",
          },
          {
            tier: "GOLD",
            price: Math.round(basePrice * 2),
            description: "Premium package with priority service",
          },
          {
            tier: "PLATINUM",
            price: Math.round(basePrice * 3),
            description: "Ultimate package with all premium features",
          },
        ];

        // Create tiers for the service
        for (const tier of tiers) {
          await prisma.serviceTierPrice.create({
            data: {
              serviceId: service.id,
              tier: tier.tier,
              price: tier.price,
              description: tier.description,
            },
          });
          console.log(`  Created ${tier.tier} tier: ETB ${tier.price}`);
        }
      } else {
        console.log(
          `  Service already has ${existingTiers.length} tiers, skipping`
        );
      }
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateServices()
  .then(() => console.log("Done!"))
  .catch((error) => console.error("Fatal error:", error));
