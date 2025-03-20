import { Hash } from 'viem'

export type Quote = {
  calldata: Hash
  address: Hash
}

export type QuoteResults = Quote[]
