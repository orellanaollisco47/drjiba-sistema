
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

// ========================================
// DIAGNOSTICO DE VARIABLES EN VERCEL
// ========================================

console.log("====================================");
console.log("DIAGNOSTICO SUPABASE - DR. JIBA");

console.log(
  "SUPABASE_URL disponible:",
  Boolean(supabaseUrl)
);

console.log(
  "SUPABASE_PUBLISHABLE_KEY disponible:",
  Boolean(supabaseKey)
);

console.log("====================================");

if (!supabaseUrl || !supabaseKey) {
  console.error("ERROR DE CONFIGURACION DE SUPABASE");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Crear cliente con el token del usuario.
// Las consultas respetan las politicas RLS.
function clienteUsuario(token) {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

// ========================================
// VERIFICAR ESTADO DEL SERVIDOR
// ========================================

app.get("/api/estado", (req, res) => {
  return res.json({
    sistema: "DR. JIBA",
    estado: "activo",
    mensaje: "Servidor funcionando correctamente"
  });
});

// ========================================
// INICIAR SESION
// ========================================

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        error: "Ingresa tu correo y contraseña"
      });
    }

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

    if (error || !data.session || !data.user) {
      return res.status(401).json({
        error: "Correo o contraseña incorrectos"
      });
    }

    const token = data.session.access_token;
    const usuarioDb = clienteUsuario(token);

    const { data: perfil, error: perfilError } =
      await usuarioDb
        .from("user_profiles")
        .select("nombre_completo, rol, activo")
        .eq("id_usuario", data.user.id)
        .single();

    if (perfilError || !perfil || !perfil.activo) {
      console.error(
        "Perfil no disponible:",
        perfilError?.message || "Perfil inactivo"
      );

      return res.status(403).json({
        error: "Usuario sin perfil activo o sin permisos"
      });
    }

    return res.json({
      access_token: token,
      nombre_completo: perfil.nombre_completo,
      rol: perfil.rol
    });

  } catch (error) {
    console.error("Error de login:", error.message);

    return res.status(500).json({
      error: "No se pudo iniciar sesión"
    });
  }
});

// ========================================
// VERIFICAR TOKEN Y PERFIL
// ========================================

async function verificarSesion(req, res, next) {
  try {
    const autorizacion = req.headers.authorization || "";

    if (!autorizacion.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Debes iniciar sesión"
      });
    }

    const token = autorizacion.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        error: "Debes iniciar sesión"
      });
    }

    const { data, error } =
      await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        error: "Sesión inválida o vencida"
      });
    }

    const usuarioDb = clienteUsuario(token);

    const { data: perfil, error: perfilError } =
      await usuarioDb
        .from("user_profiles")
        .select("nombre_completo, rol, activo")
        .eq("id_usuario", data.user.id)
        .single();

    if (perfilError || !perfil || !perfil.activo) {
      return res.status(403).json({
        error: "Usuario sin perfil activo o sin permisos"
      });
    }

    req.usuario = data.user;
    req.perfil = perfil;
    req.supabaseUsuario = usuarioDb;

    next();

  } catch (error) {
    console.error(
      "Error al verificar sesión:",
      error.message
    );

    return res.status(500).json({
      error: "No se pudo verificar la sesión"
    });
  }
}

// ========================================
// CONSULTAR PERFIL
// ========================================

app.get("/api/mi-perfil", verificarSesion, (req, res) => {
  return res.json({
    nombre_completo: req.perfil.nombre_completo,
    rol: req.perfil.rol,
    activo: req.perfil.activo
  });
});

// ========================================
// CONSULTAR PRODUCTOS
// ========================================

app.get("/api/productos", verificarSesion, async (req, res) => {
  try {
    const { data, error } =
      await req.supabaseUsuario
        .from("products")
        .select(
          "id_producto, nombre, precio_venta, stock_actual"
        )
        .order("id_producto");

    if (error) {
      console.error(
        "Error al consultar productos:",
        error.message
      );

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
// CONSULTAR COMPRAS
// ========================================

app.get("/api/compras", verificarSesion, async (req, res) => {
  try {
    if (
      !["ADMINISTRADOR", "ALMACEN"].includes(req.perfil.rol)
    ) {
      return res.status(403).json({
        error: "No tienes permisos para consultar compras"
      });
    }

    const { data, error } =
      await req.supabaseUsuario
        .from("purchases")
        .select(
          "id_compra, id_proveedor, fecha_compra, total_compra, estado, observaciones"
        )
        .order("id_compra", { ascending: false });

    if (error) {
      console.error(
        "Error al consultar compras:",
        error.message
      );

      return res.status(500).json({
        error: "No se pudieron consultar las compras"
      });
    }

    return res.json(data);

  } catch (error) {
    console.error(
      "Error interno al consultar compras:",
      error.message
    );

    return res.status(500).json({
      error: "Error interno del servidor"
    });
  }
});

// ========================================
// REGISTRAR COMPRA COMO BORRADOR
// ========================================

app.post("/api/compras", verificarSesion, async (req, res) => {
  try {
    // Verificar permisos del usuario
    if (
      !["ADMINISTRADOR", "ALMACEN"].includes(req.perfil.rol)
    ) {
      return res.status(403).json({
        error: "No tienes permisos para registrar compras"
      });
    }

    const {
      id_proveedor,
      productos,
      observaciones
    } = req.body || {};

    // Validar proveedor
    if (
      !Number.isSafeInteger(id_proveedor) ||
      id_proveedor <= 0
    ) {
      return res.status(400).json({
        error: "Selecciona un proveedor válido"
      });
    }

    // Validar que existan productos
    if (
      !Array.isArray(productos) ||
      productos.length === 0
    ) {
      return res.status(400).json({
        error: "Debes agregar al menos un producto"
      });
    }

    // Validar cada producto
    for (const producto of productos) {
      if (
        !producto ||
        !Number.isSafeInteger(producto.id_producto) ||
        producto.id_producto <= 0 ||
        !Number.isSafeInteger(producto.cantidad) ||
        producto.cantidad <= 0 ||
        typeof producto.precio_unitario !== "number" ||
        !Number.isFinite(producto.precio_unitario) ||
        producto.precio_unitario < 0
      ) {
        return res.status(400).json({
          error: "Hay productos con datos incorrectos"
        });
      }
    }

    if (
      observaciones != null &&
      typeof observaciones !== "string"
    ) {
      return res.status(400).json({
        error: "Las observaciones deben ser texto"
      });
    }

    // Llamar a la funcion registrar_compra
    // que ya existe en Supabase.
    const { data, error } =
      await req.supabaseUsuario.rpc(
        "registrar_compra",
        {
          p_id_proveedor: id_proveedor,
          p_productos: productos,
          p_observaciones: observaciones || null
        }
      );

    if (error) {
      console.error(
        "Error al registrar compra:",
        error.message
      );

      return res.status(400).json({
        error: "No se pudo registrar la compra. Verifica los datos y permisos."
      });
    }

    return res.status(201).json({
      mensaje: "Compra guardada como borrador",
      id_compra: data,
      estado: "BORRADOR"
    });

  } catch (error) {
    console.error(
      "Error interno al registrar compra:",
      error.message
    );

    return res.status(500).json({
      error: "Error interno al registrar la compra"
    });
  }
});
// ========================================
// CONFIRMAR COMPRA Y ACTUALIZAR INVENTARIO
// ========================================

app.post("/api/compras/:id/confirmar", verificarSesion, async (req, res) => {
  try {
    // Verificar permisos
    if (!["ADMINISTRADOR", "ALMACEN"].includes(req.perfil.rol)) {
      return res.status(403).json({
        error: "No tienes permisos para confirmar compras"
      });
    }

    // Validar identificador de compra
    const idCompra = Number(req.params.id);

    if (!Number.isSafeInteger(idCompra) || idCompra <= 0) {
      return res.status(400).json({
        error: "El número de compra no es válido"
      });
    }

    // Confirmar mediante la función autorizada de Supabase
    const { error } = await req.supabaseUsuario.rpc(
      "confirmar_compra_autorizada",
      {
        p_id_compra: idCompra
      }
    );

    if (error) {
      console.error("Error al confirmar compra:", error.message);

      return res.status(400).json({
        error: "No se pudo confirmar la compra. Verifica su estado y tus permisos."
      });
    }

    return res.json({
      mensaje: "Compra confirmada correctamente",
      id_compra: idCompra,
      estado: "CONFIRMADA"
    });

  } catch (error) {
    console.error("Error interno al confirmar compra:", error.message);

    return res.status(500).json({
      error: "Error interno al confirmar la compra"
    });
  }
});
 // ========================================
 // CONSULTAR PROVEEDORES ACTIVOS
 // ========================================

app.get("/api/proveedores", verificarSesion, async (req, res) => {
  try {
    if (!["ADMINISTRADOR", "ALMACEN"].includes(req.perfil.rol)) {
      return res.status(403).json({
        error: "No tienes permisos para consultar proveedores"
      });
    }

    const { data, error } = await req.supabaseUsuario
      .from("suppliers")
      .select("id_proveedor, nombre, activo")
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error al consultar proveedores:", error.message);

      return res.status(500).json({
        error: "No se pudieron consultar los proveedores"
      });
    }

    return res.json(data || []);

  } catch (error) {
    console.error("Error interno al consultar proveedores:", error.message);

    return res.status(500).json({
      error: "Error interno del servidor"
    });
  }
});

// ========================================
// RESPUESTA JSON PARA RUTAS API DESCONOCIDAS
// ========================================

app.use("/api", (req, res) => {
  return res.status(404).json({
    error: "Ruta API no encontrada"
  });
});

// ========================================
// INICIAR SERVIDOR
// ========================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Servidor DR. JIBA iniciado en puerto ${PORT}`
  );
});
