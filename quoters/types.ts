import { Hash } from 'viem'
import { Order } from 'orders/types'

export type Quote = {
  calldata: Hash
  address: Hash
}

export type QuoteResult = {
  quote: Quote
  order: Order
}

export type QuoteResults = QuoteResult[]
