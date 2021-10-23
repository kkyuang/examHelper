var express = require('express')
var app = express()
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var fs = require('fs');

//필요함수 정의
function readHTML(name){
    html = fs.readFileSync('html/' + name + '.html', 'utf-8');
    return html
}
 
//route, routing
//app.get('/', (req, res) => res.send('Hello World!'))
app.get('/', function(request, response) {
    html = readHTML('main')
    response.send(html)
});

//소켓 통신
io.on('connection', (socket) => {
  console.log('connected!')
})

//css 라우팅
app.get('/css/:name', function(request, response) {
  response.send(fs.readFileSync('css/' + request.params.name))
});

//js 라우팅
app.get('/js/:name', function(request, response) {
  response.send(fs.readFileSync('js/' + request.params.name))
});
 
app.listen(80, function() {
  console.log('Example app listening on port 80!')
});