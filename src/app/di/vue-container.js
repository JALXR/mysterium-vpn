// @flow
import type {Container, ServiceFactory} from './index'
import Vue from 'vue'
import Injector from 'vue-inject'

/**
 * Implementation of DI container which is Vue plugin at the same time.
 */
class VueContainer implements Container {
  injector: Injector

  constructor (vueInstance: Vue) {
    this.injector = Injector.spawn()
    vueInstance.use(this.injector)
  }

  get (name: string): mixed {
    return this.injector.get(name)
  }

  constant (name: string, value: mixed): void {
    this.injector.constant(name, value)
  }

  service (name: string, dependencies: Array<string>, factory: ServiceFactory): void {
    this.injector.service(name, dependencies, factory)
  }

  factory (name: string, dependencies: Array<string>, factory: ServiceFactory, cache: ?boolean): void {
    const factoryWrapper = this.injector.factory(name, dependencies, factory)
    if (cache) factoryWrapper.lifecycle.application()
  }
}

export default VueContainer
