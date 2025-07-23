import express from 'express';
import mongoose from 'mongoose';
import bodyparser from "body-parser";
import passport from "passport"
import { Strategy as LocalStrategy } from 'passport-local';
import cors from "cors"
import JWT from "jsonwebtoken"
import dotenv from "dotenv";





dotenv.config();
const app = express();


const port = 2455


app.use(cors());

app.use(bodyparser.urlencoded({ extended: false }));


app.use(bodyparser.json())

app.use(passport.initialize())

const mongoURL = process.env.MONGODB_URL;

if (!mongoURL) {
    throw new Error("❌ MONGODB_URL is not defined in environment variables.");
}
mongoose.connect(mongoURL).then(()=>{
    console.log("connected to mongodb");
}).catch(()=>{
    console.log("error connected to mongodb");
})


app.listen(port,()=>{
    console.log(`the server has started on port ${port}`);  
})