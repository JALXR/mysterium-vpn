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

import type { BugReporter } from '../../src/app/bug-reporting/interface'
import type { Identity } from 'mysterium-vpn-js'

type ErrorCapture = {
  error: Error,
  context: any
}

type StringCapture = {
  message: string,
  context: any
}

class BugReporterMock implements BugReporter {
  identity: Identity

  errorMessages: Array<StringCapture> = []
  infoMessages: Array<StringCapture> = []
  errorExceptions: Array<ErrorCapture> = []
  infoExceptions: Array<ErrorCapture> = []

  setUser (identity: Identity): void {
    this.identity = identity
  }

  captureErrorMessage (_message: string, _context?: any): void {
    this.errorMessages.push({ message: _message, context: _context })
  }

  captureInfoMessage (_message: string, _context?: any): void {
    this.infoMessages.push({ message: _message, context: _context })
  }

  captureErrorException (_err: Error, _context?: any): void {
    this.errorExceptions.push({ error: _err, context: _context })
  }

  captureInfoException (_err: Error, _context?: any): void {
    this.infoExceptions.push({ error: _err, context: _context })
  }
}

export default BugReporterMock
