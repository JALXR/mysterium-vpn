/*
 * Copyright (C) 2018 The "mysteriumnetwork/mysterium-vpn" Authors.
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

import type { ErrorMessage } from './error-message'
import type { ConsumerLocation } from 'mysterium-vpn-js'
import { FunctionLooper } from '../../libraries/function-looper'
import type { ConnectionState } from './connection-state'
import type { ConnectionStatsFetcher } from './connection-stats-fetcher'
import type { Provider } from './provider'

interface ConnectionEstablisher {
  connect (
    consumerId: string,
    provider: Provider,
    connectionState: ConnectionState,
    errorMessage: ErrorMessage,
    location: ?ConsumerLocation,
    actionLooper: ?FunctionLooper): Promise<void>,
  disconnect (
    connectionState: ConnectionState,
    connectionStatsFetcher: ConnectionStatsFetcher,
    errorMessage: ErrorMessage,
    actionLoopers: ?FunctionLooper): Promise<void>
}

export type { ConnectionEstablisher }
