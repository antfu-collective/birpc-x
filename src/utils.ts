import type { GenericSchema, InferInput } from 'valibot'
import type { RpcArgsSchema, RpcReturnSchema } from './types'

export type Equal<X, Y>
  = (<T>() => T extends X ? 1 : 2) extends
  (<T>() => T extends Y ? 1 : 2) ? true : false

export type AssertEqual<X, Y>
  = (<T>() => T extends X ? 1 : 2) extends
  (<T>() => T extends Y ? 1 : 2) ? true : never

export type InferArgsType<S extends RpcArgsSchema | undefined>
  = S extends readonly [] ? []
    : S extends readonly [infer H, ...infer T]
      ? H extends GenericSchema
        ? T extends readonly GenericSchema[]
          ? [InferInput<H>, ...InferArgsType<T>]
          : never
        : never
      : never

export type InferReturnType<S extends RpcReturnSchema | undefined>
  = S extends RpcReturnSchema
    ? InferInput<S>
    : void
