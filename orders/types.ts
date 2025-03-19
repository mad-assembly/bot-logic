import { Hash } from 'viem'

export type Order = {
  hash: Hash
  salt: Hash
  signature: Hash
  sender: string
  sendAsset: Hash
  sendAmount: string
  receiver: string
  receiveAsset: Hash
  receiveAmount: string
  volume: number
}

export type Orders = Order[]
