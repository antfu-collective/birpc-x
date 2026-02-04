# birpc-x

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

Extensible [birpc](https://github.com/antfu-collective/birpc) interfaces.

> [!IMPORTANT]
> Experimental. API may change anytime.

## Features

On top of [`birpc`](https://github.com/antfu-collective/birpc), `birpc-x` adds the following features:

- Type-safe function definitions
- Dynamically registerable functions
- User-provided function context
- Schema-validation via [`valibot`](https://valibot.dev)
- Cache Manager for RPC results

## Installation

```bash
ppm install birpc-x
```

## Usage

### Defining Functions

Use `defineRpcFunction` to create type-safe RPC function definitions:

```ts
import { defineRpcFunction } from 'birpc-x'

// Simple function
const greet = defineRpcFunction({
  name: 'greet',
  handler: (name: string) => `Hello, ${name}!`
})
```

On top of birpc, birpc-x also provides a standardize way to provide a context to the function.

```ts
import { defineRpcFunction } from 'birpc-x'

// With setup and context
const getUser = defineRpcFunction({
  name: 'getUser',
  setup: (context) => {
    console.log(context)
    return {
      handler: (id: string) => context.users[id]
    }
  }
})
```

#### Schema Validation

Use Valibot schemas for automatic argument and return value validation:

```ts
import * as v from 'valibot'

const add = defineRpcFunction({
  name: 'add',
  args: [v.number(), v.number()] as const,
  returns: v.number(),
  handler: (a, b) => a + b // Types are automatically inferred
})
```

### Function Collector

`RpcFunctionsCollector` manages dynamic function registration and provides a type-safe proxy for accessing functions:

```ts
import { RpcFunctionsCollectorBase } from 'birpc-x'

// Provide a custom context to the collector
const collector = new RpcFunctionsCollectorBase({ users: [/* ... */] })

// Register functions
collector.register(defineRpcFunction({
  name: 'greet',
  handler: (name: string) => `Hello, ${name}!`,
}))
collector.register(defineRpcFunction({
  name: 'getUser',
  setup: (context) => {
    return {
      handler: (id: string) => context.users.find((user: { id: string }) => user.id === id)
    }
  }
}))

// Access via proxy
await collector.functions.greet('Alice') // "Hello, Alice!"

// Listen for changes
const unsubscribe = collector.onChanged((fnName) => {
  console.log(`Function ${fnName} changed`)
})
```

### Dump Feature

The dump feature allows pre-computing RPC results for static hosting, testing, or offline mode. This is useful for static sites or when you want to avoid runtime computation.

```ts
import { createClientFromDump, dumpFunctions } from 'birpc-x'

// Define functions with dump configurations
const greet = defineRpcFunction({
  name: 'greet',
  handler: (name: string) => `Hello, ${name}!`,
  dump: {
    inputs: [
      ['Alice'],
      ['Bob'],
      ['Charlie']
    ],
    fallback: 'Hello, stranger!'
  }
})

// Collect pre-computed results
const store = await dumpFunctions([greet])

// Create a client that serves from the dump store
const client = createClientFromDump(store)

await client.greet('Alice') // Returns pre-computed: "Hello, Alice!"
await client.greet('Unknown') // Returns fallback: "Hello, stranger!"
```

Functions with `type: 'static'` automatically get dumped with empty arguments if no dump configuration is provided.

#### Pre-computed Records

You can provide pre-computed records directly to bypass function execution:

```ts
const multiply = defineRpcFunction({
  name: 'multiply',
  handler: (a: number, b: number) => a * b,
  dump: {
    records: [
      { inputs: [2, 3], output: 6 },
      { inputs: [4, 5], output: 20 },
    ],
  },
})
```

You can also mix computed (`inputs`) and pre-computed (`records`) in the same dump configuration.

#### Parallel Execution

Enable parallel processing for faster dump collection:

```ts
// Enable parallel with default concurrency of 5
const store = await dumpFunctions([greet], context, {
  concurrency: true
})

// Or specify a custom concurrency limit
const store = await dumpFunctions([greet], context, {
  concurrency: 10, // Limit to 10 concurrent executions
  onProgress: (completed, total, name) => {
    console.log(`${name}: ${completed}/${total}`)
  }
})
```

Set `concurrency` to `true` for parallel execution (default limit: 5) or a number to specify the exact concurrency limit.

## Examples

See [test](./test) directory for complete integration examples.

## API Reference

Full API documentation available at [jsdocs.io](https://www.jsdocs.io/package/birpc-x).

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg'/>
  </a>
</p>

## License

[MIT](./LICENSE) License © [Anthony Fu](https://github.com/antfu)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/birpc-x?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/birpc-x
[npm-downloads-src]: https://img.shields.io/npm/dm/birpc-x?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/birpc-x
[bundle-src]: https://img.shields.io/bundlephobia/minzip/birpc-x?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=birpc-x
[license-src]: https://img.shields.io/github/license/antfu/birpc-x.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/antfu/birpc-x/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/birpc-x
