import { Hash, PublicClient, encodeFunctionData, getAddress } from 'viem'

import { Orders } from 'orders/types'

import { bigIntMax } from 'utils/math'
import { getSolidityTime } from 'utils/crypto'

import { QuoteResults } from './types'
import { UNISWAP_V3_FACTORY_ABI, UNISWAP_V3_POOL_ABI, UNISWAP_V3_ROUTER_ABI } from './abis'

type TradeParams = {
  receiver: Hash
  isExactOutput: boolean
  sendToken: Hash
  sendAmount?: bigint
  amountOutMinimum?: bigint
  hopToken?: Hash
  receiveToken: Hash
  receiveAmount?: bigint
  amountInMaximum?: bigint
}

type Token = {
  address: Hash
  amount: bigint
}

type GetQuoteInput = {
  receiver: Hash
  isExactOutput: boolean
  sendToken: Token & { minimalToReceive?: bigint }
  hopToken?: Hash
  receiveToken: Token & { minimalToSend?: bigint }
}

const DEADLINE_IN_MINUTES = 30

// const WETH = getAddress('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')
const UNISWAP_V3_FACTORY_ADDRESS = getAddress('0x1F98431c8aD98523631AE4a59f267346ea31F984')
const UNISWAP_V3_ROUTER_ADDRESS = getAddress('0xE592427A0AEce92De3Edee1F18E0157C05861564')

const FEE_LOW = 500
const FEE_MEDIUM = 3000
const FEE_HIGH = 10000

function encodePath(tokens: Hash[], fees: number[]) {
  let path: Hash = '0x'
  for (let i = 0; i < tokens.length - 1; i++) {
    path += tokens[i].slice(2)
    path += fees[i].toString(16).padStart(6, '0')
  }
  path += tokens[tokens.length - 1].slice(2)
  return path as Hash
}

async function getPoolLiquidity(client: PublicClient, tokenA: Hash, tokenB: Hash, fee: number): Promise<bigint> {
  const poolAddress = await client.readContract({
    address: UNISWAP_V3_FACTORY_ADDRESS,
    abi: UNISWAP_V3_FACTORY_ABI,
    functionName: 'getPool',
    args: [tokenA, tokenB, fee],
  })

  if (poolAddress === '0x0000000000000000000000000000000000000000') return 0n

  return client.readContract({
    address: poolAddress,
    abi: UNISWAP_V3_POOL_ABI,
    functionName: 'liquidity',
  })
}

async function getBestFeeTier(client: PublicClient, tokenA: Hash, tokenB: Hash): Promise<number> {
  const [poolLow, poolMedium, poolHigh] = await Promise.all([
    getPoolLiquidity(client, tokenA, tokenB, FEE_LOW),
    getPoolLiquidity(client, tokenA, tokenB, FEE_MEDIUM),
    getPoolLiquidity(client, tokenA, tokenB, FEE_HIGH),
  ])

  const liquidities = [poolLow, poolMedium, poolHigh]
  const maxLiquidity = bigIntMax(liquidities)

  return [FEE_LOW, FEE_MEDIUM, FEE_HIGH][liquidities.indexOf(maxLiquidity)]
}

async function buildPath(client: PublicClient, params: TradeParams) {
  if (!params.hopToken || params.hopToken === params.sendToken || params.hopToken === params.receiveToken) {
    const fee = await getBestFeeTier(client, params.sendToken, params.receiveToken)
    return encodePath([params.sendToken, params.receiveToken], [fee])
  }

  const fee0 = await getBestFeeTier(client, params.sendToken, params.hopToken)
  const fee1 = await getBestFeeTier(client, params.hopToken, params.receiveToken)
  return encodePath([params.sendToken, params.hopToken, params.receiveToken], [fee0, fee1])
}

async function getTradeCalldata(client: PublicClient, params: TradeParams) {
  const path = await buildPath(client, params)

  if (params.isExactOutput) {
    if (!params.receiveAmount) {
      throw new Error('receiveToken.amount (receiveAmount) is required')
    }
    const exactOutputParams = {
      path,
      recipient: params.receiver,
      amountOut: params.receiveAmount,
      amountInMaximum: params.amountInMaximum || 1n,
      deadline: getSolidityTime(DEADLINE_IN_MINUTES),
    }

    const calldata = encodeFunctionData({
      abi: UNISWAP_V3_ROUTER_ABI,
      functionName: 'exactOutput',
      args: [exactOutputParams],
    })

    return calldata
  } else {
    if (!params.sendAmount) {
      throw new Error('sendToken.amount (sendAmount) is required')
    }
    const exactInputParams = {
      path,
      recipient: params.receiver,
      amountIn: params.sendAmount,
      amountOutMinimum: params.amountOutMinimum || 1n,
      deadline: getSolidityTime(DEADLINE_IN_MINUTES),
    }

    const calldata = encodeFunctionData({
      abi: UNISWAP_V3_ROUTER_ABI,
      functionName: 'exactInput',
      args: [exactInputParams],
    })

    return calldata
  }
}

async function getQuote(
  client: PublicClient,
  { sendToken, receiveToken, hopToken, receiver, isExactOutput }: GetQuoteInput,
) {
  const params = {
    receiver,
    isExactOutput,
    sendToken: sendToken.address,
    sendAmount: sendToken.amount,
    amountOutMinimum: sendToken.minimalToReceive,
    hopToken: hopToken,
    receiveToken: receiveToken.address,
    receiveAmount: receiveToken.amount,
    amountInMaximum: receiveToken.minimalToSend,
  }

  const calldata = await getTradeCalldata(client, params)
  return {
    calldata,
    address: UNISWAP_V3_ROUTER_ADDRESS,
  }
}

async function getQuotes(client: PublicClient, receiver: Hash, isExactOutput: boolean, orders: Orders) {
  const quotes = []
  for (let i = 0; i < orders.length; i++) {
    quotes.push(
      getQuote(client, {
        receiver,
        isExactOutput,
        sendToken: {
          address: orders[i].receiveAsset,
          amount: BigInt(orders[i].receiveAmount),
          minimalToReceive: BigInt(orders[i].sendAmount),
        },
        // hopToken: orders[i].receiveAsset === WETH ? undefined : orders[i].receiveAsset,
        receiveToken: {
          address: orders[i].sendAsset,
          amount: BigInt(orders[i].sendAmount) ,
          minimalToSend: BigInt(orders[i].receiveAmount) ,
        },
      }),
    )
  }

  const dertyResults = await Promise.allSettled(quotes)
  const results = dertyResults.reduce<QuoteResults>((acc, quote, index) => {
    if (quote.status === 'fulfilled') {
      acc.push({
        quote: quote.value,
        order: orders[index],
      })
    }
    return acc
  }, [])
  return results
}

export default getQuotes
