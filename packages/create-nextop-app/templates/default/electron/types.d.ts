export type NextServerHandleType = {
    port: number
    close: () => Promise<void>
}