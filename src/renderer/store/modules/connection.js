/*
 * Copyright (C) 2017 The "mysteriumnetwork/mysterium-vpn" Authors.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// @flow
import type from '../types'

import { FunctionLooper } from '../../../libraries/function-looper'
import config from '@/config'
import type { TequilapiClient, ConsumerLocation, ConnectionStatistics } from 'mysterium-vpn-js'
import { ConnectionStatus } from 'mysterium-vpn-js'
import type { BugReporter } from '../../../app/bug-reporting/interface'
import logger from '../../../app/logger'
import type { ConnectionEstablisher } from '../../../app/connection/connection-establisher'
import type { ErrorMessage } from '../../../app/connection/error-message'
import { ConnectionStatsFetcher } from '../../../app/connection/connection-stats-fetcher'
import type { ConnectionState } from '../../../app/connection/connection-state'
import type { Provider } from '../../../app/connection/provider'
import messages from '../../../app/messages'
import type { RendererCommunication } from '../../../app/communication/renderer-communication'

type ConnectionStore = {
  ip?: ?string,
  location?: ?ConsumerLocation,
  status: $Values<typeof ConnectionStatus>,
  statistics: Object,
  lastConnectionProvider?: ?Provider,
  actionLoopers: { [string]: FunctionLooper }
}

class ActionLooper {
  action: string
  looper: FunctionLooper

  constructor (action: string, looper: FunctionLooper) {
    this.action = action
    this.looper = looper
  }
}

class ActionLooperConfig {
  action: string
  threshold: number

  constructor (action: string, threshold: number) {
    this.action = action
    this.threshold = threshold
  }
}

const defaultStatistics = {}

function stateFactory (): ConnectionStore {
  return {
    ip: null,
    location: null,
    lastConnectionProvider: null,
    status: ConnectionStatus.NOT_CONNECTED,
    statistics: defaultStatistics,
    actionLoopers: {}
  }
}

const getters = {
  lastConnectionAttemptProvider (state: ConnectionStore): ?Provider {
    return state.lastConnectionProvider
  },
  status (state: ConnectionStore): $Values<typeof ConnectionStatus> {
    return state.status
  },
  connection (state: ConnectionStore): ConnectionStore {
    return state
  },
  ip (state: ConnectionStore): ?string {
    return state.ip
  },
  location (state: ConnectionStore): ?ConsumerLocation {
    return state.location
  }
}

const mutations = {
  [type.SET_CONNECTION_STATUS] (state: ConnectionStore, status: $Values<typeof ConnectionStatus>) {
    state.status = status
  },
  [type.CONNECTION_STATISTICS] (state: ConnectionStore, statistics: ConnectionStatistics) {
    state.statistics = statistics
  },
  [type.CONNECTION_IP] (state: ConnectionStore, ip: string) {
    state.ip = ip
  },
  [type.LOCATION] (state: ConnectionStore, location: ConsumerLocation) {
    state.location = location
  },
  [type.CONNECTION_STATISTICS_RESET] (state: ConnectionStore) {
    state.statistics = defaultStatistics
  },
  [type.SET_ACTION_LOOPER] (state: ConnectionStore, looper: ActionLooper) {
    state.actionLoopers[looper.action] = looper.looper
  },
  [type.REMOVE_ACTION_LOOPER] (state: ConnectionStore, action: string) {
    delete state.actionLoopers[action]
  },
  [type.SET_LAST_CONNECTION_PROVIDER] (state: ConnectionStore, provider: Provider) {
    state.lastConnectionProvider = provider
  }
}

function actionsFactory (
  tequilapi: TequilapiClient,
  communication: RendererCommunication,
  bugReporter: BugReporter,
  connectionEstablisher: ConnectionEstablisher
) {
  return {
    async [type.LOCATION] ({ commit }) {
      try {
        const locationDto = await tequilapi.location(config.locationUpdateTimeout)
        commit(type.LOCATION, locationDto)
      } catch (err) {
        if (err.isTequilapiError) {
          return
        }
        bugReporter.captureErrorException(err)
      }
    },
    async [type.CONNECTION_IP] ({ commit }) {
      try {
        const ipModel = await tequilapi.connectionIp(config.ipUpdateTimeout)
        commit(type.CONNECTION_IP, ipModel.ip)
      } catch (err) {
        if (err.isTequilapiError) {
          return
        }
        bugReporter.captureErrorException(err)
      }
    },
    [type.START_ACTION_LOOPING] ({ dispatch, commit, state }, event: ActionLooperConfig): FunctionLooper {
      const currentLooper = state.actionLoopers[event.action]
      if (currentLooper) {
        logger.info('Warning: requested to start looping action which is already looping: ' + event.action)
        return currentLooper
      }

      const looper = new FunctionLooper(() => dispatch(event.action), event.threshold)
      looper.onFunctionError((err) => {
        logger.error(`Error while executing ${event.action} action, error:`, err)
        bugReporter.captureErrorException(err)
      })
      looper.start()

      commit(type.SET_ACTION_LOOPER, new ActionLooper(event.action, looper))
      return looper
    },
    async [type.STOP_ACTION_LOOPING] ({ commit, state }, action: string) {
      const looper = state.actionLoopers[action]
      if (looper) {
        await looper.stop()
      }
      commit(type.REMOVE_ACTION_LOOPER, action)
    },
    async [type.FETCH_CONNECTION_STATUS] ({ commit, dispatch }) {
      try {
        const statusModel = await tequilapi.connectionStatus()
        await dispatch(type.SET_CONNECTION_STATUS, statusModel.status)
      } catch (err) {
        commit(type.SHOW_ERROR_MESSAGE, messages.connectionStatusFailed)
      }
    },
    async [type.SET_CONNECTION_STATUS] ({ commit, dispatch, state }, newStatus: $Values<typeof ConnectionStatus>) {
      const oldStatus = state.status
      if (oldStatus === newStatus) {
        return
      }
      commit(type.SET_CONNECTION_STATUS, newStatus)
      communication.connectionStatusChanged.send({ oldStatus, newStatus })

      if (newStatus === ConnectionStatus.CONNECTED) {
        commit(type.CONNECTION_IP, null)
        const statisticsLooperConfig =
          new ActionLooperConfig(type.CONNECTION_STATISTICS, config.statisticsUpdateThreshold)
        await dispatch(type.START_ACTION_LOOPING, statisticsLooperConfig)
      }
      if (newStatus === ConnectionStatus.NOT_CONNECTED) {
        commit(type.CONNECTION_IP, null)
      }
      if (oldStatus === ConnectionStatus.CONNECTED) {
        await dispatch(type.STOP_ACTION_LOOPING, type.CONNECTION_STATISTICS)
      }
    },
    async [type.CONNECTION_STATISTICS] ({ commit }) {
      try {
        const statistics = await tequilapi.connectionStatistics()
        commit(type.CONNECTION_STATISTICS, statistics)
      } catch (err) {
        logger.warn(err)
        commit(type.SHOW_ERROR_MESSAGE, messages.connectionStatisticsFailed)
      }
    },
    async [type.RECONNECT] ({ dispatch, getters }) {
      const provider: ?Provider = getters.lastConnectionAttemptProvider
      if (provider == null) {
        throw new Error('Last provider not set')
      }
      await dispatch(type.CONNECT, provider)
    },
    async [type.CONNECT] ({ commit, dispatch, state, getters }, provider: Provider) {
      const consumerId = getters.currentIdentity
      const connectionState = new VueConnectionState(commit, dispatch)
      const errorMessage = new VueErrorMessage(commit, dispatch)
      const actionLooper = state.actionLoopers[type.FETCH_CONNECTION_STATUS]
      await connectionEstablisher
        .connect(consumerId, provider, connectionState, errorMessage, state.location, actionLooper)
    },
    async [type.DISCONNECT] ({ commit, dispatch, state }) {
      const connectionState = new VueConnectionState(commit, dispatch)
      const connectionStatsFetcher = new VueConnectionStatsFetcher(commit, dispatch)
      const errorMessage = new VueErrorMessage(commit, dispatch)
      const actionLooper = state.actionLoopers[type.FETCH_CONNECTION_STATUS]
      await connectionEstablisher.disconnect(connectionState, connectionStatsFetcher, errorMessage, actionLooper)
    }
  }
}

function factory (
  tequilapi: TequilapiClient,
  communication: RendererCommunication,
  bugReporter: BugReporter,
  connectionEstablisher: ConnectionEstablisher
) {
  const actions = actionsFactory(tequilapi, communication, bugReporter, connectionEstablisher)
  return {
    state: stateFactory(),
    getters,
    mutations,
    actions
  }
}

type CommitFunction = (string, any) => void
type DispatchFunction = (string, ...Array<any>) => Promise<void>

class VueAction {
  _commit: CommitFunction
  _dispatch: DispatchFunction

  constructor (commit: CommitFunction, dispatch: DispatchFunction) {
    this._commit = commit
    this._dispatch = dispatch
  }
}

class VueErrorMessage extends VueAction implements ErrorMessage {
  hide () {
    this._commit(type.HIDE_ERROR)
  }

  show (message: string) {
    this._commit(type.SHOW_ERROR_MESSAGE, message)
  }
}

class VueConnectionStatsFetcher extends VueAction implements ConnectionStatsFetcher {
  async fetchConnectionStatus () {
    await this._dispatch(type.FETCH_CONNECTION_STATUS)
  }

  async fetchConnectionIp () {
    await this._dispatch(type.CONNECTION_IP)
  }
}

class VueConnectionState extends VueAction implements ConnectionState {
  setLastConnectionProvider (provider: Provider) {
    this._commit(type.SET_LAST_CONNECTION_PROVIDER, provider)
  }

  async setConnectionStatus (status: $Values<typeof ConnectionStatus>) {
    await this._dispatch(type.SET_CONNECTION_STATUS, status)
  }

  resetStatistics () {
    this._commit(type.CONNECTION_STATISTICS_RESET)
  }
}

export { ActionLooper, ActionLooperConfig }
export type { ConnectionStore }
export default factory
