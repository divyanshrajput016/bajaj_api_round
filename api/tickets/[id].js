const ticketController = require("../../backend/src/controller/ticketController")

function setCors(req,res) {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*")
    res.setHeader("Access-Control-Allow-Methods", "PATCH,DELETE,OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    res.setHeader("Access-Control-Allow-Credentials", "true")
}

module.exports = async function handler(req,res) {
    setCors(req,res)
    req.params = {
        id : req.query.id
    }

    if(req.method === "OPTIONS") {
        return res.status(200).end()
    }

    if(req.method === "PATCH") {
        return ticketController.updateTicket(req,res)
    }

    if(req.method === "DELETE") {
        return ticketController.deleteTicket(req,res)
    }

    return res.status(405).json({
        message : "Method not allowed"
    })
}
