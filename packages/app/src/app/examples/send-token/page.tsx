'use client'
import {
  useAccount,
  useBalance,
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from 'wagmi'
import { isAddress } from 'viem'
import erc721Abi from '@/utils/erc721'
import { useState, useEffect } from 'react'
// import { parseEther } from 'viem'
import { useNotifications } from '@/context/Notifications'
import Token from '@/assets/icons/token.png'
import { AddressInput } from '@/components/AddressInput'
import { TokenBalance } from '@/components/TokenBalance'
import { TokenQuantityInput } from '@/components/TokenQuantityInput'
import { formatBalance } from '@/utils/formatBalance'
import Image from 'next/image'

type Address = `0x${string}` | undefined
type Meta = {
  description: string
  //  "https://friend.turkmenson.com/gift/byAddress=0xE9eA95de2D8f7696ba390B57ac5BA73873be5571",
  external_url: string
  // "https://friend.turkmenson.com/meta/alex.jpg",
  image: string
  name: string
  attributes?: any
}

const loadingMeta: Meta = {
  description: '',
  external_url: 'https://friend.turkmenson.com/gift',
  image: '',
  name: 'NFT is loading...',
  attributes: [],
}

export default function SendToken() {
  const [to, setTo] = useState<Address>(undefined)
  const tokenAddress = process.env.NEXT_PUBLIC_FRIEND_NFT_ADDRESS! as Address
  const [nftMeta, setNftMeta] = useState<Meta>(loadingMeta)
  const [isValidToAddress, setIsValidToAddress] = useState<boolean>(false)

  const { Add } = useNotifications()

  const { address, chain } = useAccount()

  const { data: tokenId } = useReadContract({
    query: {
      enabled: address != undefined,
    },
    address: tokenAddress,
    abi: erc721Abi,
    functionName: 'tokenOfOwnerByIndex',
    args: [address!, 0],
  })

  const { data: tokenURI } = useReadContract({
    query: {
      enabled: tokenId != undefined && String(tokenId).length > 0,
    },
    address: tokenAddress,
    abi: erc721Abi,
    functionName: 'tokenURI',
    args: [tokenId],
  })

  useEffect(() => {
    if (tokenURI == undefined) {
      return
    }
    console.log(`Fetching ... ${tokenURI}`)
    fetch(String(tokenURI))
      .then((res) => {
        return res.json()
      })
      .then((data) => {
        console.log(data)
        var meta = data as Meta
        setNftMeta(meta)
      })
  }, [tokenURI])

  useEffect(() => {
    console.log(
      `State of address was changed, is it undefined? ${address == undefined}, is to undefined? ${to == undefined}`
    )
    if (to == undefined) {
      setIsValidToAddress(true)
      setTo(address)
    }
  }, [address])

  console.log(`Address: ${address}`)
  console.log(`User's first tokenID: ${tokenId}, Enable token ID fetching? ${address != undefined}`)
  console.log(`tokenURI: ${tokenURI}, Enable token URI fetching? ${tokenId != undefined && String(tokenId).length > 0}`)

  const { error: estimateError } = useSimulateContract({
    address: isValidToAddress ? tokenAddress : undefined,
    abi: erc721Abi,
    functionName: 'safeTransferFrom',
    args: [address!, to!, BigInt(1)],
  })

  const { data, writeContract } = useWriteContract()

  const {
    isLoading,
    error: txError,
    isSuccess: txSuccess,
  } = useWaitForTransactionReceipt({
    hash: data,
  })

  const handleSendTransation = () => {
    if (estimateError) {
      Add(`Transaction failed: ${estimateError.cause}`, {
        type: 'error',
      })
      return
    }
    writeContract({
      address: tokenAddress!,
      abi: erc721Abi,
      functionName: 'safeTransferFrom',
      args: [address!, to!, BigInt(1)],
    })
  }

  /*const handleTokenAddressInput = (token: string) => {
    if (token.startsWith('0x')) setTokenAddress(token as `0x${string}`)
    else setTokenAddress(`0x${token}`)
    setIsValidTokenAddress(isAddress(token))
  }*/

  const handleToAdressInput = (to: string) => {
    console.log(`HandleToAddressInput`)
    if (to.startsWith('0x')) setTo(to as `0x${string}`)
    else setTo(`0x${to}`)
    setIsValidToAddress(isAddress(to))
  }

  useEffect(() => {
    if (txSuccess) {
      Add(`Transaction successful`, {
        type: 'success',
        href: chain?.blockExplorers?.default.url ? `${chain.blockExplorers.default.url}/tx/${data}` : undefined,
      })
    } else if (txError) {
      Add(`Transaction failed: ${txError.cause}`, {
        type: 'error',
      })
    }
  }, [txSuccess, txError])

  return (
    <div className='flex justify-center'>
      <div className='card w-96 bg-base-100 shadow-xl'>
        <figure className='px-10 pt-10'>
          {nftMeta.description.length == 0 ? (
            <div className='skeleton w-32 h-32'></div>
          ) : (
            <Image src={nftMeta.image} width={500} height={500} alt={nftMeta.name} style={{ display: 'inline' }} />
          )}
        </figure>
        <div className='card-body items-center text-center'>
          <h2 className='card-title'>{nftMeta.name}</h2>
          <p>Burn your NFT to win a reward</p>
          <div className='card-actions'>
            <label className='form-control w-full max-w-xs'>
              <div className='label py-2'>
                <span className='label-text'>Recipient address</span>
              </div>
              <AddressInput
                onRecipientChange={handleToAdressInput}
                type='text'
                className={`input input-bordered w-full max-w-xs ${
                  !isValidToAddress && to != undefined ? 'input-error' : ''
                }`}
                value={to}
              />
            </label>
            <button
              className='btn btn-wide btn-primary w-[100%] mt-1'
              onClick={handleSendTransation}
              disabled={!tokenId || !isValidToAddress || !address || Boolean(estimateError)}>
              {isLoading ? <span className='loading loading-dots loading-sm'></span> : 'Get your Tokens'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
