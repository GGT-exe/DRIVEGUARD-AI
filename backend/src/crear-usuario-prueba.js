// crear-usuario-prueba.js
// Historia 18 — script de UNA sola vez, para tener un usuario de prueba
// con el que más adelante puedas probar el login (POST /login).
//
// Uso: node crear-usuario-prueba.js

const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("./auth");

const prisma = new PrismaClient();

async function main() {
  const contrasenaHash = await hashPassword("Prueba123!"); // cámbiala si quieres

  const usuario = await prisma.usuarios.create({
    data: {
      nombre: "Admin de Prueba",
      correo: "admin@driveguard.test",
      contrasena_hash: contrasenaHash,
      rol: "administrador",
    },
  });

  console.log("Usuario creado:", usuario);
}

main()
  .catch((err) => console.error("Error creando el usuario:", err))
  .finally(() => prisma.$disconnect());
