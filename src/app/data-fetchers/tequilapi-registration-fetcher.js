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

import type { TequilapiClient, IdentityRegistration } from 'mysterium-vpn-js'
import { FunctionLooper } from '../../libraries/function-looper'
import type { Subscriber } from '../../libraries/publisher'
import Publisher from '../../libraries/publisher'
import type { RegistrationFetcher } from './registration-fetcher'

class TequilapiRegistrationFetcher implements RegistrationFetcher {
  _api: TequilapiClient
  _loop: FunctionLooper
  _registrationPublisher: Publisher<IdentityRegistration> = new Publisher()
  _errorPublisher: Publisher<Error> = new Publisher()
  _identityId: string

  constructor (api: TequilapiClient, interval: number = 5000) {
    this._api = api

    this._loop = new FunctionLooper(async () => {
      await this.fetch()
    }, interval)
    this._loop.onFunctionError((error) => {
      this._errorPublisher.publish(error)
    })
  }

  /**
   * Starts periodic proposal fetching.
   */
  start (identityId: string): void {
    this._identityId = identityId
    if (!this._loop.isRunning()) {
      this._loop.start()
    }
  }

  /**
   * Forces proposals to be fetched without delaying.
   */
  async fetch (): Promise<IdentityRegistration> {
    const registration = await this._api.identityRegistration(this._identityId)

    this._registrationPublisher.publish(registration)

    return registration
  }

  async stop (): Promise<void> {
    await this._loop.stop()
  }

  onFetchedRegistration (subscriber: Subscriber<IdentityRegistration>): void {
    this._registrationPublisher.addSubscriber(subscriber)
  }

  onFetchingError (subscriber: Subscriber<Error>): void {
    this._errorPublisher.addSubscriber(subscriber)
  }
}

export default TequilapiRegistrationFetcher
