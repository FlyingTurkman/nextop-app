import next from 'next'
import http from 'http'
import { spawn } from 'child_process'
import { NextServerHandleType } from './types'










export async function startNextServer(
    dir: string,
    dev: boolean,
    port: number
): Promise<NextServerHandleType> {

    const app = next({ dir, dev })
    const handler = app.getRequestHandler()
    
    await app.prepare()

    const server = http.createServer((req, res) => {
        handler(req, res)
    })

    await new Promise<void>((resolve) => {

        server.listen(port, () => resolve())
    })

    return {
        port,
        close: async () => {
            await new Promise<void>((resolve) => server.close(() => resolve()))
        }
    }
}