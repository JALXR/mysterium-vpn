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
import { app, Tray as ElectronTray, Menu } from 'electron'
import Window from '../../app/window'
import TrayMenuBuilder from './menu-builder'
import Tray from './tray'
import type { ConnectionStatusChangeDTO } from '../../app/communication/dto'
import CountryList from '../../app/data-fetchers/country-list'
import type { MainCommunication } from '../../app/communication/main-communication'
import { ServiceStatus } from 'mysterium-vpn-js'

const trayFactory = (
  communication: MainCommunication,
  countryList: CountryList,
  window: Window,
  iconPath: string
) => {
  const menuBuilder = new TrayMenuBuilder(
    () => app.quit(),
    () => window.show(),
    () => window.toggleDevTools(),
    communication
  )

  const trayFactory = (icon) => {
    return new ElectronTray(icon)
  }

  const templateBuilder = (items) => {
    return Menu.buildFromTemplate(items)
  }

  const tray = new Tray(trayFactory, templateBuilder, menuBuilder, iconPath)
  tray.build()

  communication.connectionStatusChanged.on((change: ConnectionStatusChangeDTO) => {
    tray.setVpnConnectionStatus(change.newStatus)
  })
  communication.providerServiceStatusChanged.on((status: $Values<typeof ServiceStatus>) => {
    tray.setProviderServiceStatus(status)
  })
  countryList.onUpdate(countries => tray.setCountries(countries))
}

export default trayFactory
