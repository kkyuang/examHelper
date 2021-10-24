function blankCheck(text, alertmsg){
    if(text == '' || text == null ){
        alert(alertmsg);
        return false;
    }
    var blank_pattern = /^\s+|\s+$/g;
    if(text.replace( blank_pattern, '' ) == "" ){
        alert(alertmsg);
        return false;
    }
    return true
}

function scrollBottom(){
    $('#chat-scrolls').scrollTop($('#chat-scrolls')[0].scrollHeight)
}

function sendChat(socket){
    //데이터 체크
    var msg = $("#message-input").val()
    var nickname = $("#name-input").val()
    
    if(!blankCheck(msg, '내용을 입력해주세요')){
        return false
    }
    if(!blankCheck(nickname, '닉네임은 공백일 수 없습니다')){
        return false
    }

    socket.emit("chat", {msg: msg, nickname: nickname})

    //메시지 내용 삭제
    $("#message-input").val('')
}

$(document).ready(() => {
    //초기 닉네임 설정
    $("#name-input").val('익명')
    //소켓서버열기
    var socket = io();

    $("input#message-input").keydown((key) => {
        if(key.keyCode == 13){
            sendChat(socket)
        }
    })

    $("button[id='submit']").click(()=>{
        sendChat(socket)
    })
    socket.on('newchat', (data) =>{
        $('#chat-scrolls').append(`
        <div id="one-chat" style="text-align: left;">
            ${data.nickname}: ${data.msg} 
        </div>
        `)
        
        //스크롤 맨 밑
        scrollBottom()
    })
})