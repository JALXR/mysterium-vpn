import {types} from '../../libraries/api/tequilapi'

export default {
  tequilapi: types.connection,
  // Mutations
  SHOW_ERROR: 'SHOW_ERROR',

  INIT_SUCCESS: 'INIT_SUCCESS',
  INIT_PENDING: 'INIT_PENDING',
  INIT_FAIL: 'INIT_FAIL',
  INIT_NEW_USER: 'INIT_NEW_USER',

  IDENTITY_GET_SUCCESS: 'IDENTITY_GET_SUCCESS',
  IDENTITY_LIST_SUCCESS: 'IDENTITY_LIST_SUCCESS',

  PROPOSAL_LIST_SUCCESS: 'PROPOSAL_LIST_SUCCESS',

  LOG_INFO: 'LOG_INFO',
  LOG_ERROR: 'LOG_ERROR',
  HEALTHCHECK_SUCCESS: 'HEALTHCHECK_SUCCESS',

  MYST_PROCESS_RUNNING: 'MYST_PROCESS_RUNNING',

  IDENTITY_UNLOCK_SUCCESS: 'IDENTITY_UNLOCK_SUCCESS',
  IDENTITY_UNLOCK_PENDING: 'IDENTITY_UNLOCK_PENDING',
  IDENTITY_UNLOCK_FAIL: 'IDENTITY_UNLOCK_FAIL',

  HIDE_REQ_ERR: 'HIDE_REQ_ERR',

  CONNECTION_STATISTICS_RESET: 'CONNECTION_STATISTICS_RESET',

  INCREASE_IP_TIMEOUT_COUNTER: 'INCREASE_IP_TIMEOUT_COUNTER',
  RESET_TIMEOUT_COUNTER: 'RESET_TIMEOUT_COUNTER',

  // Mutation + action
  CONNECTION_STATUS_ALL: 'CONNECTION_STATUS_ALL',
  CONNECTION_STATUS: 'CONNECTION_STATUS',
  CONNECTION_STATISTICS: 'CONNECTION_STATISTICS',
  CONNECTION_IP: 'CONNECTION_IP',

  // Actions
  IDENTITY_CREATE: 'IDENTITY_CREATE',
  IDENTITY_LIST: 'IDENTITY_LIST',
  IDENTITY_UNLOCK: 'IDENTITY_UNLOCK',

  PROPOSAL_LIST: 'PROPOSAL_LIST',

  CONNECT: 'CONNECT',
  DISCONNECT: 'DISCONNECT',
  STATUS_UPDATER_RUN: 'STATUS_UPDATER_RUN',

  SET_NAV_OPEN: 'SET_NAV',
  SET_NAV_VISIBLE: 'SET_NAV_VISIBLE',
  SET_VISUAL: 'SET_VISUAL',

  OVERLAY_ERROR: 'OVERLAY_ERROR',
  ERROR_IN_RENDERER: 'ERROR_IN_RENDERER',

  TERMS: 'TERMS'
}
