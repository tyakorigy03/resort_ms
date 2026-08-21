const EventEmitter = require('events')

class SSEManager extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(0)
    this.clients = new Map()
    this.nextId = 1
  }

  addClient(res, filter = null) {
    const id = this.nextId++
    const client = { id, res, filter }
    this.clients.set(id, client)

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    res.write(':ok\n\n')
    res.flushHeaders()

    const heartbeat = setInterval(() => {
      try { res.write(':heartbeat\n\n') } catch { this.removeClient(id) }
    }, 15000)

    res.on('close', () => {
      clearInterval(heartbeat)
      this.removeClient(id)
    })

    return id
  }

  removeClient(id) {
    const client = this.clients.get(id)
    if (client) {
      this.clients.delete(id)
      try { client.res.end() } catch {}
    }
  }

  broadcast(event, data, filterFn) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    for (const [, client] of this.clients) {
      if (filterFn && !filterFn(client)) continue
      try { client.res.write(payload) } catch { this.removeClient(client.id) }
    }
  }

  sendOrderUpdate(orderId, data) {
    this.broadcast('order-update', { orderId, ...data })
  }

  broadcastOrderChanged(orderId) {
    this.sendOrderUpdate(orderId, { type: 'changed' })
  }
}

const sse = new SSEManager()
module.exports = sse
