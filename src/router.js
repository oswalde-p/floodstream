import * as express from 'express'
import { RainService, RiverHeightService } from './services'

const router = express.Router()

router.get('/observations', async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*')
    const data = await RainService.fetchObservations()
    res.json(data)
})

router.post('/fetch-and-generate', async (req, res) => {
    try {
        res.status(200).send('Generating report, see logs for details')
        await RiverHeightService.scrapeLatestRiverHeight('clarence')
        await RiverHeightService.generateReport('clarence')
    } catch(err) {
        if (!res.headersSent) {
            res.status(500).json({ error: err.message })
        }
        throw err
    }
})


router.get('/river-heights/:riverName', async (req, res) => {
    const { riverName } = req.params
    const { limit } = req.query
    try {
        const data = await RiverHeightService.getReports(riverName, Number(limit))
        res.json(data)
    } catch (err) {
        console.error(err.message)
        res.status(500).json(err)
        throw err
    }
})

export { router }
