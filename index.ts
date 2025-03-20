import { mainnet } from 'viem/chains'
import { createPublicClient, fallback, formatEther, getAddress, Hash, http } from 'viem'

import { Order, Orders } from 'orders/types'
import { PriceResponse } from 'prices/types'

import getOrders from 'orders/1inch'
import getQuote from 'quoters/uniswap'
import fetchAssetsPrices from 'prices/1inch'

const BOT_CONTRACT = getAddress('0x27E82Ba6AfEbf3Eee3A8E1613C2Af5987929a546')

const USDT = getAddress('0xdac17f958d2ee523a2206206994597c13d831ec7')
const WETH = getAddress('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')
const WBTC = getAddress('0x2260fac5e5542a773aa44fbcfedf7c193bc2c599')
const USDC = getAddress('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')

const NAMES: Record<Hash, string> = {
  [USDT]: 'USDT',
  [WETH]: 'WETH',
  [WBTC]: 'WBTC',
  [USDC]: 'USDC',
}

const TOKENS: Hash[] = [USDT, WETH, USDC, WBTC]

const publicClient = createPublicClient({
  chain: mainnet,
  transport: fallback(
    [http('https://lb.drpc.org/ogrpc?network=ethereum&dkey=ArwcutontEhPu970XT848ofGXh2fAIIR75YlngOF84-p')],
    { retryCount: 3, retryDelay: 1000 },
  ),
})

function calculateOrderVolume(order: Order, prices: Record<Hash, string>): number {
  const tokenPrice = prices[getAddress(order.sendAsset)] || '0'
  return parseFloat(order.receiveAmount) * parseFloat(tokenPrice)
}

function getQuoteParamsFromOrder(order: Order) {
  return {
    receiver: BOT_CONTRACT,
    isExactOutput: false,
    sendToken: {
      address: order.receiveAsset,
      amount: BigInt(order.receiveAmount),
      minimalToReceive: BigInt(order.sendAmount),
    },
    // hopToken: orders[i].receiveAsset === WETH ? undefined : orders[i].receiveAsset,
    receiveToken: {
      address: order.sendAsset,
      amount: BigInt(order.sendAmount),
      maximumToSend: BigInt(order.receiveAmount),
    },
  }
}

async function main() {
  const orders: Omit<Orders, 'volume'> = await getOrders(TOKENS, NAMES, WETH)
  const prices: PriceResponse = await fetchAssetsPrices(TOKENS)

  const sortedOrders = orders
    .map<Order>((order: Omit<Orders, 'volume'>) => ({
      ...order,
      volume: calculateOrderVolume(order, prices),
    }))
    .sort((a: Order, b: Order) => b.volume - a.volume)

  for (let i = 0; i < sortedOrders.length; i++) {
    const quote = await getQuote(publicClient, getQuoteParamsFromOrder(sortedOrders[i]))
    console.log(`QUOTE ${NAMES[sortedOrders[i].receiveAsset]} -> ${NAMES[sortedOrders[i].sendAsset]}`)

    if (BigInt(sortedOrders[i].sendAmount) >= quote.amountOut) {
      console.log('RETURN', quote.amountOut - BigInt(sortedOrders[i].sendAmount))
      continue
    }
    console.log('GOCHA', formatEther(quote.amountOut - BigInt(sortedOrders[i].sendAmount)), {
      makerAsset: sortedOrders[i].sendAsset,
      makerAmount: BigInt(sortedOrders[i].sendAmount),
      takerAsset: sortedOrders[i].receiveAsset,
      takerAmount: BigInt(sortedOrders[i].receiveAmount),
      amountOut: quote.amountOut,
    })
  }
}

main()
