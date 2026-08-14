const express = require('express')
const path = require('path')
const cors = require('cors')
const morgan = require('morgan')
const routes = require('./routes')
const notFound = require('./middlewares/notFound')
const errorHandler = require('./middlewares/errorHandler')

const app = express()

app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

app.use('/api', routes)

app.use(notFound)
app.use(errorHandler)

module.exports = app
