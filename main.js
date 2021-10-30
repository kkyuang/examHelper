var app = require('express')()
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var fs = require('fs');
var crypto = require('crypto');
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var session = require('express-session');
var FileStore = require('session-file-store')(session);
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser())
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
    store : new FileStore()
  })
);

//필요함수 정의
function readHTML(name){ //html 읽기
    var html = fs.readFileSync('html/' + name + '.html', 'utf-8');
    return html
}
function removeTag(text){ //태그 지우기
  return text.replaceAll('<', '&lt').replaceAll('>', '&gt')
}
function chatCount(roomName){ //채팅수 확인
  newChatRoom(roomName)
  return JSON.parse(fs.readFileSync('data/' + roomName + '/info.json', 'utf-8')).chatCount
}
function chatCountAppend(roomName){ //채팅수 증가
  var infoData = {
    chatCount: chatCount(roomName) + 1
  }
  fs.writeFileSync('data/' + roomName + '/info.json', JSON.stringify(infoData))
  return infoData.chatCount
}
function newChatRoom(roomName){ //새로운 채팅방
  if(fs.existsSync('data/' + roomName)){
    return true
  }
  else{
    fs.mkdirSync('data/' + roomName)
    var infoData = {
      chatCount: 2
    }
    fs.writeFileSync('data/' + roomName + '/info.json', JSON.stringify(infoData))
    var startMsg = [ 
      {
        nickname: removeTag('개발자'),
        msg: removeTag('여기는 ' + roomName + ' 채팅방입니다.'),
        id: 0
      },
      {
        nickname: removeTag('개발자'),
        msg: removeTag('자유롭게 채팅해 주세요 :)'),
        id: 1
      }
    ]
    fs.writeFileSync('data/' + roomName + '/' + '0.json', JSON.stringify(startMsg))
  }
}
function chatRead(roomName, chat100){
  if(!fs.existsSync('data/' + roomName + '/' + chat100 + ".json")){
    return null
  }
  var chats = JSON.parse(fs.readFileSync('data/' + roomName + '/' + chat100 + ".json", 'utf-8'))
  return chats
}
function chatSave(roomName, msgData){ //새 채팅 내용 저장
  newChatRoom(roomName)
  var count = chatCount(roomName)
  var fileName = Math.floor(count / 100) //100의 자리 숫자
  fileName += ".json"
  if(!fs.existsSync('data/' + roomName + '/' + fileName)){
    fs.writeFileSync('data/' + roomName + '/' + fileName, '[]')
  }
  var chats = JSON.parse(fs.readFileSync('data/' + roomName + '/' + fileName, 'utf-8'))
  chats[chats.length] = msgData
  fs.writeFileSync('data/' + roomName + '/' + fileName, JSON.stringify(chats))
  chatCountAppend(roomName)
}
//암호화
function makeHash(password, salt){
  var hashPassword = crypto.createHash("sha512").update(password + salt).digest("hex");
  return hashPassword
}
//소금뿌리기
function makeSalt(){
  return Math.round((new Date().valueOf() * Math.random())) + ""
}

function newUserDir(){ 
  if(fs.existsSync('users')){
    return true
  }
  else{
    fs.mkdirSync('users')
  }
}
//유저 저장
function saveUser(UserOBJ){
  newUserDir()
  if(fs.existsSync('users/' + UserOBJ.id)){
    return false
  }
  else{
    fs.mkdirSync('users/' + UserOBJ.id)
  }
  fs.writeFileSync('users/' + UserOBJ.id + '/info.json', JSON.stringify(UserOBJ))
  return true
}
//유저 인출
function openUser(UserID){
  newUserDir()
  if(fs.existsSync('users/' + UserID)){
    return JSON.parse(fs.readFileSync('users/' + UserID + '/info.json', 'utf-8'))
  }
  else{
    return false
  }
}


//메인
app.get('/', function(request, response) {
  var html = readHTML('main')
  if(request.session.logined == true){
    html = html.replace('로그인하지 않음', request.session.user_id).replace('로그인 ←', '로그아웃 →')
  }
  response.send(html)
});

//로그인
app.get('/login', function(req, response) {
  if(req.session.logined == true){
    req.session.logined = false
    response.redirect('/')
  }
  else{
    var html = readHTML('login')
    response.send(html)
  }
});

//객관식 모드
app.get('/choice', function(request, response) {
  var html = readHTML('choice')
  response.send(html)
});

//주관식 모드
app.get('/question', function(request, response) {
  var html = readHTML('question')
  response.send(html)
});

//랭킹
app.get('/rank', function(request, response) {
  var html = readHTML('rank')
  response.send(html)
});

//채팅 서비스 이용
app.get('/chat', function(request, response) {
    var html = readHTML('chat')
    response.send(html)
});

//회원가입
app.post("/signup", function(req,res,next){
  var body = req.body;
  console.log(req.body)
  var salt = makeSalt()
  var pw = makeHash(body.password, salt)
  var newUser = {
    id: body.id,
    pw: pw,
    salt: salt
  }
  if(!saveUser(newUser)){
    res.send(readHTML('login') + '<script>alert("같은 사용자가 있습니다. 다른 닉네임으로 다시 시도해 주세요.")</script>')
  }
  else{
    req.session.user_id = body.id
    req.session.logined = true
    console.log(req.session.user_id)
    res.redirect('/');
  }
})

//로그인
app.post("/login", function(req,res,next){
  var body = req.body;
  console.log(req.body)
  var userOBJ = openUser(body.id)
  if(!userOBJ){
    res.send(readHTML('login') + '<script>alert("가입되지 않은 사용자입니다. 회원가입을 먼저 진행해 주세요.")</script>')
  }
  else{
    var salt = userOBJ.salt
    var pw = makeHash(body.password, salt)
    if(pw == userOBJ.pw){
      req.session.user_id = userOBJ.id
      req.session.logined = true
      res.redirect('/');
    }
    else{
      res.send(readHTML('login') + '<script>alert("비밀번호가 틀렸습니다. 다시 입력해 주세요.")</script>')
    }
  }
})

//소켓 통신
io.on('connection', (socket) => {
  console.log('connected!')
  var chatRoomName = '광장'

  //최근 채팅내용 전송
  now100 = Math.floor(chatCount(chatRoomName) / 100)
  if(chatCount(chatRoomName) % 100 == 0){
    now100-=1
  }
  socket.emit('chatList', {
    nowchat100: now100,
    chatList:chatRead('광장', now100)
  })

  socket.on('chat', (data)=>{
    var msgData = {
      nickname: removeTag(data.nickname),
      msg: removeTag(data.msg),
      id: chatCount(chatRoomName)
    }
    io.emit('newchat', msgData)
    console.log(msgData.nickname + ": " + msgData.msg)

    //데이터 저장하기
    chatSave(chatRoomName, msgData)
  })

  socket.on('chatListReq', (data)=>{
    socket.emit('chatListRes', chatRead(chatRoomName, data))
  })

  socket.on('name-cookie', (data) =>{ //닉네임 쿠키 저장
    //socket.cookie('nickname', data)
  })
  var nickname = socket.handshake.headers.cookie
  console.log(nickname)
})

//css 라우팅
app.get('/css/:name', function(request, response) {
  response.send(fs.readFileSync('css/' + request.params.name))
});

//js 라우팅
app.get('/js/:name', function(request, response) {
  response.send(fs.readFileSync('js/' + request.params.name))
});

//폰트 라우팅
server.listen(80, function() {
  console.log('Example app listening on port 80!')
});