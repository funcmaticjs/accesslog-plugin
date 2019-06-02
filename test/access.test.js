const AccessLogPlugin = require('../lib/access')
const { ConsoleLogger } = require('@funcmaticjs/funcmatic')
const path = require('path')
const fs = require('fs')

describe('AccessLogPlugin', () => {
  let ctx = { }
  let plugin = null
  let noop = () => { }
  beforeEach(() => {
    ctx = {
      event: {
        headers: { }
      },
      context: { },
      state: { },
      logger: new ConsoleLogger()
    }
    plugin = new AccessLogPlugin()
  })
  it ('should return correct default values for empty ctx', async () => {
    await plugin.request(ctx, noop)
    expect(ctx.state.accesslog).toMatchObject({
      remote_addr: null,
      remote_user: null,
      time_local: null,
      request: null,
      status: -1,
      body_bytes_sent: 0,
      http_referer: null,
      http_user_agent: null,
      elapsed: -1
    })
  })
  it ('should populate for a complete lambda proxy integration event', async () => {
    ctx.event = JSON.parse(fs.readFileSync(path.join(__dirname, 'event.json')))
    await plugin.request(ctx, noop)
    expect(ctx.state.accesslog).toMatchObject({
      remote_addr: "127.0.0.1",
      time_local: "09/Apr/2015:12:34:56 +0000",
      request: "POST /prod/path/to/resource HTTP/1.1",
      http_user_agent: "Custom User Agent String",
      elapsed: expect.anything()
    })
  })
  it ('should populate for an authenticated user in ctx.state.auth', async () => {
    ctx.state.auth = { decoded: { name: "username", sub: "1234" } }
    await plugin.request(ctx, noop)
    expect(ctx.state.accesslog).toMatchObject({
      remote_user: "1234:username"
    })
  })
  it ('should populate for a response', async () => {
    ctx.response = {
      statusCode: 200,
      body: JSON.stringify({ hello: "world" })
    }
    await plugin.request(ctx, noop)
    expect(ctx.state.accesslog).toMatchObject({
      status: 200,
      body_bytes_sent: 17,
    })
  })
  it ('should log in error handler', async () => {
    await plugin.error(ctx, noop)
    expect(ctx.state.accesslog).toBeTruthy()
  })
})