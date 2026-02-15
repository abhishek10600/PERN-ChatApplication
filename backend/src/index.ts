import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});

import { app } from "./app";
import { DATABASE_URL } from "./constants";

const port = process.env.PORT || 4001;

// console.log({ DATABASE_URL });

app.listen(port, () => {
  console.log(`server running on PORT ${port}`);
});
