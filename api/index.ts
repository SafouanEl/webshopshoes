// api/index.ts
import serverless from "serverless-http";
import app from "../index";

export default serverless(app); // geen app.listen hier!
