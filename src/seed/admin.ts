import { AppDataSource } from "../data-source";
import { Admin } from "../entity/Admin";
import bcrypt from "bcryptjs";

export async function seedDefaultAdmin() {
  const adminRepo = AppDataSource.getMongoRepository(Admin);

  const count = await adminRepo.countDocuments({ isDelete: 0 });

  if (count > 0) {
    return;
  }

  const defaultAdmin = new Admin();
  defaultAdmin.name = "MyShoot Admin";
  defaultAdmin.email = "admin@myshoot.com";
  defaultAdmin.phoneNumber = "9988776655";
  defaultAdmin.password = await bcrypt.hash("admin123", 10);
  defaultAdmin.role = "ADMIN";
  defaultAdmin.isActive = 1;
  defaultAdmin.isDelete = 0;

  await adminRepo.save(defaultAdmin);

  console.log("🌟 Default Admin seeded successfully");
}
