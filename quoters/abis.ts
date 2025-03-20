const UNISWAP_V3_ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          {
            internalType: 'bytes',
            name: 'path',
            type: 'bytes',
          },
          {
            internalType: 'address',
            name: 'recipient',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'deadline',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'amountIn',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'amountOutMinimum',
            type: 'uint256',
          },
        ],
        internalType: 'struct ISwapRouter.ExactInputParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'exactInput',
    outputs: [
      {
        internalType: 'uint256',
        name: 'amountOut',
        type: 'uint256',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'bytes',
            name: 'path',
            type: 'bytes',
          },
          {
            internalType: 'address',
            name: 'recipient',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'deadline',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'amountOut',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'amountInMaximum',
            type: 'uint256',
          },
        ],
        internalType: 'struct ISwapRouter.ExactOutputParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'exactOutput',
    outputs: [
      {
        internalType: 'uint256',
        name: 'amountIn',
        type: 'uint256',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
] as const

const UNISWAP_V3_FACTORY_ABI = [
  {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint24', name: '', type: 'uint24' },
    ],
    name: 'getPool',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

const UNISWAP_V3_POOL_ABI = [
  {
    inputs: [],
    name: 'liquidity',
    outputs: [{ internalType: 'uint128', name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

const UNISWAP_QUOTER_ABI = [
    {
      inputs: [
        { internalType: 'bytes', name: 'path', type: 'bytes' },
        {
          internalType: 'uint256',
          name: 'amountIn',
          type: 'uint256',
        },
      ],
      name: 'quoteExactInput',
      outputs: [
        { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
        {
          internalType: 'uint160[]',
          name: 'sqrtPriceX96AfterList',
          type: 'uint160[]',
        },
        {
          internalType: 'uint32[]',
          name: 'initializedTicksCrossedList',
          type: 'uint32[]',
        },
        { internalType: 'uint256', name: 'gasEstimate', type: 'uint256' },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        { internalType: 'bytes', name: 'path', type: 'bytes' },
        {
          internalType: 'uint256',
          name: 'amountOut',
          type: 'uint256',
        },
      ],
      name: 'quoteExactOutput',
      outputs: [
        { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
        {
          internalType: 'uint160[]',
          name: 'sqrtPriceX96AfterList',
          type: 'uint160[]',
        },
        {
          internalType: 'uint32[]',
          name: 'initializedTicksCrossedList',
          type: 'uint32[]',
        },
        { internalType: 'uint256', name: 'gasEstimate', type: 'uint256' },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
] as const

export { UNISWAP_V3_FACTORY_ABI, UNISWAP_V3_ROUTER_ABI, UNISWAP_V3_POOL_ABI, UNISWAP_QUOTER_ABI }
