// @flow
import {Collector, ElkCollector, newEvent} from './collector'
import {AggregatingCollector} from './aggregating-collector'

export type UserTime = {
  localTime: number,
  utcTime: number
}

export type UserTimeProvider = () => UserTime

export type ConnectDetails = {
  consumer_id: string,
  provider_id: string
}

export class ConnectEventTracker {
  _collector: Collector
  _userTimeProvider: UserTimeProvider
  _connectStarted: boolean
  _context: any
  constructor (collector: Collector, userTimeProvider: UserTimeProvider) {
    this._collector = collector
    this._userTimeProvider = userTimeProvider
    this._connectStarted = false
    this._context = {}
  }

  ConnectStarted (connectDetails: ConnectDetails): void {
    this._context = {
      started_at: this._userTimeProvider(),
      connection_details: connectDetails
    }
    this._connectStarted = true
  }

  async ConnectEnded (error?: any): Promise<any> {
    this._checkConnectStarted()
    this._insertEndTimesIntoContext()
    if (error) {
      this._context['error'] = error
      return this._collector.sendEvents(newEvent('connect_failed', this._context))
    }
    return this._collector.sendEvents(newEvent('connect_successful', this._context))
  }

  async ConnectCanceled (): Promise<any> {
    this._checkConnectStarted()
    this._insertEndTimesIntoContext()
    this._collector.sendEvents(newEvent('connect_canceled', this._context))
  }

  _checkConnectStarted (): void {
    if (!this._connectStarted) {
      throw new Error('connect start not marked')
    }
  }

  _insertEndTimesIntoContext (): void {
    let endtime = this._userTimeProvider()
    let delta = endtime.utcTime - this._context['started_at'].utcTime
    this._context['time_delta'] = delta
    this._context['ended_at'] = endtime
  }
}

function currentUserTime () {
  let currentDate = new Date()
  let utcTimestamp = currentDate.getTime()
  let localOffsetInMillis = currentDate.getTimezoneOffset() * 60 * 1000
  return {
    utcTime: utcTimestamp,
    localTime: utcTimestamp + localOffsetInMillis
  }
}

const elkCollector = new ElkCollector('http://metrics.mysterium.network:8091')
const aggregator = new AggregatingCollector(elkCollector, 10)
const connectEventTrackerFactory = () => new ConnectEventTracker(aggregator, currentUserTime)
export default connectEventTrackerFactory
