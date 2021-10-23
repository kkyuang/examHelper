var express = require('express')
var app = express()
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
 
app.get('/page', function(req, res) { 
  return res.send('/page');
});
 
app.listen(80, function() {
  console.log('Example app listening on port 80!')
});