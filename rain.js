const { plot } = require('nodeplotlib')
const axios = require('axios')

const OBSERVATIONS_URL = 'http://www.bom.gov.au/fwo/IDN60801/IDN60801.94589.json' // YAMBA
// const OBSERVATIONS_URL = 'http://www.bom.gov.au/fwo/IDN60801/IDN60801.94572.json' // LISMORE


// const BOM_FTP = 'ftp://ftp.bom.gov.au/anon/gen/fwo'

const run = async function() {
    const response = await axios.get(OBSERVATIONS_URL)
    const { header, data } = response.data.observations

    const reversed = data.reverse()

    const x = reversed.map(e => {
        const year = e.local_date_time_full.slice(0, 4)
        const month = e.local_date_time_full.slice(4, 6)
        const day = e.local_date_time_full.slice(6, 8)
        const hour = e.local_date_time_full.slice(8, 10)
        const minute = e.local_date_time_full.slice(10, 12)
        return new Date(year, month, day, hour, minute)

    })
    const y = reversed.map(e => Number(e.rain_trace))


    const layout = {
        title: `${header[0].name} rainfall since 9am`,
        xaxis: {
            title: 'Time (UTC)'
        },
        yaxis: {
            title: 'rain_trace'
        }
    }
    plot([{ x, y, type: 'scatter' }], layout)
}

run()