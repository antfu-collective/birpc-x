import type { RpcFunctionDefinition, RpcFunctionsCollector, RpcFunctionType } from './types'

export function defineRpcFunction<
  NAME extends string,
  TYPE extends RpcFunctionType,
  ARGS extends any[],
  RETURN = void,
>(
  definition: RpcFunctionDefinition<NAME, TYPE, ARGS, RETURN>,
): RpcFunctionDefinition<NAME, TYPE, ARGS, RETURN> {
  return definition
}

export function createDefineWrapperWithContext<CONTEXT>() {
  return function defineRpcFunctionWithContext<
    NAME extends string,
    TYPE extends RpcFunctionType,
    ARGS extends any[],
    RETURN = void,
  >(
    definition: RpcFunctionDefinition<NAME, TYPE, ARGS, RETURN, CONTEXT>,
  ): RpcFunctionDefinition<NAME, TYPE, ARGS, RETURN, CONTEXT> {
    return definition
  }
}

export async function getRpcHandler<
  NAME extends string,
  TYPE extends RpcFunctionType,
  ARGS extends any[],
  RETURN = void,
  CONTEXT = undefined,
>(
  definition: RpcFunctionDefinition<NAME, TYPE, ARGS, RETURN, CONTEXT>,
  context: CONTEXT,
): Promise<(...args: ARGS) => RETURN> {
  if (definition.handler) {
    return definition.handler
  }
  if (definition.__resolved?.handler) {
    return definition.__resolved.handler
  }
  definition.__promise ??= Promise.resolve(definition.setup(context))
    .then((r) => {
      definition.__resolved = r
      definition.__promise = undefined
      return r
    })
  const result = definition.__resolved ??= await definition.__promise
  return result.handler
}

export class RpcFunctionsCollectorBase<
  LocalFunctions extends Record<string, any>,
  SetupContext,
> implements RpcFunctionsCollector<LocalFunctions, SetupContext> {
  public readonly definitions: Map<string, RpcFunctionDefinition<string, any, any, any, SetupContext>> = new Map()
  public readonly functions: LocalFunctions

  constructor(
    public readonly context: SetupContext,
  ) {
    const definitions = this.definitions
    // eslint-disable-next-line ts/no-this-alias
    const self = this
    this.functions = new Proxy({}, {
      get(_, prop) {
        const definition = definitions.get(prop as string)
        if (!definition)
          return undefined
        return getRpcHandler(definition, self.context)
      },
      has(_, prop) {
        return definitions.has(prop as string)
      },
      getOwnPropertyDescriptor(_, prop) {
        return {
          value: definitions.get(prop as string)?.handler,
          configurable: true,
          enumerable: true,
        }
      },
      ownKeys() {
        return Array.from(definitions.keys())
      },
    }) as LocalFunctions
  }

  register(fn: RpcFunctionDefinition<string, any, any, any, SetupContext>, force = false): void {
    if (this.definitions.has(fn.name) && !force) {
      throw new Error(`RPC function "${fn.name}" is already registered`)
    }
    this.definitions.set(fn.name, fn)
  }

  update(fn: RpcFunctionDefinition<string, any, any, any, SetupContext>, force = false): void {
    if (!this.definitions.has(fn.name) && !force) {
      throw new Error(`RPC function "${fn.name}" is not registered. Use register() to add new functions.`)
    }
    this.definitions.set(fn.name, fn)
  }

  async getHandler<T extends keyof LocalFunctions>(name: T): Promise<LocalFunctions[T]> {
    return await getRpcHandler(this.definitions.get(name as string)!, this.context) as LocalFunctions[T]
  }

  has(name: string): boolean {
    return this.definitions.has(name)
  }

  get(name: string): RpcFunctionDefinition<string, any, any, any, SetupContext> | undefined {
    return this.definitions.get(name)
  }

  list(): string[] {
    return Array.from(this.definitions.keys())
  }
}
