const fs = require('fs')
const path = require('path')
const axios = require('axios')
const httpErrors = require('http-errors')
const rivers = require('../../static/rivers.json')
const {Tabletojson: tabletojson} = require('tabletojson')

const CACHE_DURATION_MS = 60 * 60 * 1000
const TIDE_PERIOD_MS = 2 * (12 * 60 * 60 * 1000 + 25 * 60 * 1000) // 2 x 12h 25m

class ObservationSite {
    label: string
    bomSiteId: string
}

class River {
    observation_sites: ObservationSite[]
}

const formatDateString = function(date: Date) {
    const dateFormatOptions: any = {
        timeZone: 'Australia/Sydney',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    }
    const timeFormatOptions: any = {
        hour: 'numeric',
        minute: 'numeric',
        timeZone: 'Australia/Sydney',
        hour12: false
    }
    const datePart = new Intl.DateTimeFormat('en-AU', dateFormatOptions).format(date)
    const timePart = new Intl.DateTimeFormat('en-AU', timeFormatOptions).format(date)
    return `${datePart} ${timePart}`
}

const parseDateString = function(dateStr: string) {
    const [ day, month, year ] = dateStr.substring(0, 11).split('/')
    console.log({day, month, year})
    return new Date(Number(year), Number(month) - 1, Number(day))
}

{class RiverHeightService {
    static async fetchLatestRiverHeight(riverName: string, time: Date = new Date(Date.now())) {
        const river: River = rivers[riverName]
        if (!river) {
            throw new httpErrors.NotFound('River not found')
        }
        time.setMinutes(0)
        time.setSeconds(0)
        const nowTime = formatDateString(time)
        const previousTime = formatDateString(new Date(time.getTime() - TIDE_PERIOD_MS))
        const data = []
        const promises = river.observation_sites.map(async site => {
            const { measurements } = await RiverHeightService.scrapeBomSiteHeight(site)
            const now = measurements.pop()
            const previous = measurements.find(m => m['Station Date/Time'] === previousTime)
            data.push({ 
                label: site.label, 
                now: {
                    time: parseDateString(now['Station Date/Time']),
                    level: Number(now['Water Level(m)'])
                },
                previous: {
                    time: parseDateString(previous['Station Date/Time']),
                    level: Number(previous['Water Level(m)'])
                }
            })
         })
        await Promise.all(promises)
        const sorted = data.sort((a,b) => a.index - b.index)
        return {
            now: sorted.map(location => ({
                label: location.label,
                time: location.now.time,
                level: location.now.level,
                delta: Math.round((location.now.level - location.previous.level) * 100) / 100
            })),
            previous: sorted.map(location => ({
                label: location.label,
                time: location.previous.time,
                level: location.previous.level,
            }))
        }
    }

    static async scrapeBomSiteHeight(site?: ObservationSite, bomSiteId?: string) {
        if (!site) {
            site = rivers.clarence.oversvation_sites.find(os => os.bomSiteId === bomSiteId)
            if (!site) throw new httpErrors.NotFound('Unknown site id')
        }
        const fileName = path.resolve(__dirname, `../../data/${site.bomSiteId}.json`)
        try {
            const existingData = require(fileName)
            const cacheExpiry = new Date(Date.now() - CACHE_DURATION_MS)
            if (existingData && new Date(existingData.updatedOn) > cacheExpiry) {
                console.log('Cache HIT: ', fileName)
                return existingData
            } else {
                console.log('Cache MISS: ', fileName)
            }
        } catch(err) {
            console.log('Cache MISS: ', fileName)
        }

        const url = `http://www.bom.gov.au/fwo/IDN60231/IDN60231.${site.bomSiteId}.tbl.shtml`
        const headers = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:97.0) Gecko/20100101 Firefox/97.0'}
        const response = await axios.get(url, { headers })
        const converted = tabletojson.convert(response.data)
        const measurements = converted[0]
        const withMeta = {
            ...site,
            updatedOn: new Date(Date.now()),
            measurements,
        }
        fs.writeFileSync(fileName, JSON.stringify(withMeta, null, 2))
        return withMeta
    }
}

module.exports = {
    RiverHeightService,
}}
