import type { RpcArgsSchema, RpcFunctionDefinition, RpcFunctionsCollector, RpcFunctionType, RpcReturnSchema } from './types'

export function defineRpcFunction<
  NAME extends string,
  TYPE extends RpcFunctionType,
  ARGS extends any[],
  RETURN = void,
  const AS extends RpcArgsSchema | undefined = undefined,
  const RS extends RpcReturnSchema | undefined = undefined,
>(
  definition: RpcFunctionDefinition<NAME, TYPE, ARGS, RETURN, AS, RS>,
): RpcFunctionDefinition<NAME, TYPE, ARGS, RETURN, AS, RS> {
  return definition
}

export function createDefineWrapperWithContext<CONTEXT>() {
  return function defineRpcFunctionWithContext<
    NAME extends string,
    TYPE extends RpcFunctionType,
    ARGS extends any[],
    RETURN = void,
    const AS extends RpcArgsSchema | undefined = undefined,
    const RS extends RpcReturnSchema | undefined = undefined,
  >(
    definition: RpcFunctionDefinition<NAME, TYPE, ARGS, RETURN, AS, RS, CONTEXT>,
  ): RpcFunctionDefinition<NAME, TYPE, ARGS, RETURN, AS, RS, CONTEXT> {
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
  definition: RpcFunctionDefinition<NAME, TYPE, ARGS, RETURN, any, any, CONTEXT>,
  context: CONTEXT,
): Promise<(...args: ARGS) => RETURN> {
  if (definition.handler) {
    return definition.handler
  }
  if (definition.__resolved?.handler) {
    return definition.__resolved.handler
  }
  if (!definition.setup) {
    throw new Error(`[birpc-x] Either handler or setup function must be provided for RPC function "${definition.name}"`)
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
  public readonly definitions: Map<string, RpcFunctionDefinition<string, any, any, any, any, any, SetupContext>> = new Map()
  public readonly functions: LocalFunctions
  private readonly _onChanged: ((id?: string) => void)[] = []

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

  register(fn: RpcFunctionDefinition<string, any, any, any, any, any, SetupContext>, force = false): void {
    if (this.definitions.has(fn.name) && !force) {
      throw new Error(`RPC function "${fn.name}" is already registered`)
    }
    this.definitions.set(fn.name, fn)
    this._onChanged.forEach(cb => cb(fn.name))
  }

  update(fn: RpcFunctionDefinition<string, any, any, any, any, any, SetupContext>, force = false): void {
    if (!this.definitions.has(fn.name) && !force) {
      throw new Error(`RPC function "${fn.name}" is not registered. Use register() to add new functions.`)
    }
    this.definitions.set(fn.name, fn)
    this._onChanged.forEach(cb => cb(fn.name))
  }

  onChanged(fn: (id?: string) => void): () => void {
    this._onChanged.push(fn)
    return () => {
      const index = this._onChanged.indexOf(fn)
      if (index !== -1) {
        this._onChanged.splice(index, 1)
      }
    }
  }

  async getHandler<T extends keyof LocalFunctions>(name: T): Promise<LocalFunctions[T]> {
    return await getRpcHandler(this.definitions.get(name as string)!, this.context) as LocalFunctions[T]
  }

  getSchema<T extends keyof LocalFunctions>(name: T): { argsSchema: RpcArgsSchema | undefined, returnSchema: RpcReturnSchema | undefined } {
    const definition = this.definitions.get(name as string)
    if (!definition)
      throw new Error(`RPC function "${String(name)}" is not registered`)
    return {
      argsSchema: definition.argsSchema,
      returnSchema: definition.returnSchema,
    }
  }

  has(name: string): boolean {
    return this.definitions.has(name)
  }

  get(name: string): RpcFunctionDefinition<string, any, any, any, any, any, SetupContext> | undefined {
    return this.definitions.get(name)
  }

  list(): string[] {
    return Array.from(this.definitions.keys())
  }
}
