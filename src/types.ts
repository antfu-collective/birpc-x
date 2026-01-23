import type { GenericSchema } from 'valibot'
import type { InferArgsType, InferReturnType } from './utils'

export type { BirpcFn, BirpcReturn } from 'birpc'

export type Thenable<T> = T | Promise<T>

export type EntriesToObject<T extends readonly [string, any][]> = {
  [K in T[number] as K[0]]: K[1]
}

/**
 * Type of the RPC function,
 * - static: A function that returns a static data, no arguments (can be cached and dumped)
 * - action: A function that performs an action (no data returned)
 * - event: A function that emits an event (no data returned), and does not wait for a response
 * - query: A function that queries a resource
 *
 * By default, the function is a query function.
 */
export type RpcFunctionType = 'static' | 'action' | 'event' | 'query'

export interface RpcFunctionsCollector<LocalFunctions, SetupContext = undefined> {
  context: SetupContext
  readonly functions: LocalFunctions
  readonly definitions: Map<string, RpcFunctionDefinitionAnyWithContext<SetupContext>>
  register: (fn: RpcFunctionDefinitionAnyWithContext<SetupContext>) => void
  update: (fn: RpcFunctionDefinitionAnyWithContext<SetupContext>) => void
  onChanged: (fn: (id?: string) => void) => (() => void)
}

export interface RpcFunctionSetupResult<
  ARGS extends any[],
  RETURN = void,
> {
  handler: (...args: ARGS) => RETURN
}

export type RpcArgsSchema = readonly GenericSchema[]
export type RpcReturnSchema = GenericSchema

export type RpcFunctionDefinition<
  NAME extends string,
  TYPE extends RpcFunctionType = 'query',
  ARGS extends any[] = [],
  RETURN = void,
  AS extends RpcArgsSchema | undefined = undefined,
  RS extends RpcReturnSchema | undefined = undefined,
  CONTEXT = undefined,
>
  = [AS, RS] extends [undefined, undefined]
    ? {
        name: NAME
        type?: TYPE
        argsSchema?: AS
        returnSchema?: RS
        setup?: (context: CONTEXT) => Thenable<RpcFunctionSetupResult<ARGS, RETURN>>
        handler?: (...args: ARGS) => RETURN
        __resolved?: RpcFunctionSetupResult<ARGS, RETURN>
        __promise?: Thenable<RpcFunctionSetupResult<ARGS, RETURN>>
      }
    : {
        name: NAME
        type?: TYPE
        argsSchema: AS
        returnSchema: RS
        setup?: (context: CONTEXT) => Thenable<RpcFunctionSetupResult<InferArgsType<AS>, InferReturnType<RS>>>
        handler?: (...args: InferArgsType<AS>) => InferReturnType<RS>
        __resolved?: RpcFunctionSetupResult<InferArgsType<AS>, InferReturnType<RS>>
        __promise?: Thenable<RpcFunctionSetupResult<InferArgsType<AS>, InferReturnType<RS>>>
      }

export type RpcFunctionDefinitionToFunction<T extends RpcFunctionDefinitionAny>
  = T extends RpcFunctionDefinition<string, any, infer ARGS, infer RETURN, any, any, any>
    ? ((...args: ARGS) => RETURN)
    : never

export type RpcFunctionDefinitionAny = RpcFunctionDefinition<string, any, any, any, any, any, any>
export type RpcFunctionDefinitionAnyWithContext<CONTEXT = undefined> = RpcFunctionDefinition<string, any, any, any, any, any, CONTEXT>

export type RpcDefinitionsToFunctions<T extends readonly RpcFunctionDefinitionAny[]> = EntriesToObject<{
  [K in keyof T]: [T[K]['name'], RpcFunctionDefinitionToFunction<T[K]>]
}>

export type RpcDefinitionsFilter<
  T extends readonly RpcFunctionDefinitionAny[],
  Type extends RpcFunctionType,
> = {
  [K in keyof T]: T[K] extends { type: Type } ? T[K] : never
}
