const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "Lista de productos" });
});

router.post("/", (req, res) => {
  res.json({ message: "Producto creado" });
});

module.exports = router;