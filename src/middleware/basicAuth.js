function basicAuth(req, res, next) {
  const user = process.env.DASHBOARD_USER || 'admin';
  const pass = process.env.DASHBOARD_PASSWORD || '';

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    const u = decoded.slice(0, idx);
    const p = decoded.slice(idx + 1);
    if (u === user && p === pass) return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="FB AI Manager"');
  return res.status(401).send('Yêu cầu đăng nhập.');
}

module.exports = basicAuth;
