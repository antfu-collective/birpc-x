import type { AliceFunctions, BobFunctions } from './shared-types'
import { createBirpc } from 'birpc'
import { describe, expect, it } from 'vitest'
import { aliceCollector } from './alice'
import { bobCollector } from './bob'

describe('should', () => {
  const messageChannel = new MessageChannel()
  const bobToAlice = createBirpc<AliceFunctions, BobFunctions>(
    bobCollector.functions,
    {
      post: (msg) => {
        messageChannel.port2.postMessage(msg)
      },
      on: (cb) => {
        messageChannel.port2.on('message', cb)
      },
    },
  )
  const aliceToBob = createBirpc<BobFunctions, AliceFunctions>(
    aliceCollector.functions,
    {
      post: (msg) => {
        messageChannel.port1.postMessage(msg)
      },
      on: (cb) => {
        messageChannel.port1.on('message', (event) => {
          cb(event)
        })
      },
    },
  )

  it('works', async () => {
    expect(bobCollector.functions).toMatchInlineSnapshot(`
      {
        "getMoney": Promise {},
        "takeMoney": Promise {},
      }
    `)
    expect(aliceCollector.functions).toMatchInlineSnapshot(`
      {
        "buyApples": Promise {},
        "getAppleCount": Promise {},
        "getBalance": Promise {},
      }
    `)

    expect(await aliceToBob.getMoney()).toBe(50)
    expect(await bobToAlice.getBalance()).toBe(101)

    expect(await bobToAlice.getAppleCount()).toBe(5)

    await bobToAlice.buyApples(3)

    expect(await bobToAlice.getAppleCount()).toBe(2)
    expect(await bobToAlice.getBalance()).toBe(107)

    await expect(() => bobToAlice.buyApples(3))
      .rejects
      .toThrowErrorMatchingInlineSnapshot(`[Error: Insufficient apples]`)

    // @ts-expect-error missing types
    await expect(() => aliceToBob.foo())
      .rejects
      .toThrowErrorMatchingInlineSnapshot(`[Error: [birpc] function "foo" not found]`)

    // Call handlers directly
    expect(bobCollector.getHandler('getMoney')).toBeDefined()
    expect(
      await aliceCollector
        .getHandler('getBalance')
        .then(handler => handler()),
    )
      .toBe(107)
  })
})
