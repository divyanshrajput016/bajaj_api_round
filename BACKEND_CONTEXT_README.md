# Backend Context - AI Powered Resume Analyser

This file is for giving backend-only context to any AI assistant before asking it to edit the server code.

The backend was written manually by the owner. Future backend code should follow the existing style closely.

## Backend Overview

The backend is a Node.js and Express API for an AI powered resume analyser.

It handles:

- User registration
- User login
- User logout
- Cookie based authentication
- JWT verification
- Token blacklisting
- Resume PDF upload
- PDF text extraction
- AI report generation
- Saving interview reports in MongoDB
- Fetching all reports for logged in user
- Fetching a single report by id

## Tech Stack

- Node.js
- Express
- MongoDB
- Mongoose
- JSON Web Token
- bcryptjs
- cookie-parser
- cors
- multer
- pdf-parse
- Google GenAI
- dotenv
- Docker

## Backend Folder Structure

```txt
server
├── src
│   ├── config
│   │   └── db.js
│   ├── controller
│   │   ├── authController.js
│   │   └── interviewController.js
│   ├── middleware
│   │   ├── authMiddleware.js
│   │   └── fileMiddleware.js
│   ├── models
│   │   ├── blacklist.js
│   │   ├── interviewReport.js
│   │   └── user.js
│   ├── routes
│   │   ├── authRoutes.js
│   │   └── interviewRoutes.js
│   └── service
│       └── aiService.js
├── app.js
├── server.js
├── package.json
├── package-lock.json
└── Dockerfile
```

## Backend Entry Files

### `server/server.js`

This file imports the Express app and starts the server.

Current style:

```js
const server = require("./app")

server.listen(3000, () => {
    console.log("Server is listening to port 3000");
})
```

Keep this file simple.

### `server/app.js`

This file:

- loads env variables
- creates Express app
- configures CORS
- enables JSON body parsing
- enables cookie parsing
- connects to MongoDB
- registers routes
- exports app

Current style:

```js
require("dotenv").config()
const express = require("express")
const cookieParser = require("cookie-parser")
const connectDB = require("./src/config/db")
const authRoutes = require("./src/routes/authRoutes")
const interviewRoutes = require("./src/routes/interviewRoutes")
const cors = require("cors")

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5000",
    credentials: true
}));

app.use(express.json())
app.use(cookieParser())

connectDB();

app.use("/api/auth",authRoutes)
app.use("/api/ai",interviewRoutes )

module.exports = app
```

When adding a new route group, register it here.

## Backend Coding Style

Use CommonJS everywhere.

Prefer:

```js
const something = require("something")
module.exports = something
```

Do not use:

```js
import something from "something"
export default something
```

Use normal async functions:

```js
async function registerUser(req,res) {
    // logic
}
```

Avoid complex architecture.

Do not add:

- classes
- decorators
- dependency injection
- factory wrappers
- unnecessary utility layers
- TypeScript
- ES modules
- new framework structure

## Formatting Style

The backend has a simple handwritten style.

Common patterns:

- function params often use `req,res`
- imports use `const`
- route handlers are passed directly
- semicolons are mixed
- spacing is informal
- object keys often use `message : "..."`
- response objects are plain
- code is practical and direct

Future code does not need to copy every spacing inconsistency, but it should feel like it belongs with the existing files.

## Route Style

Routes are thin.

They only connect HTTP method/path to controller functions and middleware.

Example:

```js
const express = require("express")
const {registerUser,loginUser, logoutUser, getMe} = require("../controller/authController")
const authMiddleware = require("../middleware/authMiddleware")

const router = express.Router();

router.post("/register",registerUser)
router.post("/login",loginUser)
router.post("/logout",logoutUser)
router.get("/get-me",authMiddleware, getMe)

module.exports = router;
```

Do not put database logic or business logic in route files.

## Controller Style

Controllers are plain async functions.

They:

- read from `req.body`, `req.params`, `req.file`, or `req.user`
- validate required data
- call models or services directly
- return JSON responses
- use early returns for bad input

Example:

```js
async function registerUser(req,res) {
    const {username,email,password} = req.body

    if(!username || !email || !password) {
        return res.status(400).json({
            message : "All fields are required"
        })
    }

    const user = await userModel.create({
        username,
        email,
        password : hash
    })

    return res.status(201).json({
        message : "User registered successfully",
        user : {
            id : user._id,
            username : user.username,
            email : user.email
        }
    })
}
```

Keep controller logic readable and direct.

## Error Handling Style

Use simple error handling.

For larger flows, use `try/catch`.

Example:

```js
async function getAllReports(req,res) {
    try {
        const reports = await reportModel.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({ reports });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching reports" });
    }
}
```

Avoid adding a global error handler unless the user asks for it.

Avoid returning very complicated error objects.

## Response Style

Responses are plain JSON objects.

Examples:

```js
return res.status(400).json({
    message : "All fields are required"
})
```

```js
return res.status(200).json({
    message : "User logged in successfully",
    user : {
        id : user._id,
        username : user.username,
        email : user.email
    }
})
```

```js
res.status(200).json({ reports });
```

Use clear messages.

Do not introduce a new response wrapper format unless asked.

## Current API Routes

### Auth Routes

Base path:

```txt
/api/auth
```

Routes:

```txt
POST /register
POST /login
POST /logout
GET  /get-me
```

Full paths:

```txt
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/get-me
```

### AI Interview Routes

Base path:

```txt
/api/ai
```

Routes:

```txt
POST /analyze
GET  /reports
GET  /report/:id
```

Full paths:

```txt
POST /api/ai/analyze
GET  /api/ai/reports
GET  /api/ai/report/:id
```

## Auth Flow

Authentication uses:

- JWT
- cookie named `token`
- blacklist collection
- auth middleware

### Register

`registerUser`:

1. reads `username`, `email`, `password`
2. checks all fields
3. checks if username or email already exists
4. hashes password with bcrypt
5. creates user
6. signs JWT
7. stores JWT in cookie
8. returns user data

### Login

`loginUser`:

1. reads `identifier` and `password`
2. finds user by username or email
3. compares password
4. signs JWT
5. stores JWT in cookie
6. returns user data

### Logout

`logoutUser`:

1. reads cookie token
2. adds token to blacklist collection
3. clears cookie
4. returns success message

### Get Me

`getMe`:

1. uses `req.user.id`
2. fetches user from database
3. returns user data

## JWT Style

Token is signed like this:

```js
const token = jwt.sign({id : user._id , username : user.username, time: new Date()},process.env.JWT_SECRET,{
    expiresIn : "1d",
    jwtid: require("crypto").randomUUID()
})
```

Cookie is set like this:

```js
res.cookie("token",token);
```

Follow the same pattern if adding auth related code.

## Auth Middleware Style

Auth middleware is in:

```txt
server/src/middleware/authMiddleware.js
```

It:

1. reads token from `req.cookies.token`
2. returns 401 if token is missing
3. checks token blacklist
4. verifies JWT
5. sets `req.user`
6. calls `next()`

Current style:

```js
async function authUser(req,res,next) {
    const token = req.cookies.token;

    if(!token) {
        return res.status(401).json({
            message: "token not provided"
        })
    }

    const istokenBlacklisted = await blacklistModel.findOne({token})

    if(istokenBlacklisted) {
        return res.status(401).json({
            message: "token is blacklisted"
        })
    }

    try {
        const decoded = jwt.verify(token,process.env.JWT_SECRET);

        req.user = decoded

        next();

    } catch(error) {
        return res.status(401).json({
            message: "invalid token or expired"
        })
    }
}
```

Use this middleware for protected routes.

## File Upload Style

File upload middleware is in:

```txt
server/src/middleware/fileMiddleware.js
```

It uses Multer memory storage and limits file size to 3MB.

Current style:

```js
const multer = require("multer")

const upload = multer({
    Storage: multer.memoryStorage(),
    limits: {
        fileSize: 3 * 1024 * 1024 // 3MB
    }
})

module.exports = upload
```

Use it in routes like:

```js
router.post("/analyze", authUser, upload.single("resume") ,interviewController.generteReport)
```

## Database Connection

Database connection is in:

```txt
server/src/config/db.js
```

Current style:

```js
const mongoose = require("mongoose");

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to database");
        
    } catch (error) {
        console.error("error connection database :" , error);
    }
}

module.exports = connectDB
```

Do not add extra database abstraction unless needed.

## Mongoose Model Style

Models are in:

```txt
server/src/models
```

Use direct Mongoose schemas.

Example:

```js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type:String,
        require: true,
        unique:true
    },

    email: {
        type:String,
        require: true,
        unique:true
    },

    password: {
        type:String,
        require: true
    }
})

const user = mongoose.model("user",userSchema);

module.exports = user
```

When adding new models:

- keep schema fields explicit
- use `required: true` for required data
- use `unique:true` when needed
- use nested schemas for repeated embedded objects
- use `{ _id: false }` for embedded schemas when needed
- use timestamps only when useful

## Current Models

### User Model

File:

```txt
server/src/models/user.js
```

Fields:

- `username`
- `email`
- `password`

### Blacklist Model

File:

```txt
server/src/models/blacklist.js
```

Fields:

- `token`

Used for logout token invalidation.

### Interview Report Model

File:

```txt
server/src/models/interviewReport.js
```

Main fields:

- `user`
- `jobDescription`
- `role`
- `resume`
- `selfDescription`
- `matchScore`
- `technicalQuestions`
- `behavioralQuestions`
- `skillGaps`
- `preparationPlan`

Uses timestamps.

Embedded schemas:

- `technicalQuestionSchema`
- `behavioralQuestionSchema`
- `skillGapSchema`
- `preparationPlanSchema`

## Interview Report Flow

The report generation route is:

```txt
POST /api/ai/analyze
```

Middleware:

```js
authUser
upload.single("resume")
```

Controller:

```js
interviewController.generteReport
```

Flow:

1. Read `selfDescriptionData` and `jobDescriptionData` from `req.body`
2. Read uploaded PDF from `req.file`
3. Return 400 if file is missing
4. Parse PDF buffer with `pdf-parse`
5. Clean extracted resume text
6. Call AI service
7. Save report in MongoDB
8. Return generated report

Current text cleanup:

```js
resumeDescriptionData = resumeDescriptionData.replace(/\s+/g, " ").trim();
```

## AI Service

AI service is in:

```txt
server/src/service/aiService.js
```

It uses:

```js
const { GoogleGenAI } = require("@google/genai");
```

The service:

- initializes Google GenAI with `process.env.GOOGLE_API_KEY`
- defines `geminiResponseSchema`
- creates a prompt
- calls `ai.models.generateContent`
- parses `response.text`
- returns parsed JSON

Current service function:

```js
async function generateResumeReport({resumeDescriptionData , selfDescriptionData , jobDescriptionData}) {
    // prompt
    // ai call
    // JSON.parse
    // return parsed
}
```

Keep AI calls inside service files.

Controllers should call the service and save/use the returned data.

## Gemini Response Data

The AI report contains:

- `role`
- `matchScore`
- `technicalQuestions`
- `behavioralQuestions`
- `skillGaps`
- `preparationPlan`

Question object:

```txt
question
intention
expectedAnswer
```

Skill gap object:

```txt
skill
severity
```

Preparation plan object:

```txt
day
focusArea
tasks
```

## Environment Variables

Backend expects:

```txt
MONGO_URI=
JWT_SECRET=
GOOGLE_API_KEY=
FRONTEND_URL=
```

`FRONTEND_URL` is used in CORS.

Fallback frontend origin:

```txt
http://localhost:5000
```

## Dockerfile

Backend Dockerfile:

```Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

Keep Docker setup simple unless the user asks for optimization.

## Package Dependencies

Current backend dependencies include:

```json
{
  "@google/genai": "^1.50.1",
  "bcryptjs": "^3.0.3",
  "cookie-parser": "^1.4.7",
  "cors": "^2.8.6",
  "crypto": "^1.0.1",
  "dotenv": "^17.4.2",
  "express": "^5.2.1",
  "jsonwebtoken": "^9.0.3",
  "mongoose": "^9.4.1",
  "multer": "^2.1.1",
  "nodemon": "^3.1.14",
  "pdf-parse": "^1.1.1"
}
```

Do not add new dependencies unless there is a clear need.

## How To Add New Backend Feature

When adding a backend feature, usually follow this order:

1. Add model or update existing model in `server/src/models`
2. Add controller function in `server/src/controller`
3. Add route in `server/src/routes`
4. Add middleware only if needed
5. Register new route group in `server/app.js` only if needed
6. Test the API route

Keep the change small and readable.

## Example New Route Pattern

Route file:

```js
router.get("/something", authUser, controller.getSomething)
```

Controller:

```js
async function getSomething(req,res) {
    try {
        const data = await someModel.find({ user: req.user.id })

        res.status(200).json({
            message : "Data fetched successfully",
            data
        })

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message : "Error fetching data"
        })
    }
}
```

Export:

```js
module.exports = {
    getSomething
}
```

## Things Future AI Should Not Do

Do not:

- rewrite the whole backend
- change CommonJS to ES modules
- add TypeScript
- introduce a new architecture
- add global validation library without asking
- replace Mongoose with another ORM
- change auth from cookies to localStorage
- change JWT payload format unless asked
- change response format everywhere
- add unnecessary comments
- make routes thick
- put AI prompt logic in route files
- copy frontend analyze/reports style for backend decisions

## Things Future AI Should Do

Do:

- read backend files before editing
- keep route files thin
- keep controller functions simple
- keep model files direct
- keep services focused
- use `authUser` middleware for protected routes
- use `req.user.id` for user owned data
- return clear JSON messages
- use current naming style
- make minimal changes
- preserve existing behavior unless asked

## Short Backend Prompt For Future AI

Use this prompt later:

```txt
Read BACKEND_CONTEXT_README.md first.

This backend was manually written. Follow the existing style closely: CommonJS, Express, Mongoose, simple async controllers, thin routes, cookie JWT auth, direct JSON responses, and minimal abstraction.

Do not convert to TypeScript or ES modules. Do not rewrite architecture. Keep changes small and consistent with the current backend.
```

