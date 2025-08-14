import serverless from "serverless-http";
import app from "../index"; // of waar je Express-app staat
export default serverless(app);
