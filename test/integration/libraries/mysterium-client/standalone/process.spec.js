// @flow
import {ChildProcess} from 'child_process'
import sleep from '../../../../../src/libraries/sleep'
import Process from '../../../../../src/libraries/mysterium-client/standalone/process'
import processLogLevels from '../../../../../src/libraries/mysterium-client/log-levels'
import ClientConfig from '../../../../../src/libraries/mysterium-client/config'
import tequilapiClientFactory from '../../../../../src/libraries/mysterium-tequilapi/client-factory'
import path from 'path'
import os from 'os'

xdescribe('Standalone Process', () => {
  let process, tequilapi
  const logs = []
  const tequilapiPort = 4055
  const clientBinDirectory = path.resolve(__dirname, '../../../../../bin')
  const tmpDirectory = os.tmpdir()

  before(async () => {
    process = new Process(new ClientConfig(
      path.join(clientBinDirectory, 'mysterium_client'),
      path.join(clientBinDirectory, 'config'),
      path.join(clientBinDirectory, 'openvpn'),
      tmpDirectory,
      tmpDirectory,
      tmpDirectory,
      tequilapiPort
    ))
    process.start()
    process.onLog(processLogLevels.LOG, data => logs.push(data))

    tequilapi = tequilapiClientFactory(`http://127.0.0.1:${tequilapiPort}`)

    await sleep(100)
  })

  after(() => {
    process.stop()
  })

  it('spawns in less than 100ms without errors', () => {
    expect(process.child).to.be.instanceOf(ChildProcess)
  })

  it('sends log data to callback on()', () => {
    expect(logs.pop()).to.include('Api started on: ' + tequilapiPort)
  })

  it('responds to healthcheck with uptime', async () => {
    const res = await tequilapi.healthCheck()
    expect(res.uptime).to.be.ok
    expect(res.version).to.be.ok
  })

  it('responds to healthcheck with version string', async () => {
    const res = await tequilapi.healthCheck()
    expect(res.version).to.include.all.keys(['branch', 'commit', 'buildNumber'])
  })
})
