import axios from 'axios'
import { getAddress, Hash } from 'viem'

import Cacher from 'utils/casher'

import { PriceResponse } from './types'

const API_PRICE_URL = 'https://api.1inch.dev/price/v1.1/1'
const API_PRICE_CACHE_TIME = 5 * 60 * 1000

const API_KEY = 'JCal5tB5HMRzgC76x4UekjB320ieQQlT' // TODO: .env

const inchApiRequestHeaders = {
  Authorization: `Bearer ${API_KEY}`,
}

async function priceFetcher(tokens: Hash[]) {
  const url = `${API_PRICE_URL}/${tokens.join(',')}`

  const config = {
    headers: inchApiRequestHeaders,
    params: {
      currency: 'USD',
    },
  }

  try {
    const response = await axios.get<PriceResponse>(url, config)
    console.log('Fetched token prices:', response.data)
    return Object.entries(response.data).reduce<PriceResponse>((acc, [key, value]) => {
      acc[getAddress(key)] = value
      return acc
    }, {})
  } catch (error) {
    console.error('Error fetching token prices:', error)
    return {}
  }
}

const pricesCacher = new Cacher<Hash[], Promise<PriceResponse>>(API_PRICE_CACHE_TIME, async (tokens: Hash[]) =>
  priceFetcher(tokens),
)

async function fetchAssetsPrices(tokens: Hash[]) {
  return await pricesCacher.get(tokens)
}

export default fetchAssetsPrices
