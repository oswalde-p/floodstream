const express = require('express')
const morgan = require('morgan')
const { router } = require('./router')

const app = express()
app.use(morgan('[:date[iso]] :req[X-Forwarded-For] :method :url :status :res[content-length] - :response-time ms'))

app.use(router)
app.use(express.static('public'))

const port = process.env.PORT || 227

app.listen(port, () => console.log(`Server listening on port ${port}`))
