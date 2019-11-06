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
import path from 'path'
import { Tray as ElectronTray } from 'electron'
import TrayMenuBuilder from './menu-builder'
import translations from './translations'
import { ConnectionStatus, ServiceStatus } from 'mysterium-vpn-js'
import type { Country } from '../../app/countries/country'

const TrayIcon = {
  active: 'active',
  passive: 'passive'
}

type IconState = $Values<typeof TrayIcon>

const iconFilenames = {
  [TrayIcon.active]: 'active.png',
  [TrayIcon.passive]: 'passive.png'
}

type electronTrayFactory = (iconPath: string) => ElectronTray

class Tray {
  _electronTrayFactory: electronTrayFactory
  _electronTray: ElectronTray
  _menuBuilder: TrayMenuBuilder
  _templateBuilder: Function
  _canUpdateItems: boolean = true
  _vpnConnectionStatus: $Values<typeof ConnectionStatus>
  _providerServiceStatus: $Values<typeof ServiceStatus>
  _iconPath: string

  constructor (
    trayFactory: electronTrayFactory,
    templateBuilder: Function,
    menuBuilder: TrayMenuBuilder,
    imagePath: string) {
    this._electronTrayFactory = trayFactory
    this._templateBuilder = templateBuilder
    this._menuBuilder = menuBuilder
    this._iconPath = imagePath
  }

  build (): this {
    this._electronTray = this._electronTrayFactory(this._getIconPath(TrayIcon.passive))
    this._electronTray.setToolTip(translations.name)
    this._electronTray.setContextMenu(this._templateBuilder(this._menuBuilder.build()))
    this._setupOpeningEvents()

    return this
  }

  _update (): this {
    this._electronTray.setContextMenu(this._templateBuilder(this._menuBuilder.build()))

    return this
  }

  setCountries (countries: Array<Country>) {
    this._menuBuilder.updateCountries(countries)

    if (!this._canUpdateItems) {
      return
    }

    this._update()
  }

  setVpnConnectionStatus (status: $Values<typeof ConnectionStatus>) {
    if (this._vpnConnectionStatus === status) {
      return
    }

    this._vpnConnectionStatus = status

    switch (status) {
      case ConnectionStatus.CONNECTED:
        this._setIcon(TrayIcon.active)
        break
      case ConnectionStatus.NOT_CONNECTED:
      case ConnectionStatus.CONNECTING:
      case ConnectionStatus.DISCONNECTING:
        this._setIcon(TrayIcon.passive)
        break
      default:
        this._setIcon(TrayIcon.passive)
        break
    }

    this._menuBuilder.updateConnectionStatus(status)
    this._update()
  }

  setProviderServiceStatus (status: $Values<typeof ServiceStatus>) {
    this._providerServiceStatus = status
    this._menuBuilder.updateProviderServiceStatus(status)
    this._update()
  }

  _setupOpeningEvents () {
    const handler = () => {
      this._canUpdateItems = false
    }

    this._electronTray.on('click', handler)
    this._electronTray.on('mouse-enter', handler)
    this._electronTray.on('mouse-leave', () => {
      this._update()
      this._canUpdateItems = true
    })
  }

  _setIcon (state: IconState): this {
    this._electronTray.setImage(this._getIconPath(state))

    return this
  }

  _getIconPath (state: IconState): string {
    return path.join(this._iconPath, iconFilenames[state])
  }
}

export default Tray
export { TrayIcon }
