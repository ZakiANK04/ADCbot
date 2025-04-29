var http = require('http');

http.createServer(fucntion(req, res) {
  res.write("I'm alive");
  res.end();
}).listen(8080);
