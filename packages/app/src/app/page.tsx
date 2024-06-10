'use client'

import { CardList } from '@/components/CardList'
import { SITE_DESCRIPTION, SITE_NAME } from '@/utils/site'
import { POEM_ITEMS } from './examples/examples'
import { useAccount } from 'wagmi'
import { useEffect } from 'react'
import { redirect } from 'next/navigation'

export default function Home() {
  const { address, status } = useAccount()

  useEffect(() => {
    if (status == 'connected') {
      redirect('/gift?byAddress=' + address)
    }
  }, [status])

  return (
    <>
      <h2 className='text-2xl mb-2'>{SITE_NAME}</h2>
      <p>{SITE_DESCRIPTION}</p>

      <div className='mt-4'>
        <CardList items={POEM_ITEMS} />
      </div>
    </>
  )
}
