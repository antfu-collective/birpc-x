import type {
  BirpcReturn,
  RpcDefinitionsToFunctions,
  RpcDump,
  RpcDumpClientOptions,
  RpcDumpDefinition,
  RpcDumpStore,
  RpcFunctionDefinitionAny,
} from './types'
import { hash } from 'ohash'
import { getRpcHandler } from './handler'
import { validateDefinitions } from './validation'

/**
 * Collects pre-computed dumps by executing functions with their defined input combinations.
 * Static functions without dump config automatically get `{ inputs: [[]] }`.
 *
 * @example
 * ```ts
 * const store = await dumpFunctions([greet], context)
 * ```
 */
export async function dumpFunctions<
  T extends readonly RpcFunctionDefinitionAny[],
>(
  definitions: T,
  context?: any,
  options?: {
    parallel?: boolean
    onProgress?: (completed: number, total: number, functionName: string) => void
  },
): Promise<RpcDumpStore<RpcDefinitionsToFunctions<T>>> {
  validateDefinitions(definitions)

  const store: RpcDumpStore = {
    definitions: {},
    records: {},
  }

  for (const definition of definitions) {
    const dump: RpcDump | undefined = definition.dump
    let handler: (...args: any[]) => any
    let setupDump: RpcDumpDefinition | undefined

    // Fresh setup results needed to support different dump contexts
    if (definition.setup) {
      const setupResult = await Promise.resolve(definition.setup(context))
      handler = setupResult.handler
      if (setupResult.dump) {
        setupDump = setupResult.dump
      }
    }
    else {
      handler = await getRpcHandler(definition, context)
    }

    let finalDump = setupDump ?? dump

    if (!finalDump && definition.type === 'static') {
      finalDump = { inputs: [[]] }
    }

    if (!finalDump) {
      continue
    }

    let dumpDefinition: RpcDumpDefinition
    if (typeof finalDump === 'function') {
      dumpDefinition = await Promise.resolve(finalDump(context, handler))
    }
    else {
      dumpDefinition = finalDump
    }

    store.definitions[definition.name] = {
      name: definition.name,
      type: definition.type,
    }

    const { inputs, fallback } = dumpDefinition
    let recordCount = 0

    for (const input of inputs) {
      const argsHash = hash(input)
      const recordKey = `${definition.name}---${argsHash}`

      try {
        const output = await Promise.resolve(handler(...input))
        store.records[recordKey] = {
          inputs: input,
          output,
        }
      }
      catch (error: any) {
        store.records[recordKey] = {
          inputs: input,
          error: {
            message: error.message,
            name: error.name,
            stack: error.stack,
          },
        }
      }

      recordCount++
      options?.onProgress?.(recordCount, inputs.length, definition.name)
    }

    if (fallback !== undefined) {
      store.records[`${definition.name}---fallback`] = {
        inputs: [],
        output: fallback,
      }
    }
  }

  return store
}

/**
 * Creates a client that serves pre-computed results from a dump store.
 * Uses argument hashing to match calls to stored records.
 *
 * @example
 * ```ts
 * const client = createClientFromDump(store)
 * await client.greet('Alice')
 * ```
 */
export function createClientFromDump<T extends Record<string, any>>(
  store: RpcDumpStore<T>,
  options: RpcDumpClientOptions = {},
): BirpcReturn<T> {
  const { onMiss } = options

  const client = new Proxy({} as T, {
    get(_, functionName: string) {
      if (!(functionName in store.definitions)) {
        throw new Error(`[birpc-x] Function "${functionName}" not found in dump store`)
      }

      return async (...args: any[]) => {
        const argsHash = hash(args)
        const recordKey = `${functionName}---${argsHash}`

        const recordOrGetter = store.records[recordKey]

        if (recordOrGetter) {
          const record = typeof recordOrGetter === 'function'
            ? await recordOrGetter()
            : recordOrGetter

          if (record.error) {
            const error = new Error(record.error.message)
            error.name = record.error.name
            if (record.error.stack) {
              error.stack = record.error.stack
            }
            throw error
          }

          if (typeof record.output === 'function') {
            return await record.output()
          }

          return record.output
        }

        onMiss?.(functionName, args)

        const fallbackKey = `${functionName}---fallback`
        if (fallbackKey in store.records) {
          const fallbackOrGetter = store.records[fallbackKey]

          const fallbackRecord = typeof fallbackOrGetter === 'function'
            ? await fallbackOrGetter()
            : fallbackOrGetter

          if (typeof fallbackRecord.output === 'function') {
            return await fallbackRecord.output()
          }
          return fallbackRecord.output
        }

        throw new Error(
          `[birpc-x] No dump match for "${functionName}" with args: ${JSON.stringify(args)}`,
        )
      }
    },
    has(_, functionName: string) {
      return functionName in store.definitions
    },
    ownKeys() {
      return Object.keys(store.definitions)
    },
    getOwnPropertyDescriptor(_, functionName: string) {
      return functionName in store.definitions
        ? { configurable: true, enumerable: true, value: undefined }
        : undefined
    },
  })

  return client as any as BirpcReturn<T>
}

/**
 * Filters function definitions to only those with dump definitions.
 * Note: Only checks the definition itself, not setup results.
 */
export function getDefinitionsWithDumps<T extends readonly RpcFunctionDefinitionAny[]>(
  definitions: T,
): RpcFunctionDefinitionAny[] {
  return definitions.filter(def => def.dump !== undefined)
}
