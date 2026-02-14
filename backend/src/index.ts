import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});

import { app } from "./app";

const port = process.env.PORT || 4001;

app.listen(port, () => {
  console.log(`server running on PORT ${port}`);
});
