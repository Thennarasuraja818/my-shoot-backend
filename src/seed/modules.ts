import { AppDataSource } from "../data-source";
import { Modules } from "../entity/Modules";

export async function seedDefaultModules() {
  const moduleRepo = AppDataSource.getMongoRepository(Modules);

  // Clear existing
  await moduleRepo.deleteMany({});

  const modules = [
    "Dashboard",
    "Website",
    "Banner",
    "Category",
    "Sub Category",
    "User List",
    "Customer List",
    "Role & Permission",
    "Activity Logs"
  ];

  const moduleEntities = modules.map((name) => {
    const module = new Modules();
    module.name = name;
    module.isActive = 1;
    module.isDelete = 0;
    return module;
  });

  await moduleRepo.save(moduleEntities);

  console.log("🌟 Modules seeded successfully");
}