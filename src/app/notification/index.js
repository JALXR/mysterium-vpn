/*
 * Copyright (C) 2018 The "MysteriumNetwork/mysterion" Authors.
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
import notifier from 'electron-notifications'

export default class Notification {
  _title: string
  _subtitle: string
  _reconnect: ?() => void

  constructor (title: string, subtitle: string) {
    this._title = title
    this._subtitle = subtitle
  }

  addReconnectFn (reconnect: () => void) {
    this._reconnect = reconnect
  }

  show () {
    const disconnect = notifier.notify('Disconnected', {
      message: this._subtitle,
      duration: 10000,
      buttons: ['reconnect']
    })

    disconnect.on('buttonClicked', (text: string, btnIdx) => {
      this._reconnect()
    })
  }
}
