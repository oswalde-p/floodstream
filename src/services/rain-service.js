import * as axios from 'axios'

const OBSERVATIONS_URL = 'http://www.bom.gov.au/fwo/IDN60801/IDN60801.94589.json' // YAMBA

class RainService {
    static async fetchObservations() {
        const response = await axios.get(OBSERVATIONS_URL)
        const { header, data } = response.data.observations

        const reversed = data.reverse()

        const x = reversed.map(e => {
            const year = e.local_date_time_full.slice(0, 4)
            const month = Number(e.local_date_time_full.slice(4, 6)) - 1
            const day = e.local_date_time_full.slice(6, 8)
            const hour = e.local_date_time_full.slice(8, 10)
            const minute = e.local_date_time_full.slice(10, 12)
            return new Date(year, month, day, hour, minute)

        })
        const y = reversed.map(e => Number(e.rain_trace))
        return {
            x,
            y,
            location: header[0].name,
        }
    }
}

export {
    RainService,
}
