// @flow

import type {Country} from '../../app/countries/index'
import ProposalDTO from '../../libraries/mysterium-tequilapi/dto/proposal'
import MainCommunication from '../../app/communication/main-communication'
import {getCountryLabel, getSortedCountryListFromProposals} from '../../app/countries/index'
import ConnectionStatusEnum from '../../libraries/mysterium-tequilapi/dto/connection-status-enum'
import type {ConnectionStatus} from '../../libraries/mysterium-tequilapi/dto/connection-status-enum'
import TrayMenu from './menu'
import TrayMenuItem from './menu-item'
import TrayMenuSeparator from './menu-item-separator'
import translations from './translations'

function getMenuItems (
  appQuit: Function,
  showWindow: Function,
  toggleDevTools: Function,
  communication: MainCommunication,
  proposals: Array<ProposalDTO>,
  connectionStatus: ConnectionStatus
) {
  const disconnect = new TrayMenuItem(
    translations.disconnect,
    () => communication.sendConnectionCancelRequest()
  )

  const connectSubmenu = new TrayMenu()

  const countries = getSortedCountryListFromProposals(proposals)

  countries.forEach((country: Country) => {
    connectSubmenu.add(getCountryLabel(country), () => {
      communication.sendConnectionRequest({providerId: country.id})
    })
  })

  const connect = new TrayMenuItem(
    translations.connect,
    null,
    null,
    connectSubmenu
  )

  const statusItem = (new TrayMenuItem(translations.statusDisconnected)).disable()

  const items = new TrayMenu()
  items.addItem(statusItem)
  items.addItem(new TrayMenuSeparator())
  items.addItem(connect)
  items.addItem(disconnect.hide())
  items.addItem(new TrayMenuSeparator())
  items.add(translations.showWindow, () => showWindow())
  items.add(translations.toggleDeveloperTools, () => toggleDevTools(), 'Alt+Command+I')
  items.addItem(new TrayMenuSeparator())
  items.add(translations.quit, () => appQuit(), 'Command+Q')

  switch (connectionStatus) {
    case ConnectionStatusEnum.CONNECTED:
      connect.hide()
      disconnect.show()
      statusItem.setLabel(translations.statusConnected)
      break

    case ConnectionStatusEnum.CONNECTING:
      connect.hide()
      disconnect.hide()
      statusItem.setLabel(translations.statusConnecting)
      break

    case ConnectionStatusEnum.DISCONNECTING:
      connect.hide()
      disconnect.hide()
      statusItem.setLabel(translations.statusDisconnecting)
      break

    case ConnectionStatusEnum.NOT_CONNECTED:
      connect.show()
      disconnect.hide()
      statusItem.setLabel(translations.statusDisconnected)
      break

    default:
      connect.show()
      disconnect.hide()
      statusItem.setLabel(translations.statusDisconnected)
      break
  }

  return items.getItems()
}

class TrayMenuBuilder {
  _appQuit: Function
  _showWindow: Function
  _toggleDevTools: Function
  _communication: MainCommunication
  _proposals: Array<ProposalDTO> = []
  _connectionStatus: ConnectionStatus

  constructor (appQuit: Function, showWindow: Function, toggleDevTools: Function, communication: MainCommunication) {
    this._appQuit = appQuit
    this._showWindow = showWindow
    this._toggleDevTools = toggleDevTools
    this._communication = communication
  }

  updateProposals (proposals: Array<ProposalDTO>): this {
    this._proposals = proposals

    return this
  }

  updateConnectionStatus (status: ConnectionStatus): this {
    this._connectionStatus = status

    return this
  }

  build (): Array<Object> {
    return getMenuItems(
      this._appQuit,
      this._showWindow,
      this._toggleDevTools,
      this._communication,
      this._proposals,
      this._connectionStatus
    )
  }
}

export default TrayMenuBuilder
