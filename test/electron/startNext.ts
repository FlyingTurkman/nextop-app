import next from 'next'
import http from 'http'
import { spawn } from 'child_process'
import { NextServerHandleType } from './types'










export async function startNextServer(
    dir: string,
    dev: boolean,
    preferredPort: number = 3000
): Promise<NextServerHandleType> {

    const app = next({ dir, dev })
    const handler = app.getRequestHandler()

    await app.prepare()

    const server = http.createServer((req, res) => {
        handler(req, res)
    })

    // Önce tercih edilen portu dene; doluysa (EADDRINUSE) OS'tan boş bir port iste (port 0).
    // Sunucunun kendisi portu bağladığı için ayrı port-bulma adımıyla oluşan race-condition yoktur.
    const port = await new Promise<number>((resolve, reject) => {
        const tryListen = (candidate: number, isRetry: boolean) => {
            const onError = (error: NodeJS.ErrnoException) => {
                server.removeListener('error', onError)
                if (!isRetry && error.code === 'EADDRINUSE') {
                    tryListen(0, true)
                } else {
                    reject(error)
                }
            }

            server.once('error', onError)
            // Yalnızca 127.0.0.1'e bind et: sunucu LAN'a açılmasın, sadece bu makineden erişilsin.
            server.listen(candidate, '127.0.0.1', () => {
                server.removeListener('error', onError)
                const address = server.address()
                resolve(typeof address === 'object' && address ? address.port : candidate)
            })
        }

        tryListen(preferredPort, false)
    })

    return {
        port,
        close: async () => {
            await new Promise<void>((resolve) => server.close(() => resolve()))
        }
    }
}