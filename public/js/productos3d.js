// ========================================
// VITRINA 3D DE PRODUCTOS (Three.js)
// ========================================

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const COLORES_ESTADO = {
  agotado: "#b91c1c",
  bajo: "#d97706",
  disponible: "#15803d"
};

const TEXTO_ESTADO = {
  agotado: "Agotado",
  bajo: "Stock bajo",
  disponible: "Disponible"
};

let visorActual = null;

function soportaWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch (error) {
    return false;
  }
}

function material(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.05,
    ...extra
  });
}

function crearMesa() {
  const mesa = new THREE.Mesh(
    new THREE.CylinderGeometry(2.3, 2.3, 0.14, 64),
    material("#7c4a2d", { roughness: 0.8 })
  );
  mesa.position.y = -0.09;
  return mesa;
}

function crearPlato() {
  const perfil = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.95, 0),
    new THREE.Vector2(1.05, 0.04),
    new THREE.Vector2(1.35, 0.14),
    new THREE.Vector2(1.45, 0.17),
    new THREE.Vector2(1.47, 0.15),
    new THREE.Vector2(1.36, 0.11),
    new THREE.Vector2(1.04, 0.05),
    new THREE.Vector2(0, 0.05)
  ];

  const plato = new THREE.Mesh(
    new THREE.LatheGeometry(perfil, 64),
    material("#f9fafb", { roughness: 0.25, side: THREE.DoubleSide })
  );

  const borde = new THREE.Mesh(
    new THREE.TorusGeometry(1.4, 0.025, 12, 96),
    material(COLORES_ESTADO.disponible, { roughness: 0.4 })
  );
  borde.rotation.x = Math.PI / 2;
  borde.position.y = 0.135;

  const grupo = new THREE.Group();
  grupo.add(plato, borde);
  return { grupo, borde };
}

function crearHamburguesa() {
  const grupo = new THREE.Group();
  let altura = 0.05;

  function capa(radio, alto, color) {
    const malla = new THREE.Mesh(
      new THREE.CylinderGeometry(radio, radio, alto, 48),
      material(color)
    );
    malla.position.y = altura + alto / 2;
    altura += alto;
    grupo.add(malla);
    return malla;
  }

  capa(0.62, 0.16, "#d99a52");
  capa(0.7, 0.04, "#4d9a3a");
  capa(0.64, 0.17, "#5b3a29");

  const queso = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.03, 1.0),
    material("#facc15", { roughness: 0.4 })
  );
  queso.position.y = altura + 0.015;
  queso.rotation.y = Math.PI / 4;
  altura += 0.03;
  grupo.add(queso);

  capa(0.56, 0.05, "#dc2626");

  const panSuperior = new THREE.Mesh(
    new THREE.SphereGeometry(0.66, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
    material("#e0a45e")
  );
  panSuperior.scale.y = 0.6;
  panSuperior.position.y = altura;
  grupo.add(panSuperior);

  const ajonjoli = material("#fef3c7");
  const geometriaSemilla = new THREE.SphereGeometry(0.025, 8, 6);

  for (let i = 0; i < 18; i++) {
    const angulo = i * 2.399;
    const distancia = 0.12 + (i % 6) * 0.07;
    const x = Math.cos(angulo) * distancia;
    const z = Math.sin(angulo) * distancia;
    const yNormal = Math.sqrt(Math.max(0, 0.66 * 0.66 - x * x - z * z));
    const semilla = new THREE.Mesh(geometriaSemilla, ajonjoli);
    semilla.position.set(x, altura + yNormal * 0.6, z);
    semilla.scale.set(1, 0.6, 1.6);
    grupo.add(semilla);
  }

  return grupo;
}

function crearCampana() {
  const metal = material("#e5e7eb", {
    roughness: 0.25,
    metalness: 0.35,
    side: THREE.DoubleSide
  });

  const cupula = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
    metal
  );
  const asa = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), metal);
  asa.position.y = 0.95;

  const campana = new THREE.Group();
  campana.add(cupula, asa);
  campana.position.set(1.55, 0.85, -0.4);
  campana.rotation.z = -0.95;
  campana.scale.setScalar(0.8);
  return campana;
}

function recortarTexto(contexto, texto, anchoMaximo) {
  if (contexto.measureText(texto).width <= anchoMaximo) {
    return texto;
  }

  let recortado = texto;

  while (
    recortado.length > 1 &&
    contexto.measureText(recortado + "…").width > anchoMaximo
  ) {
    recortado = recortado.slice(0, -1);
  }

  return recortado + "…";
}

function dibujarTarjeta(canvas, producto) {
  const contexto = canvas.getContext("2d");
  const ancho = canvas.width;
  const alto = canvas.height;
  const estado = producto?.estado || "disponible";
  const color = COLORES_ESTADO[estado];

  contexto.clearRect(0, 0, ancho, alto);

  contexto.fillStyle = "#ffffff";
  contexto.beginPath();
  contexto.roundRect(4, 4, ancho - 8, alto - 8, 28);
  contexto.fill();

  contexto.lineWidth = 6;
  contexto.strokeStyle = color;
  contexto.stroke();

  contexto.fillStyle = color;
  contexto.beginPath();
  contexto.roundRect(4, 4, ancho - 8, 70, [28, 28, 0, 0]);
  contexto.fill();

  contexto.fillStyle = "#ffffff";
  contexto.font = "bold 34px Arial, sans-serif";
  contexto.textBaseline = "middle";
  contexto.fillText(
    producto ? TEXTO_ESTADO[estado] : "DR. JIBA",
    32,
    40
  );

  contexto.fillStyle = "#1f2937";
  contexto.font = "bold 44px Arial, sans-serif";
  contexto.fillText(
    recortarTexto(
      contexto,
      producto ? String(producto.nombre ?? "") : "Selecciona un producto",
      ancho - 64
    ),
    32,
    125
  );

  if (producto) {
    contexto.fillStyle = "#7f1d1d";
    contexto.font = "bold 58px Arial, sans-serif";
    contexto.fillText(
      "Bs " + Number(producto.precio_venta || 0).toFixed(2),
      32,
      200
    );

    contexto.fillStyle = "#4b5563";
    contexto.font = "32px Arial, sans-serif";
    contexto.fillText(
      "Stock: " + Number(producto.stock_actual || 0) +
        "   |   ID: " + producto.id_producto,
      32,
      270
    );
  } else {
    contexto.fillStyle = "#6b7280";
    contexto.font = "30px Arial, sans-serif";
    contexto.fillText("Haz clic en una fila de la tabla", 32, 200);
  }
}

function crearTarjeta() {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 320;
  dibujarTarjeta(canvas, null);

  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 4;

  const materialTarjeta = new THREE.MeshBasicMaterial({
    map: textura,
    transparent: true
  });
  const geometria = new THREE.PlaneGeometry(2.0, 1.0);

  const frente = new THREE.Mesh(geometria, materialTarjeta);
  const reverso = new THREE.Mesh(geometria, materialTarjeta);
  reverso.rotation.y = Math.PI;

  const grupo = new THREE.Group();
  grupo.add(frente, reverso);
  grupo.position.y = 1.85;

  return { grupo, canvas, textura };
}

function liberarRecursos(objeto) {
  objeto.traverse(hijo => {
    if (hijo.geometry) hijo.geometry.dispose();

    if (hijo.material) {
      const materiales = Array.isArray(hijo.material)
        ? hijo.material
        : [hijo.material];

      materiales.forEach(mat => {
        if (mat.map) mat.map.dispose();
        mat.dispose();
      });
    }
  });
}

function mostrarFallback(contenedor, mensaje) {
  contenedor.innerHTML = "";
  const aviso = document.createElement("p");
  aviso.className = "visor3d-fallback";
  aviso.textContent = mensaje;
  contenedor.appendChild(aviso);
}

function montar(contenedor) {
  destruir();

  if (!contenedor) return false;

  if (!soportaWebGL()) {
    mostrarFallback(
      contenedor,
      "Tu navegador no soporta WebGL. La vitrina 3D no está disponible, pero puedes seguir usando la tabla."
    );
    return false;
  }

  const reducirMovimiento = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (error) {
    console.error("No se pudo iniciar WebGL:", error);
    mostrarFallback(
      contenedor,
      "No se pudo iniciar la vitrina 3D en este dispositivo."
    );
    return false;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    "Vitrina 3D del producto seleccionado. Arrastra o usa las flechas para rotar."
  );

  contenedor.innerHTML = "";
  contenedor.appendChild(canvas);

  const escena = new THREE.Scene();

  const camara = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camara.position.set(0, 2.6, 5.6);

  escena.add(new THREE.HemisphereLight("#ffffff", "#7f1d1d", 1.6));

  const luz = new THREE.DirectionalLight("#ffffff", 2.2);
  luz.position.set(3, 6, 4);
  escena.add(luz);

  const vitrina = new THREE.Group();
  const plato = crearPlato();
  const tarjeta = crearTarjeta();

  vitrina.add(
    crearMesa(),
    plato.grupo,
    crearHamburguesa(),
    crearCampana(),
    tarjeta.grupo
  );
  escena.add(vitrina);

  const controles = new OrbitControls(camara, canvas);
  controles.target.set(0, 0.9, 0);
  controles.enableDamping = true;
  controles.enablePan = false;
  controles.minDistance = 3.5;
  controles.maxDistance = 9;
  controles.maxPolarAngle = Math.PI * 0.49;
  controles.autoRotate = !reducirMovimiento;
  controles.autoRotateSpeed = 1.2;
  controles.update();

  let temporizadorGiro = null;

  controles.addEventListener("start", () => {
    controles.autoRotate = false;
    clearTimeout(temporizadorGiro);
  });

  controles.addEventListener("end", () => {
    if (reducirMovimiento) return;
    clearTimeout(temporizadorGiro);
    temporizadorGiro = setTimeout(() => {
      controles.autoRotate = true;
    }, 4000);
  });

  function alPresionarTecla(evento) {
    const paso = 0.15;

    if (evento.key === "ArrowLeft") {
      vitrina.rotation.y -= paso;
    } else if (evento.key === "ArrowRight") {
      vitrina.rotation.y += paso;
    } else {
      return;
    }

    evento.preventDefault();
    controles.autoRotate = false;
  }

  canvas.addEventListener("keydown", alPresionarTecla);

  function ajustarTamano() {
    const ancho = contenedor.clientWidth || 300;
    const alto = contenedor.clientHeight || 300;
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
  }

  const observador = new ResizeObserver(ajustarTamano);
  observador.observe(contenedor);
  ajustarTamano();

  const reloj = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    if (!reducirMovimiento) {
      tarjeta.grupo.position.y =
        1.85 + Math.sin(reloj.getElapsedTime() * 1.5) * 0.05;
    }

    controles.update();
    renderer.render(escena, camara);
  });

  visorActual = {
    renderer,
    escena,
    controles,
    observador,
    canvas,
    plato,
    tarjeta,
    temporizador: () => clearTimeout(temporizadorGiro),
    alPresionarTecla
  };

  return true;
}

function mostrarProducto(producto) {
  if (!visorActual) return;

  const { tarjeta, plato } = visorActual;
  dibujarTarjeta(tarjeta.canvas, producto);
  tarjeta.textura.needsUpdate = true;

  const estado = producto?.estado || "disponible";
  plato.borde.material.color.set(COLORES_ESTADO[estado]);
}

function destruir() {
  if (!visorActual) return;

  const actual = visorActual;
  visorActual = null;

  actual.renderer.setAnimationLoop(null);
  actual.temporizador();
  actual.observador.disconnect();
  actual.canvas.removeEventListener("keydown", actual.alPresionarTecla);
  actual.controles.dispose();
  liberarRecursos(actual.escena);
  actual.renderer.dispose();
  actual.canvas.remove();
}

window.DrJiba3D = { montar, mostrarProducto, destruir };
window.dispatchEvent(new Event("drjiba3d:listo"));
