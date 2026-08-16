import { db } from "@workspace/db";
import { animalsTable, eidCyclesTable } from "@workspace/db/schema";

async function seed() {
  console.log("Seeding EidSave database...");

  const existingAnimals = await db.select().from(animalsTable);
  if (existingAnimals.length === 0) {
    await db.insert(animalsTable).values([
      {
        name: "Sokoto Gudali Ram",
        category: "Ram",
        description: "Premium Sokoto Gudali ram, well-fed and healthy. Ideal for Eid al-Adha sacrifice. Comes with halal slaughter and free meat processing.",
        imageUrl: "/assets/images/ram.png",
        sizes: [
          { label: "Small", weight: "15–20kg", price: 45000 },
          { label: "Medium", weight: "20–30kg", price: 75000 },
          { label: "Large", weight: "30–40kg", price: 120000 },
          { label: "XL", weight: "40kg+", price: 180000 },
        ],
        isAvailable: true,
        stock: "available",
        eidType: "adha",
      },
      {
        name: "West African Dwarf Goat",
        category: "Goat",
        description: "Healthy West African Dwarf goat, well-raised on natural feed. Perfect for smaller households celebrating Eid al-Adha.",
        imageUrl: "/assets/images/goat.png",
        sizes: [
          { label: "Small", weight: "15–20kg", price: 35000 },
          { label: "Medium", weight: "20–30kg", price: 55000 },
        ],
        isAvailable: true,
        stock: "available",
        eidType: "adha",
      },
      {
        name: "Bunaji White Cow",
        category: "Cow",
        description: "Premium Bunaji white cow, excellent for group Eid al-Fitr purchases. Each cow feeds 7 families. Includes delivery and halal processing.",
        imageUrl: "/assets/images/cow.png",
        sizes: [
          { label: "Small Share (1/7)", weight: "~40kg meat", price: 150000 },
          { label: "Full Cow", weight: "280kg live", price: 600000 },
        ],
        isAvailable: true,
        stock: "available",
        eidType: "fitr",
      },
      {
        name: "Bodija Market Ram",
        category: "Ram",
        description: "Premium Bodija market ram, sourced directly from trusted Fulani herders. Excellent for Eid al-Adha. Home delivery to your doorstep.",
        imageUrl: "/assets/images/ram.png",
        sizes: [
          { label: "Small", weight: "15–20kg", price: 40000 },
          { label: "Medium", weight: "20–30kg", price: 70000 },
          { label: "Large", weight: "30–40kg", price: 110000 },
        ],
        isAvailable: true,
        stock: "available",
        eidType: "adha",
      },
      {
        name: "Kano Sahel Goat",
        category: "Goat",
        description: "Hardy Sahel goat from Kano, known for its lean and flavorful meat. Great value for Eid sacrifice.",
        imageUrl: "/assets/images/goat.png",
        sizes: [
          { label: "Small", weight: "12–18kg", price: 30000 },
          { label: "Medium", weight: "18–25kg", price: 50000 },
          { label: "Large", weight: "25kg+", price: 70000 },
        ],
        isAvailable: true,
        stock: "available",
        eidType: "adha",
      },
      {
        name: "Fulani Ndama Cow",
        category: "Cow",
        description: "Traditional Fulani Ndama cow, disease-resistant and naturally raised. Popular for community Eid celebrations.",
        imageUrl: "/assets/images/cow.png",
        sizes: [
          { label: "Small Share (1/7)", weight: "~35kg meat", price: 130000 },
          { label: "Half Cow", weight: "140kg live", price: 320000 },
          { label: "Full Cow", weight: "280kg live", price: 550000 },
        ],
        isAvailable: true,
        stock: "limited",
        eidType: "both",
      },
    ]);
    console.log("Animals seeded successfully");
  } else {
    console.log(`Skipping animals — ${existingAnimals.length} already exist`);
  }

  const existingCycles = await db.select().from(eidCyclesTable);
  if (existingCycles.length === 0) {
    await db.insert(eidCyclesTable).values([
      {
        eidType: "adha",
        year: 2026,
        eidDate: "2026-06-17",
        withdrawalUnlockDate: "2026-05-18",
        deliveryStartDate: "2026-06-10",
        deliveryEndDate: "2026-06-17",
        isActive: true,
      },
      {
        eidType: "fitr",
        year: 2027,
        eidDate: "2027-03-20",
        withdrawalUnlockDate: "2027-02-18",
        deliveryStartDate: "2027-03-18",
        deliveryEndDate: "2027-03-20",
        isActive: true,
      },
    ]);
    console.log("Eid cycles seeded successfully");
  } else {
    console.log(`Skipping Eid cycles — ${existingCycles.length} already exist`);
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
