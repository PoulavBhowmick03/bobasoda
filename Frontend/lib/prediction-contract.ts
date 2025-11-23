import type { Abi } from 'viem'
import { CONTRACT_ABI } from '../abi (1)'

export const PREDICTION_ADDRESS = (
  process.env.NEXT_PUBLIC_PREDICTION_CONTRACT as `0x${string}` | undefined
) ?? ('0x3D7A623Ce81d4f406b19002A17f946DaE41D4115' as const)

export const PREDICTION_ABI = CONTRACT_ABI as Abi
