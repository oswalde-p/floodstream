const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const ip = require('ip')
const { router } = require('./router')
const { httpErrorMiddleware, catchallErrorMiddleware } = require('./middleware/errors')

const app = express()
app.use(morgan('[:date[iso]] :req[X-Forwarded-For] :method :url :status :res[content-length] - :response-time ms'))
app.use(cors())

app.use(router)
app.use(express.static('public'))

const port = process.env.PORT || 227

app.listen(port, () => console.log(`Server listening on http://${ip.address()}:${port}`))

app.use(httpErrorMiddleware)
app.use(catchallErrorMiddleware)
