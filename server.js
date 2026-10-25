
const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Permitir recibir datos en formato JSON
app.use(express.json());

// Carpeta de archivos de la pagina web
app.use(express.static(path.join(__dirname, "public")));

// Ruta para comprobar que el servidor funciona
app.get("/api/estado", (req, res) => {
  res.json({
    sistema: "DR. JIBA",
    mensaje: "Servidor funcionando correctamente",
    estado: "activo"
  });
});

// Iniciar servidor
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor DR. JIBA iniciado en puerto ${PORT}`);
});
