import app from "./app.js";

const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
}

export default app;
