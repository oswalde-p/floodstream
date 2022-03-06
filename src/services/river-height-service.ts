import axios from 'axios'
import * as httpErrors from 'http-errors'
import { Tabletojson as tabletojson } from 'tabletojson'
import { DateTime } from 'luxon'
import  { COLLECTIONS } from '../constants/collections'
import  { db } from '../mongo-connection'
import * as rivers from '../../static/rivers.json'
import { read } from 'fs'

const RECENTNESS_THRESH = 4 * 60 * 60 * 1000
// const TIDE_PERIOD_MS = 2 * (12 * 60 * 60 * 1000 + 25 * 60 * 1000) // 2 x 12h 25m

class ObservationSite {
  label: string
  bomSiteId: string
  sortIndex: number
}

class River {
  observation_sites: ObservationSite[]
}

class RiverHeightReading {
  bomSiteId: string
  createdOn: Date
  heights: {
    timestamp: Date,
    level: number
  }[]
}

class RiverHeightReadingCombined {
  bomSiteId: string
  createdOn: Date
  first: Date
  last: Date
  heights: {
    timestamp: Date,
    level: number
  }[]
}

class RiverHeightValue {
  bomSiteId: string
  timestamp: Date
  level: number
}

const processMeasurement = function(measurement: any) {
  if (!measurement) {
    return {
      time: null,
      level: null,
    }
  }
  return {
    timestamp: DateTime.fromFormat(measurement['Station Date/Time'], 'dd/MM/yyyy HH:mm', { zone: 'Australia/Sydney' }),
    level: Number(measurement['Water Level(m)']),
  }
}

class RiverHeightService {
  static async getReports(riverName: string, limit: number) {
    const river: River = rivers[riverName]
    if (!river) {
      throw new httpErrors.NotFound('River not found')
    }
    const reports = await db.collection(COLLECTIONS.REPORTS).find({ riverName }, { sort: { 'createdOn': -1 }, limit }).toArray()
    return reports
  }

  static async getReportForTimestamp(riverName: string, targetTime: Date) {
    const river: River = rivers[riverName]
    if (!river) {
      throw new httpErrors.NotFound('River not found')
    }
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000
    const reportData = []
    for (const site of river.observation_sites) {
      const readings: RiverHeightValue[] = await db.collection(COLLECTIONS.RIVER_HEIGHT_VALUES).find(
        {
          bomSiteId: site.bomSiteId,
          timestamp: {
            $lte: targetTime,
            $gte: new Date(targetTime.getTime() - TWO_HOURS_MS),
          },
        }, {
          sort: { createdOn: -1 },
          limit: 1,
        }).toArray()
      if (!readings || !readings.length) {
        reportData.push({
          ...site,
          height: null,
        })
      } else {
        reportData.push({
          ...site,
          height: readings[0].level,
        })
      }
    }
    return {
      riverName,
      time: targetTime.toISOString(),
      reportData,
    }
  }

  static async generateReport(riverName: string) {
    const river: River = rivers[riverName]
    if (!river) {
      throw new httpErrors.NotFound('River not found')
    }
    const reportData = []
    const promises = river.observation_sites.map(async site => {
      const readings: RiverHeightReading[] = await db.collection(COLLECTIONS.RIVER_HEIGHT_READINGS)
        .find({ bomSiteId: site.bomSiteId },
          {
            sort: { 'createdOn': -1 },
            limit: 1,
          }).toArray()
      if (!readings || !readings.length) {
        console.log('No readings found for ' + site.bomSiteId) // eslint-disable-line no-console
        reportData.push({
          bomSiteId: site.bomSiteId,
          label: site.label,
          sortIndex: site.sortIndex,
          height: null,
        })
        return
      }
      const { heights } = readings[0]
      const latest = heights.pop()
      console.log({ latest }) // eslint-disable-line no-console
      if (new Date(latest.timestamp).getTime() < Date.now() - RECENTNESS_THRESH) {
        console.log('No recent data for ' + site.bomSiteId) // eslint-disable-line no-console
        reportData.push({
          bomSiteId: site.bomSiteId,
          label: site.label,
          sortIndex: site.sortIndex,
          height: null,
        })
        return
      }
      reportData.push({
        bomSiteId: site.bomSiteId,
        label: site.label,
        sortIndex: site.sortIndex,
        height: latest.level,
      })

    })
    await Promise.all(promises)
    const report = {
      riverName,
      createdOn: new Date(Date.now()),
      reportData: reportData.sort((a, b) => a.sortIndex - b.sortIndex),
    }
    await db.collection(COLLECTIONS.REPORTS).insertOne(report)
  }

  static async scrapeLatestRiverHeight(riverName: string) {
    const river: River = rivers[riverName]
    if (!river) {
      throw new httpErrors.NotFound('River not found')
    }
    const promises = river.observation_sites.map(async site => {
      await RiverHeightService.scrapeBomSiteHeight(site)
    })
    await Promise.all(promises)
    console.log('Report generated successfully') // eslint-disable-line no-console
  }

  static async scrapeBomSiteHeight(site?: ObservationSite, bomSiteId?: string) {
    if (!site) {
      site = rivers.clarence.observation_sites.find(os => os.bomSiteId === bomSiteId)
      if (!site) throw new httpErrors.NotFound('Unknown site id')
    }
    console.log('fetching ' + site.bomSiteId + ' from BOM...') // eslint-disable-line no-console

    const url = `http://www.bom.gov.au/fwo/IDN60231/IDN60231.${site.bomSiteId}.tbl.shtml`
    const headers = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:97.0) Gecko/20100101 Firefox/97.0' }
    const response = await axios.get(url, { headers })
    const converted = tabletojson.convert(response.data)
    const measurements = converted[0]
    const heights = measurements.map(m => ({
      ...processMeasurement(m),
    }))
    console.log('saving results to db...') // eslint-disable-line no-console
    db.collection(COLLECTIONS.RIVER_HEIGHT_READINGS).insertOne({
      bomSiteId: site.bomSiteId,
      heights,
      createdOn: new Date(Date.now()),
    })
  }

  static async combineReadings(bomSiteId: string) {
    // const existing: RiverHeightReadingCombined = await db.collection(COLLECTIONS.RIVER_HEIGHT_READINGS_COMBINED).findOne({ bomSiteId })
    const readings: RiverHeightReading[] = await db.collection(COLLECTIONS.RIVER_HEIGHT_READINGS)
      .find({ bomSiteId },
        {
          sort: { 'createdOn': 1 },
        }).toArray()
    if (!readings || !readings.length) {
      console.log('No readings found for ' + bomSiteId) // eslint-disable-line no-console
      return
    }
    const oldest = {
      first: readings[0].heights[0],
      last: readings[0].heights[readings[0].heights.length - 1],
    }
    const newest = {
      first: readings[readings.length - 1].heights[0],
      last: readings[readings.length - 1].heights[readings[readings.length - 1].heights.length - 1],
    }
    console.log({ newest, oldest }) // eslint-disable-line no-console
    for (const reading of readings) {
      console.log(`Processing data from ${reading.createdOn}`) // eslint-disable-line no-console
      const levels = reading.heights.map(height => ({
        bomSiteId,
        ...height,
      }))
      const lastExists = await db.collection(COLLECTIONS.RIVER_HEIGHT_VALUES).findOne({ bomSiteId, timestamp: levels[levels.length - 1].timestamp })
      if (lastExists) {
        console.log('Skipping') // eslint-disable-line no-console
        continue
      }
      const insertPromises = levels.map(l => uniqueInsert(db, l))
      console.log(insertPromises.length) // eslint-disable-line no-console
      await Promise.all(insertPromises)
      console.log('Done') // eslint-disable-line no-console
    }
  }

  static async combineReadingsAllSites(riverName: string) {
    const sites = rivers[riverName].observation_sites.map(s => s.bomSiteId)
    for (const site of sites) {
      console.log('Processing site ' + site) // eslint-disable-line no-console
      await RiverHeightService.combineReadings(site)
    }
  }
}

const uniqueInsert = async function(db, doc: RiverHeightValue) {
  const { bomSiteId, timestamp } = doc
  const exists = await db.collection(COLLECTIONS.RIVER_HEIGHT_VALUES).findOne({ bomSiteId, timestamp })
  if (exists) return
  await db.collection(COLLECTIONS.RIVER_HEIGHT_VALUES).insertOne(doc)
}

export {
  RiverHeightService,
}
