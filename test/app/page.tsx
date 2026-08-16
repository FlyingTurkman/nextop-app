'use client'

import Image from 'next/image'
import Link from 'nextop-app/link'
import type { ReactNode } from 'react'

export default function Page() {
    return (
        <>
            <div className="backdrop" />
            <div className="dots" />

            {/* Top bar */}
            <header className="relative z-10 flex h-12 items-center justify-between px-5 select-none">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-accent text-[10px] font-black text-black">N</span>
                    <span className="font-mono text-xs tracking-wide text-white/50">nextop / app</span>
                </div>
                <span className="font-mono text-xs text-white/35">v1</span>
            </header>

            <main className="relative z-10 mx-auto w-full max-w-5xl px-5 pb-16 pt-6 sm:pt-12">
                {/* Hero */}
                <div className="reveal flex flex-col items-start gap-5">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-3 py-1 font-mono text-[11px] text-white/55">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        next.js server · running on 127.0.0.1
                    </span>
                    <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
                        Desktop apps, built the
                        <span className="bg-linear-to-r from-accent to-amber-300 bg-clip-text text-transparent"> Next.js way</span>
                        <span className="caret text-accent">_</span>
                    </h1>
                    <p className="max-w-xl text-base leading-relaxed text-white/50">
                        App Router, Server Components and API routes — running live inside Electron,
                        with native APIs one hook away. Secure by default.
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                        <Link isExternal href="https://github.com/FlyingTurkman/nextop-app" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90">
                            Star on GitHub
                            <span aria-hidden>↗</span>
                        </Link>
                        <Link isExternal href="https://nextopapp.vercel.app" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
                            Docs
                            <span aria-hidden>↗</span>
                        </Link>
                        <span className="font-mono text-xs text-white/40">
                            edit <span className="text-accent">app/</span>page.tsx
                        </span>
                    </div>
                </div>

                {/* Bento grid */}
                <div className="reveal mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:grid-rows-2" style={{ animationDelay: '120ms' }}>
                    {/* Brand tile */}
                    <div className="tile tile-glow flex flex-col justify-between p-6 sm:row-span-2">
                        <div className="flex items-center justify-between">
                            <Image src="/favicon.png" width={48} height={48} alt="NextOP" priority />
                            <span className="kbd">React 19</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">NextOP</h2>
                            <p className="mt-2 text-sm leading-relaxed text-white/45">
                                The fullstack React framework for the desktop. One codebase, real
                                Next.js on the inside, a native shell on the outside.
                            </p>
                        </div>
                    </div>

                    <FeatureTile
                        label="Filesystem"
                        title="Sandboxed file access"
                        desc="Root-scoped reads & writes via useFs — path traversal blocked by default."
                        icon={<FileIcon />}
                        className="sm:col-span-2"
                    />

                    <FeatureTile
                        label="Native API"
                        title="Notifications & more"
                        desc="Clipboard, shell, menus and secure storage as React hooks."
                        icon={<BellIcon />}
                    />

                    <FeatureTile
                        label="Hardened"
                        title="Secure by default"
                        desc="Context isolation, sandbox and navigation guards out of the box."
                        icon={<ShieldIcon />}
                    />
                </div>
            </main>
        </>
    )
}

function FeatureTile({ label, title, desc, icon, className = '' }: { label: string; title: string; desc: string; icon: ReactNode; className?: string }) {
    return (
        <div className={`tile group flex flex-col justify-between p-5 ${className}`}>
            <div className="flex w-full items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/70 ring-1 ring-white/10 transition group-hover:bg-accent group-hover:text-black">
                    {icon}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/30">{label}</span>
            </div>
            <div className="mt-6">
                <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-white/40">{desc}</p>
            </div>
        </div>
    )
}

function FileIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
        </svg>
    )
}

function BellIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
    )
}

function ShieldIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    )
}
