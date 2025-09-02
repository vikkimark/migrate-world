import http from 'http';
const req = http.request({ host: 'localhost', port: process.env.PORT || 3000, path: '/api/health', method: 'GET' }, res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    try {
      const j = JSON.parse(data);
      if (j.ok) { console.log('Healthcheck ok ✅'); process.exit(0); }
    } catch (e) {}
    console.error('Healthcheck failed ❌');
    process.exit(1);
  });
});
req.on('error', () => { console.error('Healthcheck error ❌'); process.exit(1); });
req.end();
