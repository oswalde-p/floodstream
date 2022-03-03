const ftp = require('basic-ftp')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const { exec } = require('child_process')
const {Tabletojson: tabletojson} = require('tabletojson')

class RiverHeightService {
    static async scrapeBomTable(location: string) {
        // TODO check how old current data is before fetching
        const url = `http://www.bom.gov.au/fwo/IDN60231/IDN60231.${location}.tbl.shtml`
        const headers = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:97.0) Gecko/20100101 Firefox/97.0'}
        const response = await axios.get(url, { headers })
        const converted = tabletojson.convert(response.data)
        fs.writeFileSync(path.resolve(__dirname, `../../data/${location}.json`), JSON.stringify(converted, null, 2))
        return converted
    }

}

module.exports = {
    RiverHeightService,
}
