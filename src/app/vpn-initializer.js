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

import type { Identity, TequilapiClient } from 'mysterium-vpn-js'
import IdentityManager from './identity-manager'

/**
 * Creates or re-uses identity and unlocks it for future operations requiring identity.
 */
class VpnInitializer {
  _tequilapi: TequilapiClient

  constructor (tequilapi: TequilapiClient) {
    this._tequilapi = tequilapi
  }

  // TODO: pass-in identityManager to constructor instead
  async initialize (identityManager: IdentityManager, updateClientVersion: () => Promise<void>): Promise<void> {
    await this._prepareIdentity(identityManager)
    await updateClientVersion()
  }

  async _prepareIdentity (identityManager: IdentityManager): Promise<void> {
    const identity = await this._getFirstOrCreateIdentity(identityManager)
    await identityManager.unlockIdentity(identity)
  }

  async _getFirstOrCreateIdentity (identityManager: IdentityManager): Promise<Identity> {
    const identities = await identityManager.listIdentities()

    if (identities && identities.length > 0) {
      return identities[0]
    }

    const identity = await identityManager.createIdentity()
    return identity
  }
}

export default VpnInitializer
