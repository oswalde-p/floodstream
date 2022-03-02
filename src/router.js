const express = require('express')
const { RainService } = require('./services')

const router = express.Router()

router.get('/observations', async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*')
    const data = await RainService.fetchObservations()
    res.json(data)
})

module.exports = { router }