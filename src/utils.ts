import { DateTime } from 'luxon'
const FETCH_HOURS_UTC = [10, 22]
const TIME_BETWEEN_PLOTS = 6 * 60 * 60 * 1000

const getLatestFetchTime = function(): Date {
  const firstToday = DateTime.now().startOf('day').set({ hour: FETCH_HOURS_UTC[0] }).toJSDate()
  const secondToday = DateTime.now().startOf('day').set({ hour: FETCH_HOURS_UTC[1] }).toJSDate()
  const secondYesterday= DateTime.now().startOf('day').set({ hour: FETCH_HOURS_UTC[1] }).minus({ day: 1 }).toJSDate()
  for (const time of [secondToday, firstToday, secondYesterday]) {
    if (time.getTime() < Date.now()) {
      return time
    }
  }
}

const generateTimeSeries = function(final: Date, count: number): Date[] {
  const timeSeries = [final]
  let current = new Date(final)
  while (timeSeries.length < count) {
    current = new Date(current.getTime() - TIME_BETWEEN_PLOTS)
    timeSeries.push(current)
  }
  return timeSeries
}

export {
  getLatestFetchTime,
  generateTimeSeries,
}
