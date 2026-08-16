import { AnimalRepository } from "../repositories/animal.repository.js";
import { createError } from "../middlewares/error.js";

type AnimalRow = Awaited<ReturnType<typeof AnimalRepository.findById>>;

function toAnimalResponse(animal: NonNullable<AnimalRow>) {
  return {
    id: animal.id,
    name: animal.name,
    category: animal.category as "Ram" | "Goat" | "Cow" | "Chicken" | "Duck" | "Ostrich",
    subcategory: animal.subcategory ?? null,
    description: animal.description,
    imageUrl: animal.imageUrl,
    sizes: (animal.sizes as Array<{ label: string; weight: string; price: number }>) ?? [],
    isAvailable: animal.isAvailable,
    stock: animal.stock as "available" | "limited" | "out_of_stock",
    eidType: animal.eidType as "adha" | "fitr" | "both",
    createdAt: animal.createdAt.toISOString(),
  };
}

export const AnimalService = {
  toAnimalResponse,

  async listAnimals(filters?: { eidType?: string; category?: string }) {
    const animals = await AnimalRepository.findAll(filters);
    return { animals: animals.map(toAnimalResponse) };
  },

  async getAnimal(id: string) {
    const animal = await AnimalRepository.findById(id);
    if (!animal) throw createError("Animal not found", 404);
    return toAnimalResponse(animal);
  },

  async createAnimal(data: {
    name: string; category: string; subcategory?: string; description: string;
    imageUrl: string; sizes: unknown; isAvailable?: boolean; stock?: string; eidType: string;
  }) {
    const animal = await AnimalRepository.create({
      name: data.name,
      category: data.category,
      subcategory: data.subcategory,
      description: data.description,
      imageUrl: data.imageUrl,
      sizes: data.sizes as Array<{ label: string; weight: string; price: number }>,
      isAvailable: data.isAvailable ?? true,
      stock: data.stock ?? "available",
      eidType: data.eidType,
    });
    return toAnimalResponse(animal);
  },

  async updateAnimal(id: string, data: Record<string, unknown>) {
    const animal = await AnimalRepository.update(id, data);
    if (!animal) throw createError("Animal not found", 404);
    return toAnimalResponse(animal);
  },
};
