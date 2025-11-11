import type { BirpcOptions } from 'birpc'
import type { BirpcReturn, RpcFunctionDefinition } from './types'
import { createBirpc } from 'birpc'
import { RpcFunctionsCollectorBase } from './collector'

export interface BirpcxOptionsBase<
  _RemoteFunctions extends Record<string, never>,
  LocalFunctions extends Record<string, never> = Record<string, never>,
  SetupContext = undefined,
  Collector extends RpcFunctionsCollectorBase<LocalFunctions, SetupContext> = RpcFunctionsCollectorBase<LocalFunctions, SetupContext>,
> {
  definitions?: RpcFunctionDefinition<string, any, any, any, SetupContext>[]
  setupContext: SetupContext
  collectorConstructor?: new () => Collector
}

export interface BirpcxReturn<
  RemoteFunctions extends Record<string, never>,
  LocalFunctions extends Record<string, never> = Record<string, never>,
  SetupContext = undefined,
  Collector extends RpcFunctionsCollectorBase<LocalFunctions, SetupContext> = RpcFunctionsCollectorBase<LocalFunctions, SetupContext>,
> {
  collector: Collector
  call: <K extends keyof RemoteFunctions>(method: K, ...args: Parameters<RemoteFunctions[K]>) => Promise<Awaited<ReturnType<RemoteFunctions[K]>>>
  callOptional: <K extends keyof RemoteFunctions>(method: K, ...args: Parameters<RemoteFunctions[K]>) => Promise<Awaited<ReturnType<RemoteFunctions[K]> | undefined>>
  callEvent: <K extends keyof RemoteFunctions>(method: K, ...args: Parameters<RemoteFunctions[K]>) => Promise<void>
  birpc: BirpcReturn<RemoteFunctions, LocalFunctions>
}

export interface BirpcxOptions<
  RemoteFunctions extends Record<string, never>,
  LocalFunctions extends Record<string, never> = Record<string, never>,
  SetupContext = undefined,
  Collector extends RpcFunctionsCollectorBase<LocalFunctions, SetupContext> = RpcFunctionsCollectorBase<LocalFunctions, SetupContext>,
> extends BirpcxOptionsBase<RemoteFunctions, LocalFunctions, SetupContext, Collector> {
  connection: BirpcOptions<RemoteFunctions>
}

export function createBirpcx<
  RemoteFunctions extends Record<string, never>,
  LocalFunctions extends Record<string, never> = Record<string, never>,
  SetupContext = undefined,
  Collector extends RpcFunctionsCollectorBase<LocalFunctions, SetupContext> = RpcFunctionsCollectorBase<LocalFunctions, SetupContext>,
>(options: BirpcxOptions<RemoteFunctions, LocalFunctions, SetupContext, Collector>): BirpcxReturn<RemoteFunctions, LocalFunctions, SetupContext, Collector> {
  const collector = new (options.collectorConstructor || RpcFunctionsCollectorBase)(options.setupContext) as Collector
  for (const def of options.definitions || []) {
    collector.register(def)
  }

  const birpc = createBirpc<RemoteFunctions, LocalFunctions>(
    collector.functions,
    options.connection,
  )

  return {
    collector,
    birpc,
    call: birpc.$call,
    callOptional: birpc.$callOptional,
    callEvent: birpc.$callEvent,
  }
}
