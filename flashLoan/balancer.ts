import { request } from 'graphql-request'
import { Hash, parseEther } from 'viem'
import Cacher from '@/utils/cacher.js'

const CASH_TIME = 5 * 60 * 1000
const SUBGRAPH_URL = 'https://gateway.thegraph.com/api/subgraphs/id/C4ayEZP2yTXRAB8vSaTrgN4m9anTe9Mdm2ViyiAuV9TV'

const headers = {
  Authorization: 'Bearer 3c026101d35bbbc4e614d6748c23a503', // ToDo .env
}

type Pool = {
  id: Hash
  tokens: Array<{ balance: string; address: Hash }>
}

type Pools = Pool[]

async function liquidityFetcher(address: Hash) {
  const query = `
    {
      pools(where: { tokensList_contains: ["${address.toLowerCase()}"], totalLiquidity_gt: 0.1 }) {
        id
        tokens(where: { address: "${address.toLowerCase()}", balance_gt: "0" }) {
          balance
          address
        }
      }
    }
  `

  const { pools } = await request<{ pools: Pools }>(SUBGRAPH_URL, query, {}, headers)

  const totalLiquidity = pools.reduce((acc, curr) => {
    return acc + parseEther(curr.tokens[0].balance)
  }, BigInt(0))

  return totalLiquidity
}

const getLiquidityCacher = new Cacher(CASH_TIME, async (address: Hash) => liquidityFetcher(address))

async function getLiquidity(address: Hash) {
  return getLiquidityCacher.get(address)
}

export default getLiquidity
