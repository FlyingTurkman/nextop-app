import Image from 'next/image'
import Link from 'next/link'









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
            <Link
            href={'https://github.com/FlyingTurkman/nextop-app'}
            className='underline text-lg font-semibold'
            about='_blank'
            >
                NextOP
            </Link>
        </main>
    )
}