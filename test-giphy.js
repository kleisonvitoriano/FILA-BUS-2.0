const https = require('https');
https.get('https://api.giphy.com/v1/gifs/search?api_key=GlVGYHqc3SyRoCbOegO25G5kG53Xk4iG&q=meme&limit=1', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data.substring(0, 200)));
});
