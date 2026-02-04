import type { RpcFunctionDefinition, RpcFunctionType } from './types'

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
