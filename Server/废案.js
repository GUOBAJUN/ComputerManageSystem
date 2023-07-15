    处理磁盘利用率
    var total = 0;
    var total_Used = 0;
    for (let key in body["Disk Usage"]) {
        console.log(total)
        total_Used += Number.parseFloat(body["Disk Usage"][key]["Used"].replace("GB", ""))
        total += Number.parseFloat(body["Disk Usage"][key]["Total"].replace("GB", ""))
    }
    Used_Rate = total_Used / total;
    var Used_Rate = Math.round(parseInt(Used_Rate * 1000)) / 10

    const sio = require("socket.io")(server);

sio.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res, next);
});

sio.on('connection', (socket) => {
    LogMsg("用户 %s 正在连接socket", socket.request.session.username)

    //连接的确认和分配玩家位
    socket.on('ready', (data, callback) => {
        LogMsg(`用户 ${scoket.request.session.user} 连接成功`)
        //记录登录信息
        users.push({
            name: socket.request.session.username,
            socket: socket
        });
    })

    socket.on("trap", function (data) {
        data = JSON.parse(data)
    })

    //连接断开
    socket.on('disconnect', (reason) => {
        LogMsg(`Socket ${socket.id} disconnected with reason ${reason}`)
    });
})