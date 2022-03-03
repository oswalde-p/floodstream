const express = require('express')
const { RainService, RiverHeightService } = require('./services')

const router = express.Router()

router.get('/observations', async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*')
    const data = await RainService.fetchObservations()
    res.json(data)
})

router.get('/location-heights/:bomSiteId', async (req, res) => {
    const { bomSiteId } = req.params
    try {
        const data = await RiverHeightService.scrapeBomSiteHeight(null, bomSiteId)
        res.json(data)
    } catch (err) {
        res.status(500).json(err)
    }
})

router.get('/river-heights/:riverName', async (req, res) => {
    const { riverName } = req.params
    try {
        const data = await RiverHeightService.fetchLatestRiverHeight(riverName)
        res.json(data)
    } catch (err) {
        res.status(500).json(err)
    }
})

module.exports = { router }
