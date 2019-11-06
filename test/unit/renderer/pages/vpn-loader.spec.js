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

import Vue from 'vue'
import Vuex from 'vuex'
import Router from 'vue-router'
import { createLocalVue, mount } from '@vue/test-utils'

import idStoreFactory from '@/store/modules/identity'
import mainStoreFactory from '@/store/modules/main'
import errorStoreFactory from '@/store/modules/errors'
import VpnLoader from '@/pages/vpn-loader'

import { describe, it, beforeEach, before } from '../../../helpers/dependencies'
import messages from '../../../../src/app/messages'
import types from '@/store/types'
import type { TequilapiClient } from 'mysterium-vpn-js'

import DIContainer from '../../../../src/app/di/vue-container'
import BugReporterMock from '../../../helpers/bug-reporter-mock'
import type { BugReporter } from '../../../../src/app/bug-reporting/interface'
import { nextTick } from '../../../helpers/utils'
import FakeMessageBus from '../../../helpers/fake-message-bus'
import { TequilapiError } from 'mysterium-vpn-js'
import { buildRendererCommunication } from '../../../../src/app/communication/renderer-communication'
import MockEventSender from '../../../helpers/statistics/mock-event-sender'
import IdentityManager from '../../../../src/app/identity-manager'

describe('VpnLoader', () => {
  const tequilapi = tequilapiMockCreate()
  let bugReporter: BugReporterMock

  async function mountComponent (tequilapi: TequilapiClient, vpnInitializer: Object, bugReporter: BugReporter): Vue {
    const localVue = createLocalVue()

    const dependencies = new DIContainer(localVue)
    const fakeSleeper = {
      async sleep (_time: number): Promise<void> {}
    }
    const communication = buildRendererCommunication(new FakeMessageBus())
    const identityManager = new IdentityManager(tequilapi)
    dependencies.constant('bugReporter', bugReporter)
    dependencies.constant('vpnInitializer', vpnInitializer)
    dependencies.constant('sleeper', fakeSleeper)
    dependencies.constant('rendererCommunication', communication)
    dependencies.constant('tequilapiClient', tequilapi)
    dependencies.constant('identityManager', identityManager)

    localVue.use(Router)
    const router = new Router({ routes: [] })

    localVue.use(Vuex)
    const store = new Vuex.Store({
      modules: {
        identity: idStoreFactory(),
        main: mainStoreFactory(tequilapi, new MockEventSender()),
        errors: errorStoreFactory(),
        connection: {
          actions: {
            [types.LOCATION]: function () {}
          }
        }
      },
      strict: false
    })

    const wrapper = mount(VpnLoader, { localVue, store, router })
    return wrapper.vm
  }

  function tequilapiMockCreate (): Object {
    return {}
  }

  beforeEach(() => {
    bugReporter = new BugReporterMock()
  })

  describe('when initialization succeeds', () => {
    let vm

    before(async () => {
      const vpnInitializer = {
        async initialize (..._args: Array<any>): Promise<void> {}
      }
      vm = await mountComponent(tequilapi, vpnInitializer, bugReporter)
    })

    it('loads without errors', async () => {
      expect(vm.$store.state.main.init).to.eql('INIT_SUCCESS')
      expect(vm.$store.state.main.showError).to.eql(false)
    })

    it('routes to main', () => {
      expect(vm.$route.path).to.be.eql('/vpn')
    })
  })

  describe('when initialization fails few times', () => {
    let vm
    let invoked: number = 0

    beforeEach(async () => {
      const vpnInitializer = {
        async initialize (..._args: Array<any>): Promise<void> {
          invoked++
          if (invoked <= 5) {
            throw new Error('Mock initialization error')
          }
        }
      }

      vm = await mountComponent(tequilapi, vpnInitializer, bugReporter)
      await nextTick()
    })

    it('loads without errors', async () => {
      expect(vm.$store.state.main.init).to.eql('INIT_SUCCESS')
      expect(vm.$store.state.main.showError).to.eql(false)
    })

    it('routes to main', () => {
      expect(vm.$route.path).to.be.eql('/vpn')
    })
  })

  describe('when initialization fails always', () => {
    let vm

    async function initializeWithError (error: Error) {
      const vpnInitializer = {
        async initialize (..._args: Array<any>): Promise<void> {
          throw error
        }
      }

      vm = await mountComponent(tequilapi, vpnInitializer, bugReporter)
      await nextTick() // wait for mount hook to complete
    }

    describe('with unknown error', () => {
      beforeEach(async () => {
        await initializeWithError(new Error('Mock initialization error'))
      })

      it('notifies user with an overlay', () => {
        expect(vm.$store.getters.overlayError).to.eql({
          message: messages.initializationError.message
        })
      })

      it('reports error', () => {
        expect(bugReporter.errorExceptions.length).to.eql(1)
        const error = bugReporter.errorExceptions[0].error
        expect(error).to.be.an('error')
        expect(error.message).to.eql('Application loading failed: Mock initialization error')
      })
    })

    describe('with http error', () => {
      beforeEach(async () => {
        const error = new TequilapiError(new Error('Mock initialization error'), 'mock-path')
        await initializeWithError(error)
      })

      it('does not report error', () => {
        expect(bugReporter.errorExceptions).to.be.empty
      })
    })
  })
})
