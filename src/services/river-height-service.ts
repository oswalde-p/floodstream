import axios from 'axios'
import * as httpErrors from 'http-errors'
import {Tabletojson as tabletojson} from 'tabletojson'
import { DateTime } from 'luxon'
import  { COLLECTIONS } from '../constants/collections'
import  { db } from '../mongo-connection'
import * as rivers from '../../static/rivers.json'

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

const processMeasurement = function(measurement: any) {
    if (!measurement) {
        return {
            time: null,
            level: null
        }
    }
    return {
        timestamp: DateTime.fromFormat(measurement['Station Date/Time'], 'dd/MM/yyyy HH:mm', { zone: 'Australia/Sydney' }),
        level: Number(measurement['Water Level(m)'])
    }
}

class RiverHeightService {
    static async getReports(riverName: string, limit: number) {
        const river: River = rivers[riverName]
        if (!river) {
            throw new httpErrors.NotFound('River not found')
        }
        const reports = await db.collection(COLLECTIONS.REPORTS).find({ riverName }, { sort: {'createdOn': -1 }, limit }).toArray()
        return reports
    }

    static async generateReport(riverName: string) {
        const river: River = rivers[riverName]
        if (!river) {
            throw new httpErrors.NotFound('River not found')
        }
        const reportData = []
        const promises = river.observation_sites.map(async site => {
            const readings = await db.collection(COLLECTIONS.RIVER_HEIGHT_READINGS)
                .find({ bomSiteId: site.bomSiteId },
                { 
                    sort: {'createdOn': -1 }, 
                    limit: 1
                }).toArray()
            if (!readings || !readings.length) {
                console.log('No readings found for ' + site.bomSiteId)
                return
            }
            const { heights } = readings[0]
            const latest = heights.pop()
            console.log({latest})
            if (new Date(latest.timestamp).getTime() < Date.now() - RECENTNESS_THRESH) {
                console.log('No recent data for ' + site.bomSiteId)
                return
            }
            reportData.push({
                bomSiteId: site.bomSiteId,
                label: site.label,
                sortIndex: site.sortIndex,
                height: latest.level
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
    }

    static async scrapeBomSiteHeight(site?: ObservationSite, bomSiteId?: string) {
        if (!site) {
            site = rivers.clarence.observation_sites.find(os => os.bomSiteId === bomSiteId)
            if (!site) throw new httpErrors.NotFound('Unknown site id')
        }
        console.log('fetching ' + site.bomSiteId + ' from BOM...')

        const url = `http://www.bom.gov.au/fwo/IDN60231/IDN60231.${site.bomSiteId}.tbl.shtml`
        const headers = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:97.0) Gecko/20100101 Firefox/97.0'}
        const response = await axios.get(url, { headers })
        const converted = tabletojson.convert(response.data)
        const measurements = converted[0]
        const heights = measurements.map(m => ({
            ...processMeasurement(m)
        }))
        console.log('saving results to db...')
        db.collection(COLLECTIONS.RIVER_HEIGHT_READINGS).insertOne({ 
            bomSiteId: site.bomSiteId,
            heights,
            createdOn: new Date(Date.now())
        })
    }
}

export {
    RiverHeightService,
}
