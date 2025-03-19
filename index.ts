import { mainnet } from 'viem/chains'
import { createPublicClient, fallback, getAddress, Hash, http } from 'viem'

import getOrders from 'orders/1inch'
import getQuotes from 'quoters/uniswap'

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

async function main() {
  const orders = await getOrders(TOKENS, NAMES, WETH)
  console.log('orders', orders)
  const quotes = await getQuotes(publicClient, BOT_CONTRACT, false, orders)
  console.log('quotes', quotes)
}

main()
