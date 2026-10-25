
const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ========================================
// CONFIGURACION DE SUPABASE
// ========================================

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// ========================================
// VERIFICAR FUNCIONAMIENTO DEL SERVIDOR
// ========================================

app.get("/api/estado", (req, res) => {
  res.json({
    sistema: "DR. JIBA",
    estado: "activo",
    mensaje: "Servidor funcionando correctamente"
  });
});

// ========================================
// CONSULTAR PRODUCTOS DE SUPABASE
// ========================================

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

    return res.json(data);

  } catch (error) {
    console.error("Error:", error.message);

    return res.status(500).json({
      error: "Error interno del servidor"
    });
  }
});

// ========================================
// PASO 73: VERIFICAR USUARIO Y ROL
// ========================================

app.get("/api/mi-perfil", async (req, res) => {
  try {
    const autorizacion = req.headers.authorization || "";

    // Comprobar que se envio un token
    if (!autorizacion.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Debes iniciar sesión"
      });
    }

    const token = autorizacion.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        error: "Debes iniciar sesión"
      });
    }

    // Verificar el token con Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return res.status(401).json({
        error: "Sesión inválida o vencida"
      });
    }

    // Crear cliente con el token del usuario
    // para respetar las politicas RLS
    const supabaseUsuario = createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Consultar el perfil del usuario
    const { data: perfil, error: perfilError } =
      await supabaseUsuario
        .from("user_profiles")
        .select("nombre_completo, rol, activo")
        .eq("id_usuario", authData.user.id)
        .single();

    if (perfilError) {
      console.error(
        "Error al consultar perfil:",
        perfilError.message
      );

      return res.status(403).json({
        error: "No se pudo consultar el perfil del usuario"
      });
    }

    // Verificar que el perfil exista y este activo
    if (!perfil || !perfil.activo) {
      return res.status(403).json({
        error: "Usuario sin perfil activo o sin permisos"
      });
    }

    // Devolver datos basicos del usuario
    return res.json({
      nombre: perfil.nombre_completo,
      rol: perfil.rol,
      activo: perfil.activo
    });

  } catch (error) {
    console.error(
      "Error al verificar usuario:",
      error.message
    );

    return res.status(500).json({
      error: "No se pudo verificar el usuario"
    });
  }
});

// ========================================
// INICIAR SERVIDOR
// ========================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Servidor DR. JIBA iniciado en puerto ${PORT}`
  );
});
