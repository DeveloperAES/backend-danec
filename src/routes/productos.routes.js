import { Router } from "express";
import { getProductos, createProducto } from "../controllers/productos.controller.js";
import { verificarToken, verificarRol } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", getProductos);
router.post("/", verificarToken, verificarRol(["admin"]), createProducto);

export default router;
