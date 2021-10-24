var app = require('express')()
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var fs = require('fs');

//필요함수 정의
function readHTML(name){ //html 읽기
    html = fs.readFileSync('html/' + name + '.html', 'utf-8');
    return html
}
function removeTag(text){ //태그 지우기
  return text.replaceAll('<', '&lt').replaceAll('>', '&gt')
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
  socket.on('chat', (data)=>{
    var msgData = {
      nickname: removeTag(data.nickname),
      msg: removeTag(data.msg)
    }
    console.log(msgData.nickname + ": " + msgData.msg)
    io.emit('newchat', msgData)
  })
})

//css 라우팅
app.get('/css/:name', function(request, response) {
  response.send(fs.readFileSync('css/' + request.params.name))
});

//js 라우팅
app.get('/js/:name', function(request, response) {
  response.send(fs.readFileSync('js/' + request.params.name))
});
 
server.listen(80, function() {
  console.log('Example app listening on port 80!')
});