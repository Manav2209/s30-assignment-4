import express from "express";
import authRoutes from "./routes/authRoutes";
import { serviceRouter } from "./routes/serviceRoutes";



const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/services", serviceRouter)
app.use()



app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
