'use client'
import { useAccount, useSimulateContract, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { formatEther, isAddress } from 'viem'
import erc721Abi from '@/utils/erc721'
import { useState, useEffect } from 'react'
// import { parseEther } from 'viem'
import { useNotifications } from '@/context/Notifications'
import { AddressInput } from '@/components/AddressInput'
import SizedConfetti from 'react-confetti'
import Image from 'next/image'
import { useWindowSize } from 'react-use'

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

type EthPrice = {
  ethereum: {
    usd: number
  }
}

const loadingMeta: Meta = {
  description: '',
  external_url: 'https://friend.turkmenson.com/gift',
  image: '',
  name: 'No NFT',
  attributes: [],
}

export default function SendToken() {
  const { width, height } = useWindowSize()
  const [to, setTo] = useState<Address>(undefined)
  const tokenAddress = process.env.NEXT_PUBLIC_FRIEND_NFT_ADDRESS! as Address
  const [nftMeta, setNftMeta] = useState<Meta>(loadingMeta)
  const [isValidToAddress, setIsValidToAddress] = useState<boolean>(false)
  const [rewardAmount, setRewardAmount] = useState<string>('0.0')
  const [runConffetti, setRunConfetti] = useState<boolean>(false)

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

  const { data: defaultReward } = useReadContract({
    address: tokenAddress,
    abi: erc721Abi,
    functionName: 'defaultReward',
    args: [],
  })

  const { data: additional } = useReadContract({
    query: {
      enabled: tokenId != undefined && String(tokenId).length > 0,
    },
    address: tokenAddress,
    abi: erc721Abi,
    functionName: 'additional',
    args: [tokenId],
  })

  useEffect(() => {
    if (tokenURI == undefined) {
      return
    }
    fetch(String(tokenURI))
      .then((res) => {
        return res.json()
      })
      .then((data) => {
        var meta = data as Meta
        setNftMeta(meta)
      })
  }, [tokenURI])

  useEffect(() => {
    if (defaultReward == undefined || additional == undefined) {
      return
    }
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
      .then((res) => {
        return res.json()
      })
      .then((data) => {
        let totalEth = parseFloat(formatEther(defaultReward as bigint)) * (Number(additional) + 1)
        var price = data as EthPrice
        var usdPrice = price.ethereum.usd * totalEth
        setRewardAmount(usdPrice.toFixed(4))
      })
  }, [defaultReward, additional])

  useEffect(() => {
    if (to == undefined) {
      setIsValidToAddress(true)
      setTo(address)
    }
  }, [address])

  const { error: estimateError } = useSimulateContract({
    query: {
      enabled: tokenId !== undefined && to != undefined,
    },
    address: isValidToAddress ? tokenAddress : undefined,
    abi: erc721Abi,
    functionName: 'burn',
    args: [tokenId, to!],
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
      functionName: 'burn',
      args: [tokenId, to!],
    })
  }

  const handleToAdressInput = (to: string) => {
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

      setRunConfetti(true)

      let sucessModal = document.getElementById('successModal')
      ;(sucessModal as any).showModal()

      setNftMeta(loadingMeta)
    } else if (txError) {
      Add(`Transaction failed: ${txError.cause}`, {
        type: 'error',
      })
    }
  }, [txSuccess, txError])

  return (
    <>
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
            {additional == undefined ? (
              ''
            ) : (
              <p>
                Up to {parseFloat(formatEther(defaultReward as bigint)) * (Number(additional) + 1)} ETH ({rewardAmount}
                $)
              </p>
            )}
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
      {width && height && runConffetti ? (
        <SizedConfetti
          className='absolute'
          id='confetti'
          width={width}
          height={height}
          run={runConffetti}
          recycle={false}
          numberOfPieces={250}
          wind={0}
          gravity={0.1}
          opacity={100}></SizedConfetti>
      ) : (
        ' '
      )}
      <dialog id='successModal' className='modal'>
        <div className='modal-box'>
          <h3 className='font-bold text-lg'>Close the page!</h3>
          <p className='py-4'>You tokens will appear in your account in a short period of time</p>
          <div className='modal-action'>
            <form method='dialog'>
              <button className='btn'>Close</button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  )
}
