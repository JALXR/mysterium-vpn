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
import { expect } from 'chai'

import type from '@/store/types'
import mainFactory, { ActionLooper, ActionLooperConfig } from '@/store/modules/connection'
import { describe, it, beforeEach } from '../../../../helpers/dependencies'
import { FunctionLooper } from '@/../libraries/function-looper'
import { ConnectionStatus } from 'mysterium-vpn-js'
import type { ConsumerLocation, ConnectionStatistics } from 'mysterium-vpn-js'
import communicationMessages from '@/../app/communication/messages'
import FakeMessageBus from '../../../../helpers/fake-message-bus'
import type { ConnectionStore } from '../../../../../src/renderer/store/modules/connection'
import BugReporterMock from '../../../../helpers/bug-reporter-mock'
import factoryTequilapiManipulator from '../../../../helpers/mysterium-tequilapi/factory-tequilapi-manipulator'
import type { ConnectionEstablisher } from '../../../../../src/app/connection/connection-establisher'
import type { ErrorMessage } from '../../../../../src/app/connection/error-message'
import type { ConnectionState } from '../../../../../src/app/connection/connection-state'
import type { ConnectionStatsFetcher } from '../../../../../src/app/connection/connection-stats-fetcher'
import type { Provider } from '../../../../../src/app/connection/provider'
import { captureAsyncError } from '../../../../helpers/utils'
import messages from '../../../../../src/app/messages'
import { buildRendererCommunication } from '../../../../../src/app/communication/renderer-communication'

type ConnectParams = {
  consumerId: string,
  provider: Provider,
  connectionState: ConnectionState,
  errorMessage: ErrorMessage,
  location: ?ConsumerLocation,
  actionLooper: ?FunctionLooper
}

type DisconnectParams = {
  connectionState: ConnectionState,
  connectionStatsFetcher: ConnectionStatsFetcher,
  errorMessage: ErrorMessage,
  actionLooper: ?FunctionLooper
}

class MockConnectionEstablisher implements ConnectionEstablisher {
  connectParams: ?ConnectParams = null
  disconnectParams: ?DisconnectParams = null

  async connect (
    consumerId: string,
    provider: Provider,
    connectionState: ConnectionState,
    errorMessage: ErrorMessage,
    location: ?ConsumerLocation,
    actionLooper: ?FunctionLooper): Promise<void> {
    this.connectParams = { consumerId, provider, connectionState, errorMessage, location, actionLooper }
  }

  async disconnect (
    connectionState: ConnectionState,
    connectionStatsFetcher: ConnectionStatsFetcher,
    errorMessage: ErrorMessage,
    actionLooper: ?FunctionLooper): Promise<void> {
    this.disconnectParams = { connectionState, connectionStatsFetcher, errorMessage, actionLooper }
  }
}

describe('connection', () => {
  let store

  let fakeTequilapi
  let fakeMessageBus
  let communication

  let bugReporterMock: BugReporterMock
  let mockConnectionEstablisher: MockConnectionEstablisher

  beforeEach(() => {
    fakeTequilapi = factoryTequilapiManipulator()
    fakeMessageBus = new FakeMessageBus()
    communication = buildRendererCommunication(fakeMessageBus)

    bugReporterMock = new BugReporterMock()
    mockConnectionEstablisher = new MockConnectionEstablisher()

    store = mainFactory(
      fakeTequilapi.getFakeApi(),
      communication,
      bugReporterMock,
      mockConnectionEstablisher
    )
  })

  describe('mutations', () => {
    let mutations

    beforeEach(() => {
      mutations = store.mutations
    })

    describe('SET_LAST_CONNECTION_PROVIDER', () => {
      it('updates provider', () => {
        const setLastConnectionProvider = mutations[type.SET_LAST_CONNECTION_PROVIDER]

        const state: ConnectionStore = {
          status: ConnectionStatus.CONNECTED,
          statistics: {},
          actionLoopers: {}
        }
        const provider: Provider = {
          id: 'id',
          country: 'country'
        }
        setLastConnectionProvider(state, provider)
        expect(state.lastConnectionProvider).to.eql(provider)
      })
    })

    describe('SET_CONNECTION_STATUS', () => {
      it('updates remote status', () => {
        const connectionStatus = mutations[type.SET_CONNECTION_STATUS]

        const state: ConnectionStore = {
          status: ConnectionStatus.CONNECTED,
          statistics: {},
          actionLoopers: {}
        }
        connectionStatus(state, 'Disconnecting')
        expect(state.status).to.eql('Disconnecting')
      })
    })

    describe('CONNECTION_STATISTICS', () => {
      it('updates statistics', () => {
        const connectionStatistics = mutations[type.CONNECTION_STATISTICS]

        const state: ConnectionStore = {
          status: ConnectionStatus.CONNECTED,
          statistics: {},
          actionLoopers: {}
        }
        const stats: ConnectionStatistics = {
          duration: 13320,
          bytesReceived: 0,
          bytesSent: 0
        }

        connectionStatistics(state, stats)
        expect(state.statistics).to.eql(stats)
      })
    })

    describe('CONNECTION_IP', () => {
      it('updates ip', () => {
        const connectionIp = mutations[type.CONNECTION_IP]

        const state: ConnectionStore = {
          ip: 'old',
          status: ConnectionStatus.CONNECTED,
          statistics: {},
          actionLoopers: {}
        }
        connectionIp(state, 'new')
        expect(state.ip).to.eql('new')
      })
    })

    describe('CONNECTION_STATISTICS_RESET', () => {
      it('resets statistics', () => {
        const state: ConnectionStore = {
          status: ConnectionStatus.CONNECTED,
          statistics: {
            duration: 13320,
            bytesReceived: 10,
            bytesSent: 20
          },
          actionLoopers: {}
        }
        mutations[type.CONNECTION_STATISTICS_RESET](state)
        expect(state.statistics).to.eql({})
      })
    })

    describe('SET_ACTION_LOOPER', () => {
      it('sets action loopers', () => {
        const state: ConnectionStore = {
          status: ConnectionStatus.CONNECTED,
          statistics: {},
          actionLoopers: {}
        }
        const actionLooper1 = new ActionLooper(type.CONNECTION_IP, new FunctionLooper(async () => {}, 1000))
        mutations[type.SET_ACTION_LOOPER](state, actionLooper1)
        expect(state.actionLoopers).to.eql({
          [actionLooper1.action]: actionLooper1.looper
        })

        const actionLooper2 = new ActionLooper(type.FETCH_CONNECTION_STATUS, new FunctionLooper(async () => {}, 1000))
        mutations[type.SET_ACTION_LOOPER](state, actionLooper2)
        expect(state.actionLoopers).to.eql({
          [actionLooper1.action]: actionLooper1.looper,
          [actionLooper2.action]: actionLooper2.looper
        })
      })
    })

    describe('REMOVE_ACTION_LOOPER', () => {
      it('removes single action looper', () => {
        const noop = async () => {}
        const ipLooper = new FunctionLooper(noop, 1000)
        const statusLooper = new FunctionLooper(noop, 1000)
        const state = {
          status: ConnectionStatus.CONNECTED,
          statistics: {},
          actionLoopers: {
            [type.CONNECTION_IP]: ipLooper,
            [type.FETCH_CONNECTION_STATUS]: statusLooper
          }
        }
        mutations[type.REMOVE_ACTION_LOOPER](state, type.CONNECTION_IP)
        expect(state.actionLoopers).to.eql({
          [type.FETCH_CONNECTION_STATUS]: statusLooper
        })
      })
    })
  })

  describe('actions', () => {
    async function executeAction (action, state = {}, payload = {}, getters = {}) {
      const mutations = []
      const commit = (key, value) => {
        mutations.push({ key, value })
      }

      const dispatch = (action, payload = {}) => {
        const context = { commit, dispatch, state, getters }
        return store.actions[action](context, payload)
      }

      await dispatch(action, payload)
      return mutations
    }

    describe('START_ACTION_LOOPING', () => {
      it('sets update looper and performs first looper cycle', async () => {
        const state = {
          status: ConnectionStatus.CONNECTED,
          statistics: {},
          actionLoopers: {}
        }
        const committed = await executeAction(
          type.START_ACTION_LOOPING,
          state,
          new ActionLooperConfig(type.CONNECTION_STATISTICS, 1000)
        )

        expect(committed).to.have.lengthOf(2)

        expect(committed[0].key).to.eql(type.SET_ACTION_LOOPER)
        const { action, looper } = committed[0].value
        expect(action).to.eql(type.CONNECTION_STATISTICS)
        expect(looper).to.be.an.instanceof(FunctionLooper)
        expect(looper.isRunning()).to.eql(true)

        const expectedStatistics = {
          duration: 1,
          bytesReceived: 0,
          bytesSent: 0
        }
        expect(committed[1]).to.eql({
          key: type.CONNECTION_STATISTICS,
          value: expectedStatistics
        })
      })

      it('does not start second looper if it already exists', async () => {
        const noop = async () => {}
        const looper = new FunctionLooper(noop, 1000)
        const state = {
          status: ConnectionStatus.CONNECTED,
          statistics: {},
          actionLoopers: {
            [type.CONNECTION_STATISTICS]: looper
          }
        }
        const committed = await executeAction(
          type.START_ACTION_LOOPING,
          state,
          new ActionLooperConfig(type.CONNECTION_STATISTICS, 1000)
        )

        expect(committed).to.eql([])
      })
    })

    describe('STOP_ACTION_LOOPING', () => {
      it('stops and cleans update looper', async () => {
        const actionLooper = new FunctionLooper(async () => {}, 0)
        actionLooper.start()
        const state = {
          status: ConnectionStatus.CONNECTED,
          statistics: {},
          actionLoopers: {
            [type.CONNECTION_IP]: actionLooper
          }
        }

        expect(actionLooper.isRunning()).to.eql(true)
        const committed = await executeAction(type.STOP_ACTION_LOOPING, state, type.CONNECTION_IP)
        expect(committed).to.eql([{
          key: type.REMOVE_ACTION_LOOPER,
          value: type.CONNECTION_IP
        }])
        expect(actionLooper.isRunning()).to.eql(false)
      })

      it('does not throw error with no update looper', async () => {
        const state = {
          status: ConnectionStatus.CONNECTED,
          statistics: {},
          actionLoopers: {}
        }
        await executeAction(type.STOP_ACTION_LOOPING, state, type.CONNECTION_IP)
      })
    })

    describe('CONNECTION_IP', () => {
      it('commits new ip counter', async () => {
        const committed = await executeAction(type.CONNECTION_IP)
        expect(committed).to.eql([
          {
            key: type.CONNECTION_IP,
            value: 'mock ip'
          }
        ])
      })

      it('ignores errors', async () => {
        fakeTequilapi.setIpTimeout()
        const committed = await executeAction(type.CONNECTION_IP)
        expect(committed).to.eql([])
      })

      it('captures unknown errors', async () => {
        fakeTequilapi.setIpFail()
        await executeAction(type.CONNECTION_IP)
        expect(bugReporterMock.errorExceptions).to.have.lengthOf(1)
      })

      it('does not capture http errors', async () => {
        fakeTequilapi.setIpTimeout()
        await executeAction(type.CONNECTION_IP)
        expect(bugReporterMock.errorExceptions).to.be.empty
      })
    })

    describe('FETCH_CONNECTION_STATUS', () => {
      it('commits new status', async () => {
        const committed = await executeAction(type.FETCH_CONNECTION_STATUS)
        expect(committed).to.be.lengthOf(2)

        expect(committed[0].key).to.eql(type.SET_CONNECTION_STATUS)
        expect(committed[0].value).to.eql(ConnectionStatus.NOT_CONNECTED)

        expect(committed[1].key).to.eql(type.CONNECTION_IP)
        expect(committed[1].value).to.eql(null)
      })

      it('commits error when api fails', async () => {
        fakeTequilapi.setStatusFail()
        const committed = await executeAction(type.FETCH_CONNECTION_STATUS)
        expect(committed).to.eql([{
          key: type.SHOW_ERROR_MESSAGE,
          value: messages.connectionStatusFailed
        }])
      })
    })

    describe('SET_CONNECTION_STATUS', () => {
      beforeEach(() => {
        fakeMessageBus.clean()
      })

      it('commits new status', async () => {
        const committed = await executeAction(type.SET_CONNECTION_STATUS, {}, ConnectionStatus.CONNECTING)
        expect(committed).to.eql([{
          key: type.SET_CONNECTION_STATUS,
          value: ConnectionStatus.CONNECTING
        }])
      })

      it('sends new status to IPC', async () => {
        const state = {
          status: ConnectionStatus.NOT_CONNECTED
        }
        await executeAction(type.SET_CONNECTION_STATUS, state, ConnectionStatus.CONNECTING)
        expect(fakeMessageBus.lastChannel).to.eql(communicationMessages.CONNECTION_STATUS_CHANGED)
        expect(fakeMessageBus.lastData).to.eql({
          oldStatus: ConnectionStatus.NOT_CONNECTED,
          newStatus: ConnectionStatus.CONNECTING
        })
      })

      it('does not send new status to IPC when status does not change', async () => {
        const state = {
          status: ConnectionStatus.NOT_CONNECTED
        }
        await executeAction(type.SET_CONNECTION_STATUS, state, ConnectionStatus.NOT_CONNECTED)
        expect(fakeMessageBus.lastChannel).to.eql(null)
      })

      it('starts looping statistics when changing state to connected, changes IP to Refreshing...', async () => {
        const state = {
          status: ConnectionStatus.NOT_CONNECTED,
          statistics: {},
          actionLoopers: {}
        }
        const committed = await executeAction(type.SET_CONNECTION_STATUS, state, ConnectionStatus.CONNECTED)
        expect(committed).to.have.lengthOf(4)
        expect(committed[0]).to.eql({
          key: type.SET_CONNECTION_STATUS,
          value: ConnectionStatus.CONNECTED
        })
        expect(committed[1].key).to.eql(type.CONNECTION_IP)
        expect(committed[1].value).to.eql(null)
        expect(committed[2].key).to.eql(type.SET_ACTION_LOOPER)
        expect(committed[2].value.action).to.eql(type.CONNECTION_STATISTICS)
        const looper = committed[2].value.looper
        expect(looper).to.be.an.instanceof(FunctionLooper)
        expect(looper.isRunning()).to.eql(true)
        expect(committed[3]).to.eql({
          key: type.CONNECTION_STATISTICS,
          value: {
            duration: 1,
            bytesReceived: 0,
            bytesSent: 0
          }
        })
      })

      it('sets ip status to Refreshing when state changes to Disconnected', async () => {
        const committed = await executeAction(type.SET_CONNECTION_STATUS, {}, ConnectionStatus.NOT_CONNECTED)

        expect(committed).to.eql([
          {
            key: type.SET_CONNECTION_STATUS,
            value: ConnectionStatus.NOT_CONNECTED
          },
          {
            key: type.CONNECTION_IP,
            value: null
          }
        ])
      })

      it('stops looping statistics when changing state from connected', async () => {
        const noop = async () => {}
        const looper = new FunctionLooper(noop, 1000)
        looper.start()
        const state = {
          status: ConnectionStatus.CONNECTED,
          actionLoopers: {
            [type.CONNECTION_STATISTICS]: looper
          }
        }
        const committed = await executeAction(type.SET_CONNECTION_STATUS, state, ConnectionStatus.DISCONNECTING)

        expect(committed).to.eql([
          {
            key: type.SET_CONNECTION_STATUS,
            value: ConnectionStatus.DISCONNECTING
          },
          {
            key: type.REMOVE_ACTION_LOOPER,
            value: type.CONNECTION_STATISTICS
          }
        ])
        expect(looper.isRunning()).to.eql(false)
      })

      it('does nothing when changing state from connected to connected', async () => {
        const noop = async () => {}
        const looper = new FunctionLooper(noop, 1000)
        const state = {
          status: ConnectionStatus.CONNECTED,
          actionLoopers: {
            [type.CONNECTION_STATISTICS]: looper
          }
        }

        const committed = await executeAction(type.SET_CONNECTION_STATUS, state, ConnectionStatus.CONNECTED)
        expect(committed).to.eql([])
      })
    })

    describe('CONNECTION_STATISTICS', () => {
      it('commits new statistics', async () => {
        const committed = await executeAction(type.CONNECTION_STATISTICS)
        expect(committed).to.eql([{
          key: type.CONNECTION_STATISTICS,
          value: {
            duration: 1,
            bytesReceived: 0,
            bytesSent: 0
          }
        }])
      })

      it('commits error when api fails', async () => {
        fakeTequilapi.setStatisticsFail()
        const committed = await executeAction(type.CONNECTION_STATISTICS)
        expect(committed).to.eql([{
          key: type.SHOW_ERROR_MESSAGE,
          value: messages.connectionStatisticsFailed
        }])
      })
    })

    describe('RECONNECT', () => {
      it('invokes connection establisher with last connection provider', async () => {
        const location: ConsumerLocation = {
          asn: 123
        }
        const state: ConnectionStore = {
          status: ConnectionStatus.CONNECTED,
          statistics: {},
          actionLoopers: {
            [type.FETCH_CONNECTION_STATUS]: new FunctionLooper(async () => {}, 1000)
          },
          location
        }
        const getters = {
          currentIdentity: 'current',
          lastConnectionAttemptProvider: {
            id: 'lastConnectionProvider',
            country: 'us'
          }
        }
        await executeAction(type.RECONNECT, state, null, getters)

        const params = mockConnectionEstablisher.connectParams
        expect(params).to.exist
        if (params == null) {
          throw new Error('Connection params missing')
        }
        expect(params.provider.id).to.eql('lastConnectionProvider')
        expect(params.provider.country).to.eql('us')
        expect(params.consumerId).to.eql('current')
        expect(params.location).to.eql(state.location)
        expect(params.actionLooper).to.eql(state.actionLoopers[type.FETCH_CONNECTION_STATUS])
        expect(params.connectionState).to.exist
      })

      it('fails when last connection provider is not present', async () => {
        const state = {
          actionLoopers: {
            [type.FETCH_CONNECTION_STATUS]: new FunctionLooper(async () => {}, 1000)
          },
          location: {
            asn: 123
          }
        }
        const getters = {
          currentIdentity: 'current',
          lastConnectionAttemptProvider: null
        }

        const error = await captureAsyncError(() => executeAction(type.RECONNECT, state, null, getters))
        expect(error).to.be.an('error')
        if (!(error instanceof Error)) {
          throw new Error('error is not Error instance')
        }
        expect(error.message).to.eql('Last provider not set')
      })
    })

    describe('CONNECT', () => {
      it('invokes connection establisher with given provider', async () => {
        const location: ConsumerLocation = {
          asn: 123
        }
        const state = {
          status: ConnectionStatus.CONNECTED,
          statistics: {},
          actionLoopers: {},
          location
        }
        const getters = {
          currentIdentity: 'consumer id'
        }
        const provider: Provider = { id: 'provider', country: 'provider country' }
        await executeAction(type.CONNECT, state, provider, getters)

        const params = mockConnectionEstablisher.connectParams
        expect(params).to.exist
        if (params == null) {
          throw new Error('Connection params missing')
        }
        expect(params.consumerId).to.eql('consumer id')
        expect(params.provider).to.eql(provider)
        expect(params.location).to.eql(state.location)
        expect(params.actionLooper).to.eql(state.actionLoopers[type.FETCH_CONNECTION_STATUS])
        expect(params.connectionState).to.exist
      })
    })

    describe('DISCONNECT', () => {
      const state = {
        actionLoopers: {}
      }

      it('invokes connection establisher to disconnect', async () => {
        await executeAction(type.DISCONNECT, state)

        const params = mockConnectionEstablisher.disconnectParams
        expect(params).to.exist
        if (params == null) {
          throw new Error('Connection params missing')
        }
        expect(params.actionLooper).to.eql(state.actionLoopers[type.FETCH_CONNECTION_STATUS])
        expect(params.connectionState).to.exist
        expect(params.connectionStatsFetcher).to.exist
      })
    })
  })
})
