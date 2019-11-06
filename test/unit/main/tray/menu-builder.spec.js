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
import TrayMenuBuilder from '../../../../src/main/tray/menu-builder'
import translations from '../../../../src/main/tray/translations'
import { describe, it, expect, beforeEach } from '../../../helpers/dependencies'
import { buildMainCommunication } from '../../../../src/app/communication/main-communication'
import DirectMessageBus from '../../../helpers/direct-message-bus'
import { buildRendererCommunication } from '../../../../src/app/communication/renderer-communication'
import { CallbackRecorder } from '../../../helpers/utils'
import type { MessageReceiver } from '../../../../src/app/communication/message-receiver'
import { QualityLevel, ConnectionStatus } from 'mysterium-vpn-js'

class FakeApplicationQuitter {
  didQuit: boolean = false

  quit () {
    this.didQuit = true
  }
}

class MessageRecorder<T> {
  _recorder: CallbackRecorder

  constructor (receiver: MessageReceiver<T>) {
    this._recorder = new CallbackRecorder()
    receiver.on(this._recorder.getCallback())
  }

  get invoked (): boolean {
    return this._recorder.invoked
  }

  get argument (): T {
    return this._recorder.firstArgument
  }
}

describe('tray', () => {
  describe('TrayMenuBuilder', () => {
    let appQuitter
    let communication
    let rendererCommunication
    let messageBus
    let builder
    let windowIsVisible = false

    const showWindow = () => {
      windowIsVisible = true
    }

    let devToolsToggled = false
    const toggleDevTools = () => {
      devToolsToggled = !devToolsToggled
    }

    const separator = 'separator'

    beforeEach(() => {
      windowIsVisible = false
      devToolsToggled = false
      messageBus = new DirectMessageBus()
      communication = buildMainCommunication(messageBus)
      rendererCommunication = buildRendererCommunication(messageBus)
      appQuitter = new FakeApplicationQuitter()
      builder = new TrayMenuBuilder(() => appQuitter.quit(), showWindow, toggleDevTools, communication)
    })

    describe('.build', () => {
      it('renders menu items without disconnect when not connected', () => {
        const items = builder.updateConnectionStatus(ConnectionStatus.NOT_CONNECTED).build()
        expect(items[0].label).to.equal(translations.vpnStatusDisconnected)
        expect(items[1].label).to.equal(translations.connect)
        expect(items[2].type).to.equal(separator)
        expect(items[3].label).to.equal(translations.providerServiceStopped)
        expect(items[4].type).to.equal(separator)
        expect(items[5].label).to.equal(translations.showWindow)
        expect(items[6].label).to.equal(translations.toggleDeveloperTools)
        expect(items[7].type).to.equal(separator)
        expect(items[8].label).to.equal(translations.quit)
      })

      it('renders menu items with disconnect when connected', () => {
        const items = builder.updateConnectionStatus(ConnectionStatus.CONNECTED).build()
        expect(items[0].label).to.equal(translations.vpnStatusConnected)
        expect(items[1].label).to.equal(translations.disconnect)
        expect(items[2].type).to.equal(separator)
        expect(items[3].label).to.equal(translations.providerServiceStopped)
        expect(items[4].type).to.equal(separator)
        expect(items[5].label).to.equal(translations.showWindow)
        expect(items[6].label).to.equal(translations.toggleDeveloperTools)
        expect(items[7].type).to.equal(separator)
        expect(items[8].label).to.equal(translations.quit)
      })

      it('sets status to connected', () => {
        const items = builder.updateConnectionStatus(ConnectionStatus.CONNECTED).build()
        expect(items[0].label).to.equal(translations.vpnStatusConnected)
      })

      it('sets status to disconnected', () => {
        const items = builder.updateConnectionStatus(ConnectionStatus.NOT_CONNECTED).build()
        expect(items[0].label).to.equal(translations.vpnStatusDisconnected)
      })

      it('sets status to connecting', () => {
        const items = builder.updateConnectionStatus(ConnectionStatus.CONNECTING).build()
        expect(items[0].label).to.equal(translations.vpnStatusConnecting)
      })

      it('sets status to disconnecting', () => {
        const items = builder.updateConnectionStatus(ConnectionStatus.DISCONNECTING).build()
        expect(items[0].label).to.equal(translations.vpnStatusDisconnecting)
      })

      it('renders favourite country with an asterisk (*)', () => {
        builder.updateCountries([
          {
            id: 'proposalId_123',
            code: 'LT',
            name: 'Lithuania',
            isFavorite: true,
            quality: 0,
            qualityLevel: QualityLevel.LOW
          },
          { id: 'proposalId_456',
            code: 'US',
            name: 'USA',
            isFavorite: false,
            quality: 1,
            qualityLevel: QualityLevel.HIGH
          }
        ])

        const connectItem: any = builder.build().find(it => it.label === 'Connect')
        expect(connectItem.submenu[0].label).to.include('*')
        expect(connectItem.submenu[1].label).to.not.include('*')
      })

      it('connects', () => {
        builder.updateCountries([
          { id: 'proposalId_123',
            code: 'LT',
            name: 'Lithuania',
            isFavorite: true,
            quality: 0,
            qualityLevel: QualityLevel.LOW
          },
          { id: 'proposalId_456',
            code: 'US',
            name: 'USA',
            isFavorite: false,
            quality: 1,
            qualityLevel: QualityLevel.HIGH
          }
        ])

        const connectItem: any = builder.build().find(it => it.label === 'Connect')

        const recorder = new MessageRecorder(rendererCommunication.connectionRequest)
        expect(recorder.invoked).to.be.false
        connectItem.submenu[0].click()
        expect(recorder.invoked).to.be.true
        expect(recorder.argument).to.eql({ providerId: 'proposalId_123', providerCountry: 'LT' })
      })

      it('disconnects', () => {
        const disconnectItem: any = builder.updateConnectionStatus(ConnectionStatus.CONNECTED).build()
          .find(it => it.label === 'Disconnect')
        const recorder = new MessageRecorder(rendererCommunication.connectionCancel)
        expect(recorder.invoked).to.be.false
        disconnectItem.click()
        expect(recorder.invoked).to.be.true
      })

      it('shows window', () => {
        const items = builder.build()
        expect(windowIsVisible).to.equal(false)
        items[5].click()
        expect(windowIsVisible).to.equal(true)
      })

      it('quits app', () => {
        const items = builder.build()
        expect(appQuitter.didQuit).to.equal(false)
        items[8].click()
        expect(appQuitter.didQuit).to.equal(true)
      })

      it('toggles developer tools', () => {
        const items = builder.build()
        expect(devToolsToggled).to.equal(false)
        items[6].click()
        expect(devToolsToggled).to.equal(true)
        items[6].click()
        expect(devToolsToggled).to.equal(false)
      })
    })
  })
})
