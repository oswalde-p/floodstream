import * as express from 'express'
import { RainService, RiverHeightService } from './services'
import { getLatestFetchTime, generateTimeSeries  } from './utils'

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


router.get('/river-heights/:riverName/recent', async (req, res) => {
  const { riverName } = req.params
  const { limit } = req.query
  try {
    // const data = await RiverHeightService.getReports(riverName, Number(limit))
    const lastReportTime = getLatestFetchTime()
    const times = generateTimeSeries(lastReportTime, limit)
    console.log(lastReportTime.toLocaleString())
    console.log(times)
    const promises = times.map(t => RiverHeightService.getReportForTimestamp(riverName, t))
    const data = await Promise.all(promises)
    res.json(data)
  } catch (err) {
    console.error(err.message) // eslint-disable-line no-console
    res.status(500).json(err)
    throw err
  }
})

router.get('/river-heights/:riverName', async (req, res) => {
  const { riverName } = req.params
  const { time } = req.query
  try {
    // const data = await RiverHeightService.getReports(riverName, Number(limit))
    const lastReportTime = getLatestFetchTime()
    const timeObj = new Date(time)
    if (timeObj > lastReportTime) {
      res.status(422).send(`Last report time is ${lastReportTime}`)
      return
    }
    if (isNaN(timeObj.getTime())) {
      res.status(400).send('Invalid timestamp')
      return
    }
    const data = await RiverHeightService.getReportForTimestamp(riverName, timeObj)
    res.json(data)
  } catch (err) {
    console.error(err.message) // eslint-disable-line no-console
    res.status(500).json(err)
    throw err
  }
})

router.post('/combine-readings/:bomSiteId', async (req, res) => {
  const { bomSiteId } = req.params
  try {
    await RiverHeightService.combineReadings(bomSiteId)
    res.status(200).send()
  } catch (err) {
    console.error(err.message) // eslint-disable-line no-console
    res.status(500).json(err)
    throw err
  }
})

router.post('/combine-readings/river/:riverName', async (req, res) => {
  const { riverName } = req.params
  try {
    await RiverHeightService.combineReadingsAllSites(riverName)
    res.status(200).send()
  } catch (err) {
    console.error(err.message) // eslint-disable-line no-console
    res.status(500).json(err)
    throw err
  }
})

export { router }
