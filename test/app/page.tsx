'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useFs, useWindow } from 'nextop-app'








export default function Page() {

    const { writeFile } = useFs()
    const { close, maximize, minimize } = useWindow()

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
                For contrubition <Link href={'https://github.com/FlyingTurkman/nextop-app'} className='underline text-lg font-semibold'>NextOP</Link>
            </label>
            <button
            className='p-2 bg-[#1a1a1a] text-white rounded-md cursor-pointer'
            onClick={() => {
                writeFile('nextop.txt', 'This is a text file created by nextop')
            }}
            >
                Create a text file
            </button>
            <div
            className='flex flex-row items-center gap-4'
            >
                <button
                className='p-2 bg-[#1a1a1a] text-white rounded-md cursor-pointer'
                onClick={() => {
                    minimize()
                }}
                >
                    Minimize
                </button>
                <button
                className='p-2 bg-[#1a1a1a] text-white rounded-md cursor-pointer'
                onClick={() => {
                    maximize()
                }}
                >
                    Maximize
                </button>
                <button
                className='p-2 bg-[#1a1a1a] text-white rounded-md cursor-pointer'
                onClick={() => {
                    close()
                }}
                >
                    Close
                </button>

            </div>
        </main>
    )
}