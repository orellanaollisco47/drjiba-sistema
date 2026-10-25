
const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Configuracion de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Verificar funcionamiento del servidor
app.get("/api/estado", (req, res) => {
  res.json({
    sistema: "DR. JIBA",
    estado: "activo",
    mensaje: "Servidor funcionando correctamente"
  });
});

// Consultar productos de Supabase
app.get("/api/productos", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("id_producto, nombre, precio_venta, stock_actual")
      .order("id_producto");

    if (error) {
      console.error("Error Supabase:", error.message);
      return res.status(500).json({
        error: "No se pudieron consultar los productos"
      });
    }

    res.json(data);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({
      error: "Error interno del servidor"
    });
  }
});

// Iniciar servidor
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor DR. JIBA iniciado en puerto ${PORT}`);
});
