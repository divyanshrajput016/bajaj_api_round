const ticketModel = require("../models/ticket")
const connectDB = require("../config/db")
const crypto = require("crypto")

const priorities = ["low","medium","high","urgent"]
const statuses = ["open","in_progress","resolved","closed"]
let memoryTickets = []
const slaTargets = {
    urgent : 60,
    high : 240,
    medium : 1440,
    low : 4320
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function addDerivedFields(ticket) {
    const data = ticket.toObject ? ticket.toObject() : ticket
    const endTime = data.resolvedAt || new Date()
    const ageMinutes = Math.floor((new Date(endTime).getTime() - new Date(data.createdAt).getTime()) / 60000)
    const target = slaTargets[data.priority]

    return {
        ...data,
        ageMinutes,
        slaBreached : ageMinutes > target
    }
}

async function isDatabaseReady() {
    if(process.env.USE_MEMORY_DB === "true") {
        return false
    }

    try {
        await connectDB()
        return true
    } catch(error) {
        return false
    }
}

function canMoveStatus(currentStatus,newStatus) {
    const currentIndex = statuses.indexOf(currentStatus)
    const newIndex = statuses.indexOf(newStatus)

    if(currentIndex === -1 || newIndex === -1) {
        return false
    }

    if(newIndex === currentIndex) {
        return true
    }

    return Math.abs(newIndex - currentIndex) === 1
}

function getBadFields({subject,description,customerEmail,priority}) {
    if(!subject || !description || !customerEmail || !priority) {
        return "All fields are required"
    }

    if(!isValidEmail(customerEmail)) {
        return "Please enter a valid customer email"
    }

    if(!priorities.includes(priority)) {
        return "Invalid priority"
    }

    return null
}

async function createTicket(req,res) {
    try {
        const {subject,description,customerEmail,priority} = req.body

        const error = getBadFields({subject,description,customerEmail,priority})

        if(error) {
            return res.status(400).json({
                message : error
            })
        }

        const dbReady = await isDatabaseReady()

        if(!dbReady) {
            const ticket = {
                _id : crypto.randomBytes(12).toString("hex"),
                subject,
                description,
                customerEmail,
                priority,
                status : "open",
                resolvedAt : null,
                createdAt : new Date(),
                updatedAt : new Date()
            }

            memoryTickets.unshift(ticket)

            return res.status(201).json({
                message : "Ticket created successfully",
                ticket : addDerivedFields(ticket)
            })
        }

        const ticket = await ticketModel.create({
            subject,
            description,
            customerEmail,
            priority
        })

        return res.status(201).json({
            message : "Ticket created successfully",
            ticket : addDerivedFields(ticket)
        })

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message : "Error creating ticket"
        })
    }
}

async function getTickets(req,res) {
    try {
        const {status,priority,breached} = req.query
        const filter = {}

        if(status) {
            if(!statuses.includes(status)) {
                return res.status(400).json({
                    message : "Invalid status"
                })
            }
            filter.status = status
        }

        if(priority) {
            if(!priorities.includes(priority)) {
                return res.status(400).json({
                    message : "Invalid priority"
                })
            }
            filter.priority = priority
        }

        const dbReady = await isDatabaseReady()

        if(!dbReady) {
            let ticketList = memoryTickets.filter((ticket) => {
                if(filter.status && ticket.status !== filter.status) {
                    return false
                }

                if(filter.priority && ticket.priority !== filter.priority) {
                    return false
                }

                return true
            }).map(addDerivedFields)

            if(breached === "true") {
                ticketList = ticketList.filter((ticket) => ticket.slaBreached)
            }

            return res.status(200).json({
                tickets : ticketList
            })
        }

        const tickets = await ticketModel.find(filter).sort({ createdAt: -1 });
        let ticketList = tickets.map(addDerivedFields)

        if(breached === "true") {
            ticketList = ticketList.filter((ticket) => ticket.slaBreached)
        }

        return res.status(200).json({
            tickets : ticketList
        })

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message : "Error fetching tickets"
        })
    }
}

async function updateTicket(req,res) {
    try {
        const {id} = req.params
        const {status,subject,description,customerEmail,priority} = req.body

        if(!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                message : "Invalid ticket id"
            })
        }

        const dbReady = await isDatabaseReady()

        if(!dbReady) {
            const ticket = memoryTickets.find((ticket) => ticket._id === id)

            if(!ticket) {
                return res.status(404).json({
                    message : "Ticket not found"
                })
            }

            if(status) {
                const oldStatus = ticket.status

                if(!statuses.includes(status)) {
                    return res.status(400).json({
                        message : "Invalid status"
                    })
                }

                if(!canMoveStatus(ticket.status,status)) {
                    return res.status(400).json({
                        message : `Invalid status transition from ${ticket.status} to ${status}`
                    })
                }

                ticket.status = status

                if(status === "resolved") {
                    ticket.resolvedAt = new Date()
                }

                if(oldStatus === "resolved" && status === "in_progress") {
                    ticket.resolvedAt = null
                }
            }

            if(subject) ticket.subject = subject
            if(description) ticket.description = description

            if(customerEmail) {
                if(!isValidEmail(customerEmail)) {
                    return res.status(400).json({
                        message : "Please enter a valid customer email"
                    })
                }
                ticket.customerEmail = customerEmail
            }

            if(priority) {
                if(!priorities.includes(priority)) {
                    return res.status(400).json({
                        message : "Invalid priority"
                    })
                }
                ticket.priority = priority
            }

            ticket.updatedAt = new Date()

            return res.status(200).json({
                message : "Ticket updated successfully",
                ticket : addDerivedFields(ticket)
            })
        }

        const ticket = await ticketModel.findById(id)

        if(!ticket) {
            return res.status(404).json({
                message : "Ticket not found"
            })
        }

        if(status) {
            const oldStatus = ticket.status

            if(!statuses.includes(status)) {
                return res.status(400).json({
                    message : "Invalid status"
                })
            }

            if(!canMoveStatus(ticket.status,status)) {
                return res.status(400).json({
                    message : `Invalid status transition from ${ticket.status} to ${status}`
                })
            }

            ticket.status = status

            if(status === "resolved") {
                ticket.resolvedAt = new Date()
            }

            if(oldStatus === "resolved" && status === "in_progress") {
                ticket.resolvedAt = null
            }
        }

        if(subject) {
            ticket.subject = subject
        }

        if(description) {
            ticket.description = description
        }

        if(customerEmail) {
            if(!isValidEmail(customerEmail)) {
                return res.status(400).json({
                    message : "Please enter a valid customer email"
                })
            }
            ticket.customerEmail = customerEmail
        }

        if(priority) {
            if(!priorities.includes(priority)) {
                return res.status(400).json({
                    message : "Invalid priority"
                })
            }
            ticket.priority = priority
        }

        await ticket.save()

        return res.status(200).json({
            message : "Ticket updated successfully",
            ticket : addDerivedFields(ticket)
        })

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message : "Error updating ticket"
        })
    }
}

async function deleteTicket(req,res) {
    try {
        const {id} = req.params

        if(!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                message : "Invalid ticket id"
            })
        }

        const dbReady = await isDatabaseReady()

        if(!dbReady) {
            const oldLength = memoryTickets.length
            memoryTickets = memoryTickets.filter((ticket) => ticket._id !== id)

            if(oldLength === memoryTickets.length) {
                return res.status(404).json({
                    message : "Ticket not found"
                })
            }

            return res.status(200).json({
                message : "Ticket deleted successfully"
            })
        }

        const ticket = await ticketModel.findByIdAndDelete(id)

        if(!ticket) {
            return res.status(404).json({
                message : "Ticket not found"
            })
        }

        return res.status(200).json({
            message : "Ticket deleted successfully"
        })

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message : "Error deleting ticket"
        })
    }
}

async function getTicketStats(req,res) {
    try {
        const dbReady = await isDatabaseReady()

        const tickets = dbReady ? await ticketModel.find({}) : memoryTickets
        const statusCounts = {
            open : 0,
            in_progress : 0,
            resolved : 0,
            closed : 0
        }
        const priorityCounts = {
            low : 0,
            medium : 0,
            high : 0,
            urgent : 0
        }
        let breachedOpen = 0

        tickets.map(addDerivedFields).forEach((ticket) => {
            statusCounts[ticket.status] = statusCounts[ticket.status] + 1
            priorityCounts[ticket.priority] = priorityCounts[ticket.priority] + 1

            if(ticket.status !== "resolved" && ticket.status !== "closed" && ticket.slaBreached) {
                breachedOpen = breachedOpen + 1
            }
        })

        return res.status(200).json({
            statusCounts,
            priorityCounts,
            breachedOpen
        })

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message : "Error fetching stats"
        })
    }
}

module.exports = {
    createTicket,
    getTickets,
    updateTicket,
    deleteTicket,
    getTicketStats
}
