const express = require('express')
const { RainService, RiverHeightService } = require('./services')

const router = express.Router()

router.get('/observations', async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*')
    const data = await RainService.fetchObservations()
    res.json(data)
})

router.get('/river-heights/:location', async (req, res) => {
    const { location } = req.params
    try {
        const data = await RiverHeightService.scrapeBomTable(location)
        res.json(data)
    } catch (err) {
        res.status(500).json(err)
    }
})

module.exports = { router }
