'use client'

import Image from 'next/image'
import { useFs, useWindow, useMenu } from 'nextop-app'
import Link from 'nextop-app/link'






export default function Page() {

    const { writeFile } = useFs()
    const { close, maximize, minimize } = useWindow()
    const [menu, setMenu] = useMenu()

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
                For contrubition <Link className="font-semibold underline" isExternal={false} href={'https://github.com/FlyingTurkman/nextop-app'}>Github</Link>
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
            <button
            onClick={() => {
                setMenu([
                    {
                        label: 'Test',
                        submenu: [
                            {
                                label: 'test1'
                            }
                        ]
                    }
                ])

                console.log('Menu', menu[0])
            }}
            >
                Set Menu
            </button>
        </main>
    )
}