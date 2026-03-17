'use client'

import Image from 'next/image'
import { useFs, useWindow, useMenu, useNotification, useShell, useClipboard } from 'nextop-app'
import Link from 'nextop-app/link'





export default function Page() {
    return (
        <main
        className='flex flex-col gap-4 items-center justify-center h-screen'
        >
            <h1
            className='text-xl font-semibold'
            >
                Developed by create-nextop-app
            </h1>
            <Image
            src={'/favicon.png'}
            width={256}
            height={256}
            alt='logo'
            />
            <label>
                For contrubition <Link className="font-semibold underline" isExternal={true} href={'https://github.com/FlyingTurkman/nextop-app'}>Github</Link>
            </label>
        </main>
    )
}