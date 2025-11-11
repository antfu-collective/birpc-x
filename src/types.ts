export type { BirpcFn, BirpcReturn } from 'birpc'

export type Thenable<T> = T | Promise<T>

export type EntriesToObject<T extends readonly [string, any][]> = {
  [K in T[number] as K[0]]: K[1]
}

/**
 * Type of the RPC function,
 * - static: A function that returns a static data, no arguments (can be cached and dumped)
 * - action: A function that performs an action (no data returned)
 * - query: A function that queries a resource
 */
export type RpcFunctionType = 'static' | 'action' | 'query'

export interface RpcFunctionsCollector<LocalFunctions, SetupContext = undefined> {
  context: SetupContext
  readonly functions: LocalFunctions
  readonly definitions: Map<string, RpcFunctionDefinitionAnyWithContext<SetupContext>>
  register: (fn: RpcFunctionDefinitionAnyWithContext<SetupContext>) => void
  update: (fn: RpcFunctionDefinitionAnyWithContext<SetupContext>) => void
}

export interface RpcFunctionSetupResult<
  ARGS extends any[],
  RETURN = void,
> {
  handler: (...args: ARGS) => RETURN
}

// TODO: maybe we should introduce schema system with valibot

export interface RpcFunctionDefinition<
  NAME extends string,
  TYPE extends RpcFunctionType,
  ARGS extends any[] = [],
  RETURN = void,
  CONTEXT = undefined,
> {
  name: NAME
  type: TYPE
  setup?: (context: CONTEXT) => Thenable<RpcFunctionSetupResult<ARGS, RETURN>>
  handler?: (...args: ARGS) => RETURN
  __resolved?: RpcFunctionSetupResult<ARGS, RETURN>
  __promise?: Thenable<RpcFunctionSetupResult<ARGS, RETURN>>
}

export type RpcFunctionDefinitionToFunction<T extends RpcFunctionDefinitionAny>
  = T extends RpcFunctionDefinition<string, any, infer ARGS, infer RETURN, any>
    ? ((...args: ARGS) => RETURN)
    : never

export type RpcFunctionDefinitionAny = RpcFunctionDefinition<string, any, any, any, any>
export type RpcFunctionDefinitionAnyWithContext<CONTEXT = undefined> = RpcFunctionDefinition<string, any, any, any, CONTEXT>

export type RpcDefinitionsToFunctions<T extends readonly RpcFunctionDefinitionAny[]> = EntriesToObject<{
  [K in keyof T]: [T[K]['name'], RpcFunctionDefinitionToFunction<T[K]>]
}>

export type RpcDefinitionsFilter<
  T extends readonly RpcFunctionDefinitionAny[],
  Type extends RpcFunctionType,
> = {
  [K in keyof T]: T[K] extends { type: Type } ? T[K] : never
}
