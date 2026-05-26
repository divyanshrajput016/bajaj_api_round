const express = require("express")
const ticketController = require("../controller/ticketController")

const router = express.Router();

router.post("/",ticketController.createTicket)
router.get("/",ticketController.getTickets)
router.get("/stats",ticketController.getTicketStats)
router.patch("/:id",ticketController.updateTicket)
router.delete("/:id",ticketController.deleteTicket)

module.exports = router;
