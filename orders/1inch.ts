import axios from 'axios'
import { getAddress, Hash } from 'viem'

import { Order, Orders } from 'orders/types'

import Cacher from 'utils/casher'

type Fetch1InchOrderBookInput = {
  page: number
  takerAsset: Hash
  makerAsset: Hash
}

type OrderData = {
  makerAsset: Hash
  takerAsset: Hash
  salt: Hash
  receiver: Hash
  makingAmount: string
  takingAmount: string
  maker: Hash
  extension: string
  makerTraits: string
}

type InchOrder = {
  orderHash: Hash
  createDateTime: string
  remainingMakerAmount: string
  makerBalance: string
  makerAllowance: string
  data: OrderData
  makerRate: string
  takerRate: string
  isMakerContract: boolean
  orderInvalidReason: null | string
  signature: Hash
}

export type InchOrders = InchOrder[]

const API_CALL_LIMIT = 500
const API_CALL_DELAY = 1000
const API_URL = 'https://api.1inch.dev/orderbook/v4.0/1/all'
const API_KEY = 'JCal5tB5HMRzgC76x4UekjB320ieQQlT' // TODO: .env

const API_PRICE_URL = 'https://api.1inch.dev/price/v1.1/1'
const API_PRICE_CACHE_TIME = 5 * 60 * 1000

const inchApiRequestHeaders = {
  Authorization: `Bearer ${API_KEY}`,
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetch1InchOrderBook(
  payload: Fetch1InchOrderBookInput,
  names: Record<Hash, string>,
): Promise<InchOrder[]> {
  const config = {
    headers: inchApiRequestHeaders,
    params: {
      ...payload,
      statuses: '1',
      limit: API_CALL_LIMIT,
    },
  }

  try {
    const response = await axios.get<InchOrders>(API_URL, config)
    console.log(
      `Fetched page ${payload.page} for pair: ${names[payload.takerAsset]} -> ${names[payload.makerAsset]}, orders: ${
        response.data.length
      }`,
    )
    return response.data
  } catch (error) {
    console.error(
      `Error fetching page ${payload.page} for pair: ${names[payload.takerAsset]} -> ${names[payload.makerAsset]}`,
      error,
    )
    return []
  }
}

async function fetchAllOrdersForPair(
  takerAsset: Hash,
  makerAsset: Hash,
  names: Record<Hash, string>,
): Promise<InchOrder[]> {
  let page = 1
  let allOrders: InchOrder[] = []

  while (true) {
    await sleep(API_CALL_DELAY)
    const orders = await fetch1InchOrderBook({ takerAsset, makerAsset, page }, names)

    allOrders.push(...orders)
    if (orders.length < API_CALL_LIMIT) break
    page++
  }

  return allOrders
}

function createPairs(tokens: Hash[], sendAsset?: Hash) {
  const pairs = []
  if (sendAsset) {
    for (let i = 0; i < tokens.length; i++) {
      const takerAsset = tokens[i]

      if (takerAsset === sendAsset) {
        continue
      }

      pairs.push([sendAsset, takerAsset])
    }
  } else {
    for (let i = 0; i < tokens.length; i++) {
      for (let j = 0; j < tokens.length; j++) {
        const takerAsset = tokens[i]
        const makerAsset = tokens[j]
        if (i !== j) {
          pairs.push([makerAsset, takerAsset])
        }
      }
    }
  }
  return pairs
}

async function fetchAllPairs(tokens: Hash[], names: Record<Hash, string>, sendAsset?: Hash): Promise<InchOrders> {
  const allOrders: InchOrders = []
  const pairs = createPairs(tokens, sendAsset)

  for (let i = 0; i < pairs.length; i++) {
    const [makerAsset, takerAsset] = pairs[i]

    const ordersForPair = await fetchAllOrdersForPair(takerAsset, makerAsset, names)
    allOrders.push(...ordersForPair)

    console.log(`Total orders fetched for ${names[takerAsset]} <-> ${names[makerAsset]}: ${ordersForPair.length}`)
  }

  return allOrders
}

// ToDo rewrite to contract https://portal.1inch.dev/documentation/contracts/spot-price-aggregator/examples
const fetchAssetsPrice = new Cacher<Hash[], Promise<Record<Hash, string>>>(
  API_PRICE_CACHE_TIME,
  async (tokens: Hash[]) => {
    const url = `${API_PRICE_URL}/${tokens.join(',')}`

    const config = {
      headers: inchApiRequestHeaders,
      params: {
        currency: 'USD',
      },
    }

    try {
      const response = await axios.get<Record<Hash, string>>(url, config)
      console.log('Fetched token prices:', response.data)
      return Object.entries(response.data).reduce<Record<Hash, string>>((acc, [key, value]) => {
        acc[getAddress(key)] = value
        return acc
      }, {})
    } catch (error) {
      console.error('Error fetching token prices:', error)
      return {}
    }
  },
)

function calculateOrderVolume(order: InchOrder, prices: Record<Hash, string>): number {
  const tokenPrice = prices[getAddress(order.data.makerAsset as Hash)] || '0'
  return parseFloat(order.remainingMakerAmount) * parseFloat(tokenPrice)
}

async function getOrders(tokens: Hash[], names: Record<Hash, string>, sendAsset?: Hash): Promise<Orders> {
  const orders = await fetchAllPairs(tokens, names, sendAsset)

  await sleep(API_CALL_DELAY)
  const prices = await fetchAssetsPrice.get<Hash[], Record<Hash, string>>(tokens)
  const prices1 = await fetchAssetsPrice.get<Hash[], Record<Hash, string>>(tokens)
  await sleep(API_CALL_DELAY)
  const prices2 = await fetchAssetsPrice.get<Hash[], Record<Hash, string>>(tokens)

  const sortedOrders = orders
    .map<Order>((order) => ({
      hash: order.orderHash,
      salt: order.data.salt,
      signature: order.signature,
      sender: getAddress(order.data.maker),
      sendAsset: getAddress(order.data.makerAsset),
      sendAmount: order.data.makingAmount,
      receiver: getAddress(order.data.receiver),
      receiveAsset: getAddress(order.data.takerAsset),
      receiveAmount: order.data.takingAmount,
      makerTraits: order.data.makerTraits,
      volume: calculateOrderVolume(order, prices),
    }))
    .sort((a, b) => b.volume - a.volume)

  return sortedOrders
}

export default getOrders
