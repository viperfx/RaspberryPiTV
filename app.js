
/**
 * Module dependencies.
 */

var express = require('express')
  , app = express()  
  , server = require('http').createServer(app)
  , https = require('https')
  , path = require('path')
  , io = require('socket.io').listen(server)
  , spawn = require('child_process').spawn
  , omx = require('omxcontrol')
  , config = require('config.js');



// all environments
app.set('port', process.env.TEST_PORT || 8080);
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use(omx());

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

//Routes
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/public/index.html');
});

app.get('/remote', function (req, res) {
  res.sendfile(__dirname + '/public/remote.html');
});

app.get('/putio', function (req, res) {
  res.sendfile(__dirname + '/public/putio.html');
});


app.get('/play/:video_id', function (req, res) {

});


//Socket.io Congfig
io.set('log level', 1);

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

var ss;

//Run and pipe shell script output
function run_shell(cmd, args, cb, end) {
    var spawn = require('child_process').spawn,
        child = spawn(cmd, args),
        me = this;
    child.stdout.on('readable', function () { cb(me, child.stdout); });
    child.stdout.on('end', end);
}

//Socket.io Server
io.sockets.on('connection', function (socket) {

 socket.on("screen", function(data){
   socket.type = "screen";
   ss = socket;
   console.log("Screen ready...");
 });
 socket.on("remote", function(data){
   socket.type = "remote";
   console.log("Remote ready...");
 });

 socket.on("controll", function(data){
	console.log(data);
   if(socket.type === "remote"){

     if(data.action === "tap"){
         if(ss != undefined){
            ss.emit("controlling", {action:"enter"});
            }
     }
     else if(data.action === "swipeLeft"){
      if(ss != undefined){
          ss.emit("controlling", {action:"goLeft"});
          }
     }
     else if(data.action === "swipeRight"){
       if(ss != undefined){
           ss.emit("controlling", {action:"goRight"});
           }
     }
   }
 });
socket.on("log", function(data){
    console.log(data);
});
 socket.on("video", function(data){

    if( data.action === "play"){
        console.log(data.video_id);
        var id = data.video_id,
             url = "http://www.youtube.com/watch?v="+id;
        var runShell = new run_shell('youtube-dl',['-gf', '18/22/34/35/37', url],
            function (me, stdout) { 
                //console.log(escape(stdout.read().toString().replace(/[\r\n]/g, "")));
                me.stdout = stdout.read().toString().replace(/[\r\n]/g, "");
                socket.emit("loading",{output: me.stdout});
                omx.start(me.stdout);
            }, 
            function (me) {
                console.log("Finished");
            });
    }
    if( data.action == "stream") {
        var id = data.video_id, 
            url = "https://api.put.io/v2/files/"+id+"/mp4/stream/?oauth_token="+config.PUTIO_KEY;
        var options = {
          host: 'api.put.io',
          port: 443,
          path: '/v2/files/'+id+'/stream?oauth_token='+config.PUTIO_KEY,
          method: 'GET'
        };
        
        var req = https.request(options, function(res) {
          console.log('STATUS: ' + res.statusCode);
          console.log('HEADERS: ' + JSON.stringify(res.headers));
          omx.start(res.headers.location);
        });
        req.end();
        req.on('error', function(e) {
          console.log('problem with request: ' + e.message);
        });
    }

 });
});
