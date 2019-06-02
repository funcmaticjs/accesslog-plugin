const objpath = require('object-path')

class AccessLogPlugin {

  async request(ctx, next) {
    await next()
    // we save this in ctx.state so that we can unit test
    ctx.state.accesslog = getLogParams(ctx)
    ctx.logger.info(ctx.state.accesslog)
  }

  async error(ctx, next) {
    await next()
    if (!ctx.state.accesslog) {
      ctx.state.accesslog = getLogParams(ctx)
      ctx.logger.error(ctx.state.accesslog)
    }
  }
}

function getLogParams(ctx) {
  return {
    remote_addr: objpath.get(ctx, "event.requestContext.identity.sourceIp", null),
    remote_user: formatUser(ctx), 
    time_local: objpath.get(ctx, "event.requestContext.requestTime", null),
    request: formatRequest(ctx),
    status: ctx.response && ctx.response.statusCode || -1,
    body_bytes_sent: calcBodyBytes(ctx),
    http_referer: objpath.get(ctx, "event.headers.Referer", null),
    http_user_agent: objpath.get(ctx, "event.requestContext.identity.userAgent", null),
    elapsed: calcElapsed(ctx)
  }
}

function formatUser(ctx) {
  let sub = objpath.get(ctx, "state.auth.decoded.sub", null)
  let name = objpath.get(ctx, "state.auth.decoded.name", null)
  if (sub && name) {
    return `${sub}:${name}`
  } 
  return sub || name || null
}

function formatRequest(ctx) {
  let method = objpath.get(ctx, "event.httpMethod", null)
  let path = objpath.get(ctx, "event.requestContext.path", null)
  let protocol = objpath.get(ctx, "event.requestContext.protocol", null)
  if (method && path && protocol) {
    return `${method} ${path} ${protocol}`
  } 
  return null
}

function calcBodyBytes(ctx) {
  return ctx.response && ctx.response.body && ctx.response.body.length || 0
}

function calcElapsed(ctx) {
  let requestTimeEpoch = objpath.get(ctx, "event.requestContext.requestTimeEpoch")
  if (!requestTimeEpoch) return -1
  return Date.now() - requestTimeEpoch
}

module.exports = AccessLogPlugin



