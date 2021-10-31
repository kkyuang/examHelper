var app = require('express')()
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var fs = require('fs');
var crypto = require('crypto');
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var session = require('express-session');
const { json, request } = require('express');
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
//랜덤
function rand(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
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
function newChoice(uid){
    //처음 하는것인가요?
    if(!fs.existsSync(`users/${uid}/choice`)){
      fs.mkdirSync(`users/${uid}/choice`)
      var words = JSON.parse(fs.readFileSync('js/data.json', 'utf-8'));
      var wordsMungtange = []
      //5개의 뭉탱이
      for(var i = 0; i < 5; i++){
        wordsMungtange[i] = []
        for(var j = 0; j < (words.length / (5 - i)); j++){
          var num = rand(0, words.length)
          wordsMungtange[i][j] = words[num]
          words.splice(num, 1);
        }
        //파일저장
        fs.writeFileSync(`users/${uid}/choice/${i}.json`, JSON.stringify(wordsMungtange[i]))
      }
    }
}
function saveReview(uid, wrongAnswers){
  //처음 하는것인가요?
  if(!fs.existsSync(`users/${uid}/choice/review.json`)){
    //파일저장
    fs.writeFileSync(`users/${uid}/choice/review.json`, JSON.stringify(wrongAnswers))
  }
  else{
    var oldWrongAnswers = fs.readFileSync(`users/${uid}/choice/review.json`, 'utf-8')
    var newWrongAnswers = oldWrongAnswers.concat(wrongAnswers)
    Array.from(new Set(newWrongAnswers))
    fs.writeFileSync(`users/${uid}/choice/review.json`, JSON.stringify(newWrongAnswers))
    //중복제거
    /*for(var i = 0 ; i < wrongAnswers.length; i++){
      var isExists = false
      for(var j = 0; j < oldWrongAnswers; j++){
        if(wrongAnswers[i] == oldWrongAnswers[j]){
          isExists = true
          break
        }
      }
      if(!isExists){
        newWrongAnswers[newWrongAnswers.length] = wrongAnswers[i]
      }
    }*/

  }
}

function setReview(uid, wrongAnswers){
  //처음 하는것인가요?
  if(!fs.existsSync(`users/${uid}/choice/review.json`)){
    //파일저장
    fs.writeFileSync(`users/${uid}/choice/review.json`, JSON.stringify(wrongAnswers))
  }
  else{
    var newWrongAnswers = wrongAnswers
    fs.writeFileSync(`users/${uid}/choice/review.json`, JSON.stringify(newWrongAnswers))
  }
}

function saveChoiceRecord(uid, CATR){
  //처음 하는것인가요?
  if(!fs.existsSync(`users/${uid}/choice/record.json`)){
    //파일저장
    data = {
      CATR:CATR
    }
    fs.writeFileSync(`users/${uid}/choice/record.json`, JSON.stringify(data))
  }
  else{
    record = JSON.parse(fs.readFileSync(`users/${uid}/choice/record.json`, 'utf-8')).CATR
    if(record < CATR){
      //파일저장
      data = {
        CATR:CATR
      }
      fs.writeFileSync(`users/${uid}/choice/record.json`, JSON.stringify(data))
    }
  }
}

function saveChoiceRank(uid, CATR){
  //처음 하는것인가요?
  if(!fs.existsSync(`data/choice/rank.json`)){
    fs.mkdirSync('data/choice')
    //파일저장
    data = [
      {
        CATR: CATR,
        user_id:uid
      }
    ]
    fs.writeFileSync(`data/choice/rank.json`, JSON.stringify(data))
  }
  else{
    ranks = JSON.parse(fs.readFileSync(`data/choice/rank.json`, 'utf-8'))

    function isSameMe(element){
      if(element.user_id == uid){
        return true
      }
    }
    
    //내 예전기록이 있는지?
    var sameMe = ranks.indexOf(ranks.find(isSameMe))
    //있고 그 기록이 지금보다 작으면 새로 고침
    if(sameMe != -1){
      if(ranks[sameMe].CATR < CATR){
        ranks[sameMe].CATR = CATR
      }
    }
    else{ //없으면 새로 추가
      ranks[ranks.length] = 
      {
        CATR: CATR,
        user_id:uid
      }
    }
    //정렬 
    ranks.sort(function (a, b) { 
      return a.CATR < b.CATR ? -1 : a.CATR > b.CATR ? 1 : 0;  
    });
    fs.writeFileSync(`data/choice/rank.json`, JSON.stringify(ranks))
  }
}

function getChoiceRank(rank){
  //처음 하는것인가요?
  if(!fs.existsSync(`data/choice/rank.json`)){
    return {
      CATR:0,
      user_id:null
    }
  }
  else{
    ranks = JSON.parse(fs.readFileSync(`data/choice/rank.json`, 'utf-8'))
    return ranks[rank]
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
app.get('/choice-prepare', function(request, response) {
  if(request.session.logined == true){
    //초기 설정
    uid = request.session.user_id
    newChoice(uid)
    var html = readHTML('choice-prepare').replace('로그인하지 않음', request.session.user_id)
  }
  else{
    var html = readHTML('choice-prepare') + '<script>alert("먼저 로그인 해 주세요"); location.replace("/")</script>'
  }
  response.send(html)
});

//객관식 모드
app.get('/choice/:num', function(request, response) {
  if(request.session.logined == true){
    //초기 설정
    uid = request.session.user_id
    newChoice(uid)
    var stageName = ((request.params.num * 1) + 1)

    isNormal = true
    reviewVariable = ''
    if(request.params.num == 'review'){
      stageName = '틀린 문제 복습'
      reviewVariable = 'var isReview = true'
      if(fs.existsSync(`users/${uid}/choice/review.json`)){
        if(JSON.parse(fs.readFileSync(`users/${uid}/choice/review.json`, 'utf-8')).length == 0){
          var html = readHTML('choice') + '<script>alert("틀린 문제를 모두 복습했습니다 :)"); location.replace("/choice-prepare")</script>'
          isNormal = false
        }
      }
      else{
        isNormal = false
        var html = readHTML('choice') + '<script>alert("먼저 객관식 파트를 학습해 주세요"); location.replace("/choice-prepare")</script>'
      }
    }

    if(isNormal){
      var html = readHTML('choice').replace('${num}', stageName) + `<script>var words=${fs.readFileSync(`users/${uid}/choice/${request.params.num}.json`, 'utf-8')}; var myname = '${request.session.user_id}; ${reviewVariable}'</script>`
    }
  }
  else{
    var html = readHTML('choice') + '<script>alert("먼저 로그인 해 주세요"); location.replace("/")</script>'
  }
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
  socket.on('topCATRreq', (data)=>{
    //사용자 기록 저장하기
    saveReview(data.userName, data.wrongAnswers)
    saveChoiceRecord(data.userName, data.CATR)
    saveChoiceRank(data.userName, data.CATR)
    if(data.isReview == true){
      setReview(data.userName, data.wrongAnswers)
    }

    //다시 보내주기
    socket.emit('topCATRres', {
      topCATR: getChoiceRank(0).CATR,
      topCATRuser: getChoiceRank(0).user_id
    })
  })

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