import React from 'react'
import Image from 'next/image'
import { LinkComponent } from './LinkComponent'
import { Connect } from './Connect'
import { NotificationsDrawer } from './NotificationsDrawer'

export function Header() {
  return (
    <header className='navbar flex justify-between p-4 pt-0'>
      <LinkComponent href='/'>
        <h1 className='text-xl font-bold'>
          <Image src='/friends.png' width={75} height={75} alt='Logo' />
        </h1>
      </LinkComponent>

      <div className='flex gap-2'>
        <Connect />
        <NotificationsDrawer />
      </div>
    </header>
  )
}
