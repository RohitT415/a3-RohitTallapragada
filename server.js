// Budget limits for categories
const budgetLimits = {
    "Food": 300,
    "Transportation": 200,
    "Entertainment": 150,
    "Utilities": 250,
    "Shopping": 200,
    "Other": 100
}

const express = require('express')
const path = require('path')
const session = require('express-session')
const { MongoClient } = require('mongodb')
require('dotenv').config()

const app = express()
const port = process.env.PORT || 8080

let db, usersCollection, expensesCollection

// Connect to MongoDB
const connectDB = async () => {
    try {
        console.log('Attempting to connect to MongoDB...')
        console.log('URI:', process.env.MONGODB_URI ? 'URI found' : 'URI missing')


        const client = new MongoClient(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 30000,
            connectTimeoutMS: 30000,
        })


        await client.connect()
        db = client.db('finance-tracker')
        usersCollection = db.collection('users')
        expensesCollection = db.collection('expenses')
        console.log('Connected to MongoDB successfully')

        // Test the connection
        await db.admin().ping()
        console.log('MongoDB ping successful')
    } catch (error) {
        console.error('MongoDB connection error:', error)
        console.log('Continuing without database - using temporary in-memory storage for development')

        // Fallback to in-memory storage for development
        global.tempUsers = {}
        global.tempExpenses = {}

        // Mock collections
        usersCollection = {
            findOne: async (query) => global.tempUsers[query.username] || null,
            insertOne: async (doc) => { global.tempUsers[doc.username] = doc; return { insertedId: doc.username } }
        }

        expensesCollection = {
            find: (query) => ({
                toArray: async () => global.tempExpenses[query.username] || []
            }),
            insertOne: async (doc) => {
                if (!global.tempExpenses[doc.username]) global.tempExpenses[doc.username] = []
                global.tempExpenses[doc.username].push(doc)
                return { insertedId: Date.now() }
            },
            deleteOne: async (query) => {
                return { deletedCount: 1 }
            }
        }

        console.log('Using in-memory storage - data will not persist between server restarts')
    }
}

connectDB()


app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: true
}))

// Function to calculate derived field (budget status)
const calculateBudgetStatus = async function (category, amount, username) {
    const limit = budgetLimits[category] || 100

    const userExpenses = await expensesCollection.find({ username }).toArray()
    const currentSpent = userExpenses
        .filter(expense => expense.category === category)
        .reduce((total, expense) => total + expense.amount, 0)

    const totalAfterNewExpense = currentSpent + amount

    if (totalAfterNewExpense > limit) {
        return "over budget"
    } else if (totalAfterNewExpense > limit * 0.8) {
        return "near limit"
    } else {
        return "within budget"
    }
}

// Middleware to check database connection
const checkDatabase = (req, res, next) => {
    if (!usersCollection || !expensesCollection) {
        return res.status(500).json({ error: 'Database not ready yet, please try again in a moment' })
    }
    next()
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.get('/results', checkDatabase, async (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
        const userExpenses = await expensesCollection.find({ username: req.session.username }).toArray()
        res.json(userExpenses)
    } catch (error) {
        console.error('Error fetching expenses:', error)
        res.status(500).json({ error: 'Server error' })
    }
})

app.post('/login', checkDatabase, async (req, res) => {
    const { username, password } = req.body

    try {
        const existingUser = await usersCollection.findOne({ username })

        if (!existingUser) {
            // Create new user account
            await usersCollection.insertOne({
                username,
                password,
                createdAt: new Date()
            })
            req.session.username = username
            res.json({ success: true, message: 'New account created and logged in!' })
        } else {
            if (existingUser.password === password) {
                req.session.username = username
                res.json({ success: true, message: 'Logged in successfully!' })
            } else {
                res.status(401).json({ success: false, message: 'Incorrect password' })
            }
        }
    } catch (error) {
        console.error('Login error:', error)
        res.status(500).json({ error: 'Server error' })
    }
})

app.post('/logout', (req, res) => {
    req.session.destroy()
    res.json({ success: true })
})

app.post('/submit', checkDatabase, async (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
        if (req.body.action === "add") {
            const budgetStatus = await calculateBudgetStatus(
                req.body.category,
                parseFloat(req.body.amount),
                req.session.username
            )

            const newExpense = {
                username: req.session.username,
                description: req.body.description,
                amount: parseFloat(req.body.amount),
                category: req.body.category,
                date: req.body.date,
                priority: req.body.priority || 'low',
                recurring: req.body.recurring || false,
                budgetStatus: budgetStatus,
                createdAt: new Date()
            }

            await expensesCollection.insertOne(newExpense)
        }

        const userExpenses = await expensesCollection.find({ username: req.session.username }).toArray()
        res.json(userExpenses)
    } catch (error) {
        console.error('Error adding expense:', error)
        res.status(500).json({ error: 'Server error' })
    }
})

app.delete('/submit', checkDatabase, async (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
        const userExpenses = await expensesCollection.find({ username: req.session.username }).toArray()
        const index = parseInt(req.body.index)

        if (index >= 0 && index < userExpenses.length) {
            const expenseToDelete = userExpenses[index]
            await expensesCollection.deleteOne({ _id: expenseToDelete._id })
        }

        const updatedExpenses = await expensesCollection.find({ username: req.session.username }).toArray()
        res.json(updatedExpenses)
    } catch (error) {
        console.error('Error deleting expense:', error)
        res.status(500).json({ error: 'Server error' })
    }
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})