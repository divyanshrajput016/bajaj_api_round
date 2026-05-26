require("dotenv").config()
const express = require("express")
const cors = require("cors")
const ticketRoutes = require("./src/routes/ticketRoutes")

const app = express();

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json())

app.get("/api/health",(req,res) => {
    res.status(200).json({
        message : "DeskFlow API is running"
    })
})

app.use("/api/tickets", ticketRoutes)

module.exports = app
