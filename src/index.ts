const express = require('express')
const { router } = require('./router')

const app = express()

app.use(router)
app.use(express.static('public'))

const port = process.env.PORT || 227

app.listen(port, () => console.log(`Server listening on port ${port}`))
